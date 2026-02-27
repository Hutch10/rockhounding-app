/**
 * Rockhound CaptureSessionManager
 *
 * Provides CRUD, lifecycle, event sourcing, offline-first persistence, debounced writes,
 * and integration with Sync Engine, Telemetry, Offline Storage, and Camera→Specimen Pipeline.
 * Includes query utilities, idempotent/conflict-safe operations, and replay-safe event emission.
 */

import { EventEmitter } from 'events';
import {
  CaptureSession,
  CaptureSessionType,
  CaptureSessionState,
  CaptureSyncStatus,
  CaptureMedia,
  CapturePreprocessingStatus,
  CaptureSessionSchema,
  createNewCaptureSession,
  validateCaptureSession,
  isValidCaptureSessionStateTransition,
  addMediaToSession,
  removeMediaFromSession,
} from '@rockhounding/shared/capture-session-schema';
import { z } from 'zod';

// Integration points (assume interfaces exist - using type-only imports)
import type { StorageManager } from '@/lib/storage/manager';

// ===================== TYPES =====================

export interface CaptureSessionManagerConfig {
  storageManager?: any;
  syncEngine?: any;
  telemetry?: any;
  specimenPipeline?: any;
  autoSave?: boolean;
  autoSaveDelay?: number;
  emitEvents?: boolean;
}

export type CaptureSessionChangeEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'stateChanged'
  | 'mediaAdded'
  | 'mediaRemoved'
  | 'classified';

export interface CaptureSessionChangeEvent {
  type: CaptureSessionChangeEventType;
  sessionId: string;
  previousState?: CaptureSession;
  currentState?: CaptureSession;
  timestamp: string;
  source: 'user' | 'sync' | 'system';
}

// ===================== MANAGER =====================

export class CaptureSessionManager extends EventEmitter {
  private sessions: Map<string, CaptureSession> = new Map();
  private userId: string | null = null;
  private config: Required<CaptureSessionManagerConfig>;
  private debouncedSaves: Map<string, NodeJS.Timeout> = new Map();
  private initialized = false;

  constructor(config?: Partial<CaptureSessionManagerConfig>) {
    super();
    this.config = {
      storageManager: config?.storageManager!,
      syncEngine: config?.syncEngine!,
      telemetry: config?.telemetry!,
      specimenPipeline: config?.specimenPipeline!,
      autoSave: config?.autoSave ?? true,
      autoSaveDelay: config?.autoSaveDelay ?? 500,
      emitEvents: config?.emitEvents ?? true,
    };
  }

  async initialize(userId: string) {
    this.userId = userId;
    await this.loadSessionsFromStorage(userId);
    this.initialized = true;
    this.emit('initialized');
  }

  isInitialized() {
    return this.initialized;
  }

  destroy() {
    this.sessions.clear();
    this.debouncedSaves.forEach(timeout => clearTimeout(timeout));
    this.debouncedSaves.clear();
    this.removeAllListeners();
    this.initialized = false;
  }

  // ========== CRUD ========== //

  async createCaptureSession(
    userId: string,
    fieldSessionId: string,
    type: CaptureSessionType,
    location: any,
    device: any,
    opts?: Partial<Pick<CaptureSession, 'isPrivate' | 'isFavorite' | 'notes'>>
  ): Promise<CaptureSession> {
    const session = createNewCaptureSession(userId, fieldSessionId, type, location, device);
    if (opts) {
      Object.assign(session, opts);
    }
    const validation = validateCaptureSession(session);
    if (!validation.valid) throw new Error('Invalid CaptureSession: ' + (validation.errors || []).join(', '));
    this.sessions.set(session.id, session);
    await this.persistSession(session);
    this.queueForSync(session, 'create');
    this.trackTelemetry('created', session);
    this.emitChange('created', session.id, undefined, session, 'user');
    return session;
  }

  async getCaptureSession(sessionId: string): Promise<CaptureSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getCaptureSessions(
    userId: string,
    filter?: Partial<{
      fieldSessionId: string;
      type: CaptureSessionType;
      state: CaptureSessionState;
      dateRange: { from: string; to: string };
      gpsRadius: { latitude: number; longitude: number; radiusMeters: number };
      preprocessing: CapturePreprocessingStatus;
      classified: boolean;
    }>
  ): Promise<CaptureSession[]> {
    let sessions = Array.from(this.sessions.values()).filter(s => s.userId === userId);
    if (filter?.fieldSessionId) sessions = sessions.filter(s => s.fieldSessionId === filter.fieldSessionId);
    if (filter?.type) sessions = sessions.filter(s => s.type === filter.type);
    if (filter?.state) sessions = sessions.filter(s => s.state === filter.state);
    if (filter?.dateRange && filter.dateRange.from && filter.dateRange.to) {
      sessions = sessions.filter(s =>
        s.startedAt >= filter.dateRange!.from && s.startedAt <= filter.dateRange!.to
      );
    }
    if (filter?.gpsRadius) {
      const gpsRadius = filter.gpsRadius;
      if (gpsRadius) {
        sessions = sessions.filter(s => {
          const dx = (s.location.latitude - gpsRadius.latitude) * 111_000;
          const dy = (s.location.longitude - gpsRadius.longitude) * 111_000 * Math.cos(s.location.latitude * Math.PI / 180);
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist <= gpsRadius.radiusMeters;
        });
      }
    }
    if (filter?.preprocessing) {
      sessions = sessions.filter(s => s.media.some(m => m.preprocessing === filter.preprocessing));
    }
    if (filter?.classified !== undefined) {
      sessions = sessions.filter(s => s.media.some(m => Boolean(m.classificationId) === filter.classified));
    }
    return sessions;
  }

  async updateCaptureSession(
    sessionId: string,
    updates: Partial<CaptureSession>
  ): Promise<CaptureSession> {
    const prev = this.sessions.get(sessionId);
    if (!prev) throw new Error('Session not found');
    const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
    const validation = validateCaptureSession(next);
    if (!validation.valid) throw new Error('Invalid update: ' + (validation.errors || []).join(', '));
    if (JSON.stringify(prev) === JSON.stringify(next)) return prev; // Idempotent
    this.sessions.set(sessionId, next);
    await this.persistSession(next);
    this.queueForSync(next, 'update');
    this.trackTelemetry('updated', next, prev);
    this.emitChange('updated', sessionId, prev, next, 'user');
    return next;
  }

  async deleteCaptureSession(sessionId: string): Promise<void> {
    const prev = this.sessions.get(sessionId);
    if (!prev) return; // Idempotent
    this.sessions.delete(sessionId);
    await this.removeSessionFromStorage(sessionId);
    this.queueForSync(prev, 'delete');
    this.trackTelemetry('deleted', prev);
    this.emitChange('deleted', sessionId, prev, undefined, 'user');
  }

  // ========== MEDIA ========== //

  async addMedia(
    sessionId: string,
    media: CaptureMedia
  ): Promise<CaptureSession> {
    const prev = this.sessions.get(sessionId);
    if (!prev) throw new Error('Session not found');
    if (prev.media.some(m => m.id === media.id)) return prev; // Idempotent
    const next = addMediaToSession(prev, media);
    this.sessions.set(sessionId, next);
    await this.persistSession(next);
    this.queueForSync(next, 'update');
    this.trackTelemetry('mediaAdded', next, prev);
    this.emitChange('mediaAdded', sessionId, prev, next, 'user');
    return next;
  }

  async removeMedia(
    sessionId: string,
    mediaId: string
  ): Promise<CaptureSession> {
    const prev = this.sessions.get(sessionId);
    if (!prev) throw new Error('Session not found');
    if (!prev.media.some(m => m.id === mediaId)) return prev; // Idempotent
    const next = removeMediaFromSession(prev, mediaId);
    this.sessions.set(sessionId, next);
    await this.persistSession(next);
    this.queueForSync(next, 'update');
    this.trackTelemetry('mediaRemoved', next, prev);
    this.emitChange('mediaRemoved', sessionId, prev, next, 'user');
    return next;
  }

  // ========== LIFECYCLE ========== //

  async transitionSessionState(
    sessionId: string,
    newState: CaptureSessionState
  ): Promise<CaptureSession> {
    const prev = this.sessions.get(sessionId);
    if (!prev) throw new Error('Session not found');
    if (!isValidCaptureSessionStateTransition(prev.state, newState)) {
      throw new Error(`Invalid state transition: ${prev.state} → ${newState}`);
    }
    if (prev.state === newState) return prev; // Idempotent
    const next = { ...prev, state: newState, updatedAt: new Date().toISOString() };
    this.sessions.set(sessionId, next);
    await this.persistSession(next);
    this.queueForSync(next, 'update');
    this.trackTelemetry('stateChanged', next, prev);
    this.emitChange('stateChanged', sessionId, prev, next, 'user');
    return next;
  }

  // ========== CLASSIFICATION PIPELINE ========== //

  async runClassificationPipeline(sessionId: string): Promise<CaptureSession> {
    const prev = this.sessions.get(sessionId);
    if (!prev) throw new Error('Session not found');
    if (!this.config.specimenPipeline) throw new Error('Specimen pipeline not configured');
    // Run pipeline (async, may update media/classificationId)
    const result = await this.config.specimenPipeline.classifySession(prev);
    const next = { ...prev, ...result, updatedAt: new Date().toISOString() };
    this.sessions.set(sessionId, next);
    await this.persistSession(next);
    this.queueForSync(next, 'update');
    this.trackTelemetry('classified', next, prev);
    this.emitChange('classified', sessionId, prev, next, 'system');
    return next;
  }

  // ========== PERSISTENCE ========== //

  private async persistSession(session: CaptureSession) {
    if (!this.config.storageManager) return;
    if (!this.config.autoSave) return;
    // Debounced write
    if (this.debouncedSaves.has(session.id)) {
      clearTimeout(this.debouncedSaves.get(session.id)!);
    }
    this.debouncedSaves.set(
      session.id,
      setTimeout(async () => {
        try {
          await this.config.storageManager.set(`capture_session:${session.id}`, session, {
            priority: 8,
            syncStatus: session.syncStatus,
            userId: session.userId,
            entityType: 'capture_session',
          });
        } catch (e) {
          // Log but do not throw
          console.error('[persistSession] Failed:', e);
        }
        this.debouncedSaves.delete(session.id);
      }, this.config.autoSaveDelay)
    );
  }

  private async removeSessionFromStorage(sessionId: string) {
    if (!this.config.storageManager) return;
    try {
      await this.config.storageManager.delete(`capture_session:${sessionId}`);
    } catch (e) {
      console.error('[removeSessionFromStorage] Failed:', e);
    }
  }

  private async loadSessionsFromStorage(userId: string) {
    if (!this.config.storageManager) return;
    try {
      const keys = await this.config.storageManager.keys();
      const sessionKeys = keys.filter(k => k.startsWith('capture_session:'));
      for (const key of sessionKeys) {
        const session = await this.config.storageManager.get(key);
        if (session && session.userId === userId) {
          const validation = validateCaptureSession(session);
          if (validation.valid) {
            this.sessions.set(session.id, session);
          }
        }
      }
    } catch (e) {
      console.error('[loadSessionsFromStorage] Failed:', e);
    }
  }

  // ========== SYNC ========== //

  private queueForSync(session: CaptureSession, operation: 'create' | 'update' | 'delete') {
    if (!this.config.syncEngine) return;
    this.config.syncEngine.enqueue({
      entityType: 'capture_session',
      entityId: session.id,
      operation,
      data: session,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== TELEMETRY ========== //

  private trackTelemetry(
    type: CaptureSessionChangeEventType,
    session: CaptureSession,
    prev?: CaptureSession
  ) {
    if (!this.config.telemetry) return;
    try {
      switch (type) {
        case 'created':
          this.config.telemetry.track('capture_session_created', {
            sessionId: session.id,
            userId: session.userId,
            type: session.type,
            mediaCount: session.mediaCount,
            startedAt: session.startedAt,
          });
          break;
        case 'updated':
          this.config.telemetry.track('capture_session_updated', {
            sessionId: session.id,
            userId: session.userId,
            changes: Object.keys(session).filter(k => (prev && session[k as keyof CaptureSession] !== prev[k as keyof CaptureSession])),
            updatedAt: session.updatedAt,
          });
          break;
        case 'deleted':
          this.config.telemetry.track('capture_session_deleted', {
            sessionId: session.id,
            userId: session.userId,
          });
          break;
        case 'mediaAdded':
          this.config.telemetry.track('capture_session_media_added', {
            sessionId: session.id,
            userId: session.userId,
            mediaCount: session.mediaCount,
          });
          break;
        case 'mediaRemoved':
          this.config.telemetry.track('capture_session_media_removed', {
            sessionId: session.id,
            userId: session.userId,
            mediaCount: session.mediaCount,
          });
          break;
        case 'stateChanged':
          this.config.telemetry.track('capture_session_state_changed', {
            sessionId: session.id,
            userId: session.userId,
            from: prev?.state,
            to: session.state,
            updatedAt: session.updatedAt,
          });
          break;
        case 'classified':
          this.config.telemetry.track('capture_session_classified', {
            sessionId: session.id,
            userId: session.userId,
            classifiedMedia: session.media.filter(m => m.classificationId).length,
            pipelineRunId: session.classificationPipelineRunId,
          });
          break;
      }
    } catch (e) {
      console.error('[trackTelemetry] Failed:', e);
    }
  }

  // ========== EVENT SOURCING ========== //

  private emitChange(
    type: CaptureSessionChangeEventType,
    sessionId: string,
    previousState: CaptureSession | undefined,
    currentState: CaptureSession | undefined,
    source: 'user' | 'sync' | 'system'
  ) {
    if (!this.config.emitEvents) return;
    // Replay-safe: only emit if state actually changed
    if (JSON.stringify(previousState) === JSON.stringify(currentState)) return;
    const event: CaptureSessionChangeEvent = {
      type,
      sessionId,
      previousState,
      currentState,
      timestamp: new Date().toISOString(),
      source,
    };
    this.emit(type, event);
  }
}

// ========== SINGLETON ========== //

let _instance: CaptureSessionManager | null = null;

export async function initCaptureSessionManager(
  userId: string,
  config?: Partial<CaptureSessionManagerConfig>
): Promise<CaptureSessionManager> {
  if (_instance) return _instance;
  _instance = new CaptureSessionManager(config);
  await _instance.initialize(userId);
  return _instance;
}

export function getCaptureSessionManager(): CaptureSessionManager {
  if (!_instance) throw new Error('CaptureSessionManager not initialized');
  return _instance;
}

export function destroyCaptureSessionManager() {
  if (_instance) _instance.destroy();
  _instance = null;
}

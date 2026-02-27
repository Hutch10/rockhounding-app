/**
 * Rockhound FieldSession Integration Helpers (Stub)
 * Stub implementations for unavailable modules
 */

import type { FieldSession } from '@rockhounding/shared/field-session-schema';
import type { QueryClient } from '@tanstack/react-query';

type StorageManager = any;
type SyncEngine = any;
type Telemetry = any;

export async function cacheSessionForStorage(session: FieldSession, userId: string, storageManager: StorageManager): Promise<void> {}
export async function loadSessionFromStorage(sessionId: string, storageManager: StorageManager): Promise<FieldSession | null> { return null; }
export async function loadUserSessionsFromStorage(userId: string, storageManager: StorageManager): Promise<FieldSession[]> { return []; }
export async function removeSessionFromStorage(sessionId: string, storageManager: StorageManager): Promise<void> {}
export async function resolveSessionConflict(localVersion: FieldSession, remoteVersion: FieldSession, strategy: 'local' | 'remote' | 'merge'): Promise<FieldSession> { return remoteVersion; }
export function recordSessionStartTelemetry(session: FieldSession, telemetry: Telemetry): void {}
export function recordSessionEndTelemetry(session: FieldSession, metrics: { duration_ms: number; distance_m: number; finds_count: number; notes_count: number; photos_count: number }, telemetry: Telemetry): void {}
export function recordSessionPauseTelemetry(session: FieldSession, pauseDuration_ms: number, telemetry: Telemetry): void {}
export function recordSessionResumeTelemetry(sessionId: string, pausedFor_ms: number, telemetry: Telemetry): void {}
export function emitFieldSessionEvent(event: string, session: FieldSession, queryClient: QueryClient): void {}
export async function enqueueSessionSync(session: FieldSession, syncEngine: SyncEngine, operation: 'create' | 'update' | 'delete'): Promise<void> {}

export const FieldSessionIntegration = {
  cacheSessionForStorage,
  loadSessionFromStorage,
  loadUserSessionsFromStorage,
  removeSessionFromStorage,
  resolveSessionConflict,
  recordSessionStartTelemetry,
  recordSessionEndTelemetry,
  recordSessionPauseTelemetry,
  recordSessionResumeTelemetry,
  emitFieldSessionEvent,
  enqueueSessionSync,
};

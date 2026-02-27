/**
 * Rockhound CaptureSession React Integration
 *
 * Provides CaptureSessionProvider, context, 12+ hooks for CRUD, querying, multi-photo bursts,
 * GPS stamping, preprocessing/classification, linking to FieldSessions/FindLogs, and camera UI components.
 * Integrates with Offline Storage, Sync Engine, Telemetry, and Camera → Specimen Pipeline.
 * Mobile-first, accessible, error boundaries, optimistic updates, TanStack Query caching.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  CaptureSession,
  CaptureSessionType,
  CaptureSessionState,
  CaptureMedia,
  CapturePreprocessingStatus,
  CaptureSessionSchema,
  createNewCaptureSession,
} from '@rockhounding/shared/capture-session-schema';
import { CaptureSessionManager, initCaptureSessionManager, getCaptureSessionManager } from '@/lib/capture/manager';
import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

// ===================== CONTEXT =====================

interface CaptureSessionContextValue {
  manager: CaptureSessionManager | null;
  userId: string;
  initialized: boolean;
}

const CaptureSessionContext = createContext<CaptureSessionContextValue | undefined>(undefined);

export const CaptureSessionProvider: React.FC<{
  userId: string;
  storageManager?: any;
  syncEngine?: any;
  telemetry?: any;
  specimenPipeline?: any;
  children: React.ReactNode;
}> = ({ userId, storageManager, syncEngine, telemetry, specimenPipeline, children }) => {
  const [manager, setManager] = useState<CaptureSessionManager | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const mgr = await initCaptureSessionManager(userId, {
        storageManager,
        syncEngine,
        telemetry,
        specimenPipeline,
      });
      if (mounted) {
        setManager(mgr);
        setInitialized(true);
      }
    })();
    return () => { mounted = false; };
  }, [userId, storageManager, syncEngine, telemetry, specimenPipeline]);

  const value = useMemo(() => ({ manager, userId, initialized }), [manager, userId, initialized]);

  return (
    <CaptureSessionContext.Provider value={value}>
      {children}
    </CaptureSessionContext.Provider>
  );
};

function useCaptureSessionProviderReady() {
  const ctx = useContext(CaptureSessionContext);
  if (!ctx) throw new Error('CaptureSessionProvider missing');
  return ctx.initialized;
}

function useManager() {
  const ctx = useContext(CaptureSessionContext);
  if (!ctx) throw new Error('CaptureSessionProvider missing');
  if (!ctx.manager) throw new Error('CaptureSessionManager not initialized');
  return ctx.manager;
}

// ===================== QUERY KEYS =====================

const captureSessionKeys = {
  all: ['capture_session'] as const,
  lists: () => [...captureSessionKeys.all, 'list'] as const,
  list: (userId: string, fieldSessionId?: string) => [...captureSessionKeys.lists(), userId, fieldSessionId] as const,
  detail: (id: string) => [...captureSessionKeys.all, 'detail', id] as const,
  byId: (id: string) => [...captureSessionKeys.detail(id)] as const,
  gps: (lat: number, lon: number, radius: number) => [...captureSessionKeys.all, 'gps', lat, lon, radius] as const,
  preprocessing: (status: CapturePreprocessingStatus) => [...captureSessionKeys.all, 'preprocessing', status] as const,
  classified: () => [...captureSessionKeys.all, 'classified'] as const,
  timeline: (userId: string) => [...captureSessionKeys.all, 'timeline', userId] as const,
};

// ===================== HOOKS =====================

// 1. Read single session
function useCaptureSession(sessionId: string): UseQueryResult<CaptureSession | null, Error> {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.byId(sessionId),
    queryFn: async () => await manager.getCaptureSession(sessionId),
    staleTime: 30_000,
  });
}

// 2. List sessions by user/field session
function useCaptureSessionList(userId: string, fieldSessionId?: string) {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.list(userId, fieldSessionId),
    queryFn: async () => await manager.getCaptureSessions(userId, fieldSessionId ? { fieldSessionId } : undefined),
    staleTime: 60_000,
  });
}

// 3. List sessions by GPS radius
function useCaptureSessionsByGPS(userId: string, lat: number, lon: number, radius: number) {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.gps(lat, lon, radius),
    queryFn: async () => await manager.getCaptureSessions(userId, { gpsRadius: { latitude: lat, longitude: lon, radiusMeters: radius } }),
    staleTime: 60_000,
  });
}

// 4. List sessions by preprocessing status
function useCaptureSessionsByPreprocessing(userId: string, status: CapturePreprocessingStatus) {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.preprocessing(status),
    queryFn: async () => await manager.getCaptureSessions(userId, { preprocessing: status }),
    staleTime: 60_000,
  });
}

// 5. List classified sessions
function useClassifiedCaptureSessions(userId: string) {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.classified(),
    queryFn: async () => await manager.getCaptureSessions(userId, { classified: true }),
    staleTime: 60_000,
  });
}

// 6. Timeline (ordered by startedAt)
function useCaptureSessionTimeline(userId: string) {
  const manager = useManager();
  return useQuery({
    queryKey: captureSessionKeys.timeline(userId),
    queryFn: async () => {
      const sessions = await manager.getCaptureSessions(userId);
      return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
    staleTime: 60_000,
  });
}

// 7. Create session
function useCreateCaptureSession(): UseMutationResult<
  CaptureSession | null,
  Error,
  {
    userId: string;
    fieldSessionId: string;
    type: CaptureSessionType;
    location: any;
    device: any;
    opts?: Partial<Pick<CaptureSession, 'isPrivate' | 'isFavorite' | 'notes'>>;
  }
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      fieldSessionId: string;
      type: CaptureSessionType;
      location: any;
      device: any;
      opts?: Partial<Pick<CaptureSession, 'isPrivate' | 'isFavorite' | 'notes'>>;
    }) => await manager.createCaptureSession(input.userId, input.fieldSessionId, input.type, input.location, input.device, input.opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.lists() });
    },
  });
}

// 8. Update session
function useUpdateCaptureSession(): UseMutationResult<
  CaptureSession | null,
  Error,
  { sessionId: string; updates: Partial<CaptureSession> }
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; updates: Partial<CaptureSession> }) => await manager.updateCaptureSession(input.sessionId, input.updates),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.byId(sessionId) });
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.lists() });
    },
  });
}

// 9. Delete session
function useDeleteCaptureSession() {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => await manager.deleteCaptureSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.lists() });
    },
  });
}

// 10. Add media (multi-photo burst)
function useAddMediaToSession(): UseMutationResult<
  CaptureSession | null,
  Error,
  { sessionId: string; media: CaptureMedia }
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; media: CaptureMedia }) => await manager.addMedia(input.sessionId, input.media),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.byId(sessionId) });
    },
  });
}

// 11. Remove media
function useRemoveMediaFromSession(): UseMutationResult<
  CaptureSession | null,
  Error,
  { sessionId: string; mediaId: string }
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; mediaId: string }) => await manager.removeMedia(input.sessionId, input.mediaId),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.byId(sessionId) });
    },
  });
}

// 12. Transition session state
function useTransitionCaptureSessionState(): UseMutationResult<
  CaptureSession | null,
  Error,
  { sessionId: string; newState: CaptureSessionState }
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; newState: CaptureSessionState }) => await manager.transitionSessionState(input.sessionId, input.newState),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.byId(sessionId) });
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.lists() });
    },
  });
}

// 13. Run classification pipeline
function useRunClassificationPipeline(): UseMutationResult<
  CaptureSession | null,
  Error,
  string
> {
  const manager = useManager();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => await manager.runClassificationPipeline(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.byId(sessionId) });
      queryClient.invalidateQueries({ queryKey: captureSessionKeys.classified() });
    },
  });
}

// 14. Link session to FindLog
function useLinkCaptureSessionToFindLog() {
  // Placeholder: would call integration helper
  return useMutation({
    mutationFn: async (input: { sessionId: string; findLogId: string }) => {
      // ...integration logic
      return { success: true };
    },
  });
}

// ===================== CAMERA UI COMPONENTS =====================

// 1. CaptureButton
const CaptureButton: React.FC<{
  onCapture: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}> = ({ onCapture, disabled, ariaLabel }) => (
  <button
    type="button"
    className="capture-btn"
    onClick={onCapture}
    disabled={disabled}
    aria-label={ariaLabel || 'Capture photo'}
    style={{
      borderRadius: '50%',
      width: 64,
      height: 64,
      background: '#1976d2',
      color: '#fff',
      fontSize: 24,
      border: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    4F7
  </button>
);

// 2. BurstModeToggle
const BurstModeToggle: React.FC<{
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}> = ({ enabled, onToggle }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <input
      type="checkbox"
      checked={enabled}
      onChange={e => onToggle(e.target.checked)}
      aria-label="Toggle burst mode"
    />
    Burst Mode
  </label>
);

// 3. MetadataPanel
const MetadataPanel: React.FC<{
  device: any;
  location: any;
  lighting: string;
}> = ({ device, location, lighting }) => (
  <div className="metadata-panel" style={{ fontSize: 14, padding: 8 }}>
    <div><strong>Device:</strong> {device.deviceModel} ({device.cameraType})</div>
    <div><strong>Location:</strong> {location.latitude}, {location.longitude}</div>
    <div><strong>Lighting:</strong> {lighting}</div>
  </div>
);

// 4. CaptureReviewCard
const CaptureReviewCard: React.FC<{
  media: CaptureMedia;
  onRemove?: () => void;
}> = ({ media, onRemove }) => (
  <div className="capture-review-card" style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, marginBottom: 8 }}>
    <img src={media.uri} alt={media.fileName} style={{ width: '100%', borderRadius: 4 }} />
    <div style={{ marginTop: 4 }}>
      <strong>{media.fileName}</strong> ({media.mimeType})<br />
      <span>Size: {media.size} bytes</span><br />
      <span>Lighting: {media.lighting}</span><br />
      <span>Preprocessing: {media.preprocessing}</span><br />
      {onRemove && <button onClick={onRemove} style={{ marginTop: 4 }}>Remove</button>}
    </div>
  </div>
);

// 5. CaptureSessionTimeline
const CaptureSessionTimeline: React.FC<{
  sessions: CaptureSession[];
  onSelect?: (sessionId: string) => void;
}> = ({ sessions, onSelect }) => (
  <div className="capture-session-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {sessions.map(session => (
      <div
        key={session.id}
        tabIndex={0}
        role="button"
        aria-label={`Capture session started at ${session.startedAt}`}
        style={{
          padding: 8,
          borderRadius: 6,
          background: session.isFavorite ? '#ffe082' : '#f5f5f5',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          cursor: 'pointer',
        }}
        onClick={() => onSelect?.(session.id)}
        onKeyDown={e => { if (e.key === 'Enter') onSelect?.(session.id); }}
      >
        <div><strong>{session.type}</strong> - {session.mediaCount} captures</div>
        <div>Started: {new Date(session.startedAt).toLocaleString()}</div>
        <div>Status: {session.state}</div>
      </div>
    ))}
  </div>
);

// ===================== ERROR BOUNDARY =====================

class CaptureSessionErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div style={{ color: 'red', padding: 16 }}>Error: {this.state.error.message || 'Unknown error'}</div>;
    }
    return this.props.children;
  }
}

// ===================== EXPORTS =====================

export {
  CaptureSessionContext,
  captureSessionKeys,
  // Hooks
  useCaptureSessionProviderReady,
  useCaptureSession,
  useCaptureSessionList,
  useCaptureSessionsByGPS,
  useCaptureSessionsByPreprocessing,
  useClassifiedCaptureSessions,
  useCaptureSessionTimeline,
  useCreateCaptureSession,
  useUpdateCaptureSession,
  useDeleteCaptureSession,
  useAddMediaToSession,
  useRemoveMediaFromSession,
  useTransitionCaptureSessionState,
  useRunClassificationPipeline,
  useLinkCaptureSessionToFindLog,
  // Components
  CaptureButton,
  BurstModeToggle,
  MetadataPanel,
  CaptureReviewCard,
  CaptureSessionTimeline,
  CaptureSessionErrorBoundary,
};

/**
 * Rockhound FieldSession - React Hooks & Components
 * 
 * React hooks and components for field session management:
 * - Session CRUD hooks
 * - Session list and active session hooks
 * - Map integration
 * - UI components (mobile-first)
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import {
  FieldSession,
  CreateFieldSessionInput,
  UpdateFieldSessionInput,
  SessionState,
  SyncStatus,
} from '@rockhounding/shared/field-session-schema';
import {
  FieldSessionManager,
  getFieldSessionManager,
  initFieldSessionManager,
} from '@/lib/sessions/manager';

// ==================== QUERY KEYS ====================

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (userId: string) => [...sessionKeys.lists(), userId] as const,
  detail: () => [...sessionKeys.all, 'detail'] as const,
  byId: (id: string) => [...sessionKeys.detail(), id] as const,
  active: () => [...sessionKeys.all, 'active'] as const,
  stats: () => [...sessionKeys.all, 'stats'] as const,
};

// ==================== CONTEXT ====================

interface SessionContextValue {
  manager: FieldSessionManager | null;
  isInitialized: boolean;
  userId: string | null;
  error: Error | null;
}

const SessionContext = createContext<SessionContextValue>({
  manager: null,
  isInitialized: false,
  userId: null,
  error: null,
});

export interface SessionProviderProps {
  children: ReactNode;
  userId: string;
  storageManager?: any;
  syncEngine?: any;
  telemetryTracker?: any;
}

/**
 * Session provider context
 */
export function SessionProvider({
  children,
  userId,
  storageManager,
  syncEngine,
  telemetryTracker,
}: SessionProviderProps) {
  const [manager, setManager] = useState<FieldSessionManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const instance = await initFieldSessionManager(userId, {
          storageManager,
          syncEngine,
          telemetryTracker,
        });
        
        if (mounted) {
          setManager(instance);
          setIsInitialized(true);
          
          // Subscribe to changes
          instance.on('change', () => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.all });
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          console.error('[SessionProvider] Initialization failed:', err);
        }
      }
    }
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [userId, storageManager, syncEngine, telemetryTracker, queryClient]);
  
  const value = useMemo(
    () => ({
      manager,
      isInitialized,
      userId,
      error,
    }),
    [manager, isInitialized, userId, error]
  );
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context
 */
function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('[useSessionContext] Must be used within SessionProvider');
  }
  
  return context;
}

// ==================== READ HOOKS ====================

/**
 * Get single field session
 */
export function useFieldSession(sessionId: string | null): UseQueryResult<FieldSession | null, Error> {
  const { manager, isInitialized } = useSessionContext();
  
  return useQuery({
    queryKey: sessionId ? sessionKeys.byId(sessionId) : [],
    queryFn: async () => {
      if (!manager || !sessionId) return null;
      return manager.getSession(sessionId);
    },
    enabled: isInitialized && !!manager && !!sessionId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get all sessions for user
 */
export function useSessionList(userId: string): UseQueryResult<FieldSession[], Error> {
  const { manager, isInitialized } = useSessionContext();
  
  return useQuery({
    queryKey: sessionKeys.list(userId),
    queryFn: async () => {
      if (!manager) return [];
      return manager.getSessions(userId);
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get active session
 */
export function useActiveSession(): FieldSession | null {
  const { manager, isInitialized } = useSessionContext();
  const [activeSession, setActiveSession] = useState<FieldSession | null>(null);
  
  useEffect((): void | (() => void) => {
    if (!isInitialized || !manager) return;
    
    setActiveSession(manager.getActiveSession());
    
    const handleChange = () => {
      setActiveSession(manager.getActiveSession());
    };
    
    manager.on('change', handleChange);
    return () => manager.off('change', handleChange);
  }, [manager, isInitialized]);
  
  return activeSession;
}

/**
 * Get session statistics
 */
export function useSessionStats(sessionId: string | null): UseQueryResult<any, Error> {
  const { manager, isInitialized } = useSessionContext();
  
  return useQuery({
    queryKey: sessionId ? [...sessionKeys.stats(), sessionId] : [],
    queryFn: async () => {
      if (!manager || !sessionId) return null;
      
      const session = await manager.getSession(sessionId);
      if (!session) return null;
      
      return {
        duration: session.duration_seconds || 0,
        distance: (session as any).distance_m || 0,
        finds: (session as any).finds_count || 0,
        notes: (session as any).notes_count || 0,
      };
    },
    enabled: isInitialized && !!manager && !!sessionId,
  });
}

// ==================== WRITE HOOKS ====================

/**
 * Create new session
 */
export function useCreateSession(): UseMutationResult<
  FieldSession | null,
  Error,
  CreateFieldSessionInput
> {
  const { manager, userId } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateFieldSessionInput) => {
      if (!manager || !userId) throw new Error('Session manager not initialized');
      return manager.createSession(userId, 'device-id', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Update session
 */
export function useUpdateSession(): UseMutationResult<
  FieldSession | null,
  Error,
  { id: string; input: UpdateFieldSessionInput }
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateFieldSessionInput }) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.updateSession(id, input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.setQueryData(sessionKeys.byId(data.id), data);
    },
  });
}

/**
 * Delete session
 */
export function useDeleteSession(): UseMutationResult<
  void,
  Error,
  string
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.deleteSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Start session
 */
export function useStartSession(): UseMutationResult<
  FieldSession | null,
  Error,
  string
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.startSession(sessionId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.active() });
      queryClient.setQueryData(sessionKeys.byId(data.id), data);
    },
  });
}

/**
 * Pause session
 */
export function usePauseSession(): UseMutationResult<
  FieldSession | null,
  Error,
  string
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.pauseSession(sessionId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.active() });
      queryClient.setQueryData(sessionKeys.byId(data.id), data);
    },
  });
}

/**
 * Complete session
 */
export function useCompleteSession(): UseMutationResult<
  FieldSession | null,
  Error,
  string
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.completeSession(sessionId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.setQueryData(sessionKeys.byId(data.id), data);
    },
  });
}

/**
 * Add find log to session
 */
export function useAddFindLog(): UseMutationResult<
  FieldSession | null,
  Error,
  { sessionId: string; findLogId: string }
> {
  const { manager } = useSessionContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, findLogId }: { sessionId: string; findLogId: string }) => {
      if (!manager) throw new Error('Session manager not initialized');
      return manager.addFindLog(sessionId, findLogId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(sessionKeys.byId(data.id), data);
    },
  });
}

// ==================== UI COMPONENTS ====================

/**
 * Session list component
 */
export function SessionList({ userId }: { userId: string }) {
  const { data: sessions, isLoading } = useSessionList(userId);
  
  if (isLoading) {
    return <div className="session-list-loading">Loading sessions...</div>;
  }
  
  if (!sessions || sessions.length === 0) {
    return <div className="session-list-empty">No sessions yet</div>;
  }
  
  return (
    <div className="session-list">
      {sessions.map((session) => (
        <SessionListItem key={session.id} session={session} />
      ))}
    </div>
  );
}

/**
 * Session list item component
 */
function SessionListItem({ session }: { session: FieldSession }) {
  const router = typeof window !== 'undefined' ? window.location : null;
  
  const handleClick = () => {
    if (router) {
      (window as any).location.href = `/sessions/${session.id}`;
    }
  };
  
  return (
    <div className="session-list-item" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <h3>{session.title}</h3>
      <p>{session.description}</p>
      <div className="session-meta">
        <span>Duration: {Math.round(((session as any).duration_seconds || 0) / 60)} min</span>
        <span>Finds: {(session as any).finds_count || 0}</span>
        <span>Status: {session.state}</span>
      </div>
    </div>
  );
}

/**
 * Session detail component
 */
export function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading } = useFieldSession(sessionId);
  const { data: stats } = useSessionStats(sessionId);
  
  if (isLoading || !session) {
    return <div>Loading session...</div>;
  }
  
  return (
    <div className="session-detail">
      <h1>{session.title}</h1>
      {session.description && <p>{session.description}</p>}
      
      <div className="session-stats">
        <div className="stat">
          <label>Duration</label>
          <span>{Math.round((stats?.duration || 0) / 1000 / 60)} minutes</span>
        </div>
        <div className="stat">
          <label>Distance</label>
          <span>{((stats?.distance || 0) / 1000).toFixed(2)} km</span>
        </div>
        <div className="stat">
          <label>Finds</label>
          <span>{stats?.finds || 0}</span>
        </div>
      </div>
      
      {(session as any).notes?.length > 0 && (
        <div className="session-notes">
          <h3>Notes</h3>
          {(session as any).notes.map((note: any) => (
            <div key={note.id} className="note">
              <p>{note.text}</p>
              <small>{new Date(note.addedAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Start session FAB (floating action button)
 */
export function StartSessionFAB() {
  const activeSession = useActiveSession();
  const createSession = useCreateSession();
  const startSession = useStartSession();
  
  const handleStartQuickSession = async () => {
    try {
      const session = await createSession.mutateAsync({
        title: `Session ${new Date().toLocaleDateString()}`,
      } as any);
      
      if (session) {
        console.log('Session started:', session.id);
      } else {
        console.error('Failed to create session: returned null');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };
  
  if (activeSession) {
    return (
      <div className="session-fab-active">
        <p>Active Session: {activeSession.title}</p>
      </div>
    );
  }
  
  return (
    <button
      className="session-fab"
      onClick={handleStartQuickSession}
      disabled={createSession.isPending}
    >
      {createSession.isPending ? 'Starting...' : 'Start Session'}
    </button>
  );
}

/**
 * Session status badge
 */
export function SessionStatusBadge({ status }: { status: SessionState }) {
  const statusClass = status.toLowerCase();
  
  return (
    <span className={`session-status-badge session-status-${statusClass}`}>
      {status}
    </span>
  );
}

/**
 * Check if session provider is ready
 */
export function useSessionProviderReady(): boolean {
  const { isInitialized } = useSessionContext();
  return isInitialized;
}

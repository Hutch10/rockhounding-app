/**
 * Rockhound FindLog React Hooks & Components
 * 
 * React integration for find log management with hooks and mobile-first components
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
  FindLog,
  CreateFindLogInput,
  UpdateFindLogInput,
  FindLogState,
  FindLogSyncStatus,
  MaterialType,
  QualityRating,
  IdentificationConfidence,
  PhotoMetadata,
  MaterialIdentification,
  QualityAssessment,
  GeoPoint,
  getQualityDisplay,
  getConfidenceDisplay,
  getMaterialTypeDisplay,
  calculateFindScore,
} from '@rockhounding/shared/find-log-schema';
import {
  FindLogManager,
  getFindLogManager,
  initFindLogManager,
} from '@/lib/finds/manager';

// ==================== QUERY KEYS ====================

export const findLogKeys = {
  all: ['findLogs'] as const,
  lists: () => [...findLogKeys.all, 'list'] as const,
  list: (userId: string, sessionId?: string) => [...findLogKeys.lists(), userId, sessionId] as const,
  detail: () => [...findLogKeys.all, 'detail'] as const,
  byId: (id: string) => [...findLogKeys.detail(), id] as const,
  nearby: () => [...findLogKeys.all, 'nearby'] as const,
  stats: () => [...findLogKeys.all, 'stats'] as const,
};

// ==================== CONTEXT ====================

interface FindLogContextValue {
  manager: FindLogManager | null;
  isInitialized: boolean;
  userId: string | null;
  error: Error | null;
}

const FindLogContext = createContext<FindLogContextValue>({
  manager: null,
  isInitialized: false,
  userId: null,
  error: null,
});

export interface FindLogProviderProps {
  children: ReactNode;
  userId: string;
  storageManager?: any;
  syncEngine?: any;
  telemetryTracker?: any;
}

/**
 * FindLog provider context
 */
export function FindLogProvider({
  children,
  userId,
  storageManager,
  syncEngine,
  telemetryTracker,
}: FindLogProviderProps) {
  const [manager, setManager] = useState<FindLogManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const instance = await initFindLogManager(userId, {
          storageManager,
          syncEngine,
          telemetryTracker,
        });

        if (mounted) {
          setManager(instance);
          setIsInitialized(true);

          // Subscribe to changes
          instance.on('change', () => {
            queryClient.invalidateQueries({ queryKey: findLogKeys.all });
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          console.error('[FindLogProvider] Initialization failed:', err);
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
    <FindLogContext.Provider value={value}>
      {children}
    </FindLogContext.Provider>
  );
}

/**
 * Hook to access find log context
 */
function useFindLogContext(): FindLogContextValue {
  const context = useContext(FindLogContext);

  if (!context) {
    throw new Error('[useFindLogContext] Must be used within FindLogProvider');
  }

  return context;
}

// ==================== READ HOOKS ====================

/**
 * Get single find log
 */
export function useFindLog(findLogId: string | null): UseQueryResult<FindLog | null, Error> {
  const { manager, isInitialized } = useFindLogContext();

  return useQuery({
    queryKey: findLogId ? findLogKeys.byId(findLogId) : [],
    queryFn: async () => {
      if (!manager || !findLogId) return null;
      return manager.getFindLog(findLogId);
    },
    enabled: isInitialized && !!manager && !!findLogId,
    staleTime: 30000,
  });
}

/**
 * Get all find logs for session
 */
export function useFindLogList(userId: string, sessionId?: string): UseQueryResult<FindLog[], Error> {
  const { manager, isInitialized } = useFindLogContext();

  return useQuery({
    queryKey: findLogKeys.list(userId, sessionId),
    queryFn: async () => {
      if (!manager) return [];
      return manager.getFindLogs(userId, { fieldSessionId: sessionId });
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get find log statistics
 */
export function useFindLogStats(userId: string, sessionId?: string): UseQueryResult<any, Error> {
  const { manager, isInitialized } = useFindLogContext();

  return useQuery({
    queryKey: [...findLogKeys.stats(), userId, sessionId],
    queryFn: async () => {
      if (!manager) return null;

      const finds = await manager.getFindLogs(userId, { fieldSessionId: sessionId });
      if (finds.length === 0) return null;

      return {
        totalFinds: finds.length,
        totalSpecimens: finds.reduce((sum, f) => sum + f.specimen_ids.length, 0),
        averageQuality: finds.reduce((sum, f) => sum + (Object.values(QualityRating).indexOf(f.quality.rating) || 0), 0) / finds.length,
        averageConfidence: finds.reduce((sum, f) => sum + (Object.values(IdentificationConfidence).indexOf(f.identification.confidence) || 0), 0) / finds.length,
        withPhotos: finds.filter(f => f.photo_ids.length > 0).length,
      };
    },
    enabled: isInitialized && !!manager,
  });
}

/**
 * Get nearby find logs
 */
export function useNearbyFindLogs(
  userId: string,
  location: GeoPoint | null,
  radiusKm: number = 5
): UseQueryResult<FindLog[], Error> {
  const { manager, isInitialized } = useFindLogContext();

  return useQuery({
    queryKey: [...findLogKeys.nearby(), userId, location?.latitude, location?.longitude, radiusKm],
    queryFn: async () => {
      if (!manager || !location) return [];

      // Get all finds for user
      const finds = await manager.getFindLogs(userId);

      // Filter by distance (would use PostGIS in production)
      return finds; // Placeholder - actual implementation would calculate distance
    },
    enabled: isInitialized && !!manager && !!location,
  });
}

// ==================== WRITE HOOKS ====================

/**
 * Create new find log
 */
export function useCreateFindLog(): UseMutationResult<
  FindLog,
  Error,
  { fieldSessionId: string; input: Omit<CreateFindLogInput, 'field_session_id'> }
> {
  const { manager, userId } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldSessionId, input }: { fieldSessionId: string; input: Omit<CreateFindLogInput, 'field_session_id'> }) => {
      if (!manager || !userId) throw new Error('Find log manager not initialized');
      return manager.createFindLog(userId, fieldSessionId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findLogKeys.all });
    },
  });
}

/**
 * Update find log
 */
export function useUpdateFindLog(): UseMutationResult<
  FindLog,
  Error,
  { id: string; input: UpdateFindLogInput }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateFindLogInput }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.updateFindLog(id, input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: findLogKeys.all });
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

/**
 * Delete find log
 */
export function useDeleteFindLog(): UseMutationResult<void, Error, string> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findLogId: string) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.deleteFindLog(findLogId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findLogKeys.all });
    },
  });
}

/**
 * Update material identification
 */
export function useUpdateMaterialIdentification(): UseMutationResult<
  FindLog,
  Error,
  { findLogId: string; identification: MaterialIdentification }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findLogId, identification }: { findLogId: string; identification: MaterialIdentification }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.updateMaterialIdentification(findLogId, identification);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

/**
 * Update quality assessment
 */
export function useUpdateQualityAssessment(): UseMutationResult<
  FindLog,
  Error,
  { findLogId: string; quality: QualityAssessment }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findLogId, quality }: { findLogId: string; quality: QualityAssessment }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.updateQualityAssessment(findLogId, quality);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

/**
 * Add photo to find log
 */
export function useAddPhoto(): UseMutationResult<
  FindLog,
  Error,
  { findLogId: string; photo: PhotoMetadata }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findLogId, photo }: { findLogId: string; photo: PhotoMetadata }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.addPhoto(findLogId, photo);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

/**
 * Link specimen to find
 */
export function useLinkSpecimen(): UseMutationResult<
  FindLog,
  Error,
  { findLogId: string; specimenId: string }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findLogId, specimenId }: { findLogId: string; specimenId: string }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.linkSpecimen(findLogId, specimenId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

/**
 * Transition find state
 */
export function useTransitionFindState(): UseMutationResult<
  FindLog,
  Error,
  { findLogId: string; newState: FindLogState }
> {
  const { manager } = useFindLogContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findLogId, newState }: { findLogId: string; newState: FindLogState }) => {
      if (!manager) throw new Error('Find log manager not initialized');
      return manager.transitionFindState(findLogId, newState);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: findLogKeys.all });
      queryClient.setQueryData(findLogKeys.byId(data.id), data);
    },
  });
}

// ==================== UI COMPONENTS ====================

/**
 * Find log list component
 */
export function FindLogList({ userId, sessionId }: { userId: string; sessionId?: string }) {
  const { data: findLogs, isLoading } = useFindLogList(userId, sessionId);

  if (isLoading) {
    return <div className="find-logs-loading">Loading finds...</div>;
  }

  if (!findLogs || findLogs.length === 0) {
    return <div className="find-logs-empty">No finds yet</div>;
  }

  return (
    <div className="find-logs-list">
      {findLogs.map((find) => (
        <FindLogListItem key={find.id} findLog={find} />
      ))}
    </div>
  );
}

/**
 * Find log list item
 */
function FindLogListItem({ findLog }: { findLog: FindLog }) {
  const score = calculateFindScore(findLog.identification.confidence, findLog.quality.rating);

  return (
    <div className="find-log-item">
      <div className="find-log-header">
        <h3>{findLog.identification.primaryName}</h3>
        <span className="find-score">{score}/100</span>
      </div>
      <div className="find-log-meta">
        <span>{getMaterialTypeDisplay(findLog.identification.materialType)}</span>
        <span>{getQualityDisplay(findLog.quality.rating)}</span>
        <span>{getConfidenceDisplay(findLog.identification.confidence)}</span>
      </div>
      {findLog.photos.length > 0 && (
        <div className="find-photos-preview">
          {findLog.photos.slice(0, 3).map(photo => (
            <img key={photo.id} src={photo.url} alt="Find" style={{ width: '60px', height: '60px' }} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Find log detail component
 */
export function FindLogDetail({ findLogId }: { findLogId: string }) {
  const { data: findLog, isLoading } = useFindLog(findLogId);

  if (isLoading || !findLog) {
    return <div>Loading find...</div>;
  }

  const score = calculateFindScore(findLog.identification.confidence, findLog.quality.rating);

  return (
    <div className="find-log-detail">
      <h1>{findLog.identification.primaryName}</h1>
      <p>{findLog.identification.secondaryName && `(${findLog.identification.secondaryName})`}</p>

      <div className="find-scores">
        <div className="score">
          <label>Overall Score</label>
          <span>{score}/100</span>
        </div>
        <div className="score">
          <label>Quality</label>
          <span>{getQualityDisplay(findLog.quality.rating)}</span>
        </div>
        <div className="score">
          <label>Confidence</label>
          <span>{getConfidenceDisplay(findLog.identification.confidence)}</span>
        </div>
      </div>

      {findLog.characteristics.estimatedSize && (
        <div className="characteristics">
          <h3>Characteristics</h3>
          {findLog.characteristics.estimatedSize.length_mm && (
            <p>Length: {findLog.characteristics.estimatedSize.length_mm}mm</p>
          )}
          {findLog.characteristics.color && <p>Color: {findLog.characteristics.color}</p>}
          {findLog.characteristics.hardness && <p>Hardness: {findLog.characteristics.hardness}</p>}
        </div>
      )}

      {findLog.photos.length > 0 && (
        <div className="find-photos">
          <h3>Photos ({findLog.photos.length})</h3>
          {findLog.photos.map(photo => (
            <img key={photo.id} src={photo.url} alt="Find" style={{ maxWidth: '100%', marginBottom: '10px' }} />
          ))}
        </div>
      )}

      {findLog.notes && (
        <div className="notes">
          <h3>Notes</h3>
          <p>{findLog.notes}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Material identifier component
 */
export function MaterialIdentifier({ findLogId }: { findLogId: string }) {
  const { data: findLog } = useFindLog(findLogId);
  const update = useUpdateMaterialIdentification();
  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.UNKNOWN);
  const [confidence, setConfidence] = useState<IdentificationConfidence>(IdentificationConfidence.UNCERTAIN);
  const [name, setName] = useState('');

  const handleIdentify = async () => {
    if (!findLog) return;

    await update.mutateAsync({
      findLogId,
      identification: {
        ...findLog.identification,
        materialType,
        confidence,
        primaryName: name,
        identifiedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="material-identifier">
      <h3>Material Identification</h3>
      <select value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)}>
        {Object.entries(MaterialType).map(([key, value]) => (
          <option key={key} value={value}>{getMaterialTypeDisplay(value as MaterialType)}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Material name (e.g., Quartz, Hematite)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <select value={confidence} onChange={(e) => setConfidence(e.target.value as IdentificationConfidence)}>
        {Object.entries(IdentificationConfidence).map(([key, value]) => (
          <option key={key} value={value}>{getConfidenceDisplay(value as IdentificationConfidence)}</option>
        ))}
      </select>

      <button onClick={handleIdentify} disabled={update.isPending || !name}>
        {update.isPending ? 'Identifying...' : 'Identify Material'}
      </button>
    </div>
  );
}

/**
 * Quality rater component
 */
export function QualityRater({ findLogId }: { findLogId: string }) {
  const { data: findLog } = useFindLog(findLogId);
  const update = useUpdateQualityAssessment();
  const [rating, setRating] = useState<QualityRating>(QualityRating.GOOD);
  const [notes, setNotes] = useState('');

  const handleRate = async () => {
    if (!findLog) return;

    await update.mutateAsync({
      findLogId,
      quality: {
        rating,
        conditionNotes: notes,
      },
    });
  };

  return (
    <div className="quality-rater">
      <h3>Quality Rating</h3>
      <select value={rating} onChange={(e) => setRating(e.target.value as QualityRating)}>
        {Object.entries(QualityRating).map(([key, value]) => (
          <option key={key} value={value}>{getQualityDisplay(value as QualityRating)}</option>
        ))}
      </select>

      <textarea
        placeholder="Condition notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button onClick={handleRate} disabled={update.isPending}>
        {update.isPending ? 'Rating...' : 'Save Rating'}
      </button>
    </div>
  );
}

/**
 * Find status badge
 */
export function FindStatusBadge({ state }: { state: FindLogState }) {
  const stateClass = state.toLowerCase();

  return (
    <span className={`find-status-badge find-status-${stateClass}`}>
      {state}
    </span>
  );
}

/**
 * Check if provider is ready
 */
export function useFindLogProviderReady(): boolean {
  const { isInitialized } = useFindLogContext();
  return isInitialized;
}

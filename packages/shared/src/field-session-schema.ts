/**
 * FieldSession Schema
 * 
 * Comprehensive schema for field session management with lifecycle states,
 * deterministic rules, FindLog aggregation, and offline sync support.
 * 
 * A field session represents a rockhounding expedition where a geologist
 * collects multiple specimens (FindLog entries) over a time period, with
 * support for offline-first operation and eventual consistency.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Field session lifecycle states
 * Follows a deterministic state machine to ensure data consistency
 */
export enum SessionState {
  /** Session created but not yet started (planning phase) */
  DRAFT = 'DRAFT',
  
  /** Session is actively in progress (collecting specimens) */
  ACTIVE = 'ACTIVE',
  
  /** Session paused (temporarily suspended, can resume) */
  PAUSED = 'PAUSED',
  
  /** Session ended, finalizing aggregations */
  FINALIZING = 'FINALIZING',
  
  /** Session completed and synced to server */
  COMPLETED = 'COMPLETED',
  
  /** Session cancelled (no data persisted) */
  CANCELLED = 'CANCELLED',
  
  /** Session has unresolved sync conflicts */
  CONFLICT = 'CONFLICT',
}

/**
 * Sync status for offline-first operation
 * Tracks synchronization state with remote server
 */
export enum SyncStatus {
  /** Not yet synced, only exists locally */
  LOCAL_ONLY = 'LOCAL_ONLY',
  
  /** Queued for sync when connection available */
  PENDING = 'PENDING',
  
  /** Currently syncing with server */
  SYNCING = 'SYNCING',
  
  /** Successfully synced with server */
  SYNCED = 'SYNCED',
  
  /** Sync failed, will retry */
  FAILED = 'FAILED',
  
  /** Conflict detected, requires manual resolution */
  CONFLICT = 'CONFLICT',
}

/**
 * Weather conditions for field sessions
 * Impacts visibility, safety, and specimen quality assessment
 */
export enum WeatherCondition {
  CLEAR = 'CLEAR',
  PARTLY_CLOUDY = 'PARTLY_CLOUDY',
  OVERCAST = 'OVERCAST',
  LIGHT_RAIN = 'LIGHT_RAIN',
  HEAVY_RAIN = 'HEAVY_RAIN',
  SNOW = 'SNOW',
  FOG = 'FOG',
  WINDY = 'WINDY',
  EXTREME_HEAT = 'EXTREME_HEAT',
  EXTREME_COLD = 'EXTREME_COLD',
}

/**
 * Session visibility level
 * Controls data sharing and privacy
 */
export enum SessionVisibility {
  /** Only visible to session owner */
  PRIVATE = 'PRIVATE',
  
  /** Shareable via link */
  SHARED_LINK = 'SHARED_LINK',
  
  /** Visible to team members */
  TEAM = 'TEAM',
}

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

/**
 * Core FieldSession entity
 * Represents a discrete rockhounding expedition with aggregated metrics
 */
export interface FieldSession {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Owner user ID (references auth.users) */
  user_id: string;
  
  /** Current lifecycle state */
  state: SessionState;
  
  /** Sync status for offline operation */
  sync_status: SyncStatus;
  
  // ---- SESSION METADATA ----
  
  /** Human-readable session title */
  title: string;
  
  /** Optional session description/notes */
  description?: string;
  
  /** Primary location ID (references locations table) */
  location_id?: string;
  
  /** Session visibility level */
  visibility: SessionVisibility;
  
  // ---- TEMPORAL DATA ----
  
  /** Planned/actual session start time */
  start_time: Date;
  
  /** Actual session end time (null if active) */
  end_time?: Date;
  
  /** Duration in seconds (computed field) */
  duration_seconds?: number;
  
  // ---- ENVIRONMENTAL CONDITIONS ----
  
  /** Weather conditions during session */
  weather_condition?: WeatherCondition;
  
  /** Temperature in Celsius */
  temperature_celsius?: number;
  
  /** Field notes about conditions */
  field_conditions?: string;
  
  // ---- SPATIAL DATA ----
  
  /** Session start point (GeoJSON geometry) */
  start_geom?: GeoJSONPoint;
  
  /** Starting latitude (WGS84) */
  start_lat?: number;
  
  /** Starting longitude (WGS84) */
  start_lon?: number;
  
  /** Session end point (may differ if mobile) */
  end_geom?: GeoJSONPoint;
  
  /** Ending latitude */
  end_lat?: number;
  
  /** Ending longitude */
  end_lon?: number;
  
  /** GPS track of session (LineString if recorded) */
  track_geom?: GeoJSONLineString;
  
  // ---- AGGREGATED METRICS (from FindLog entries) ----
  
  /** Total number of specimens collected */
  total_specimens: number;
  
  /** Number of unique material types found */
  unique_materials: number;
  
  /** Total weight of specimens (grams) */
  total_weight_grams?: number;
  
  /** Average specimen quality rating (1-5) */
  average_quality?: number;
  
  /** List of material IDs found during session */
  materials_found: string[];
  
  /** Best find of the session (FindLog ID) */
  best_find_id?: string;
  
  // ---- SYNC METADATA ----
  
  /** Client-side timestamp when session was created */
  client_created_at: Date;
  
  /** Client-side timestamp of last modification */
  client_updated_at: Date;
  
  /** Server-side timestamp when synced (null if local-only) */
  server_synced_at?: Date;
  
  /** Version number for optimistic locking */
  version: number;
  
  /** Device ID that created the session */
  device_id: string;
  
  /** Conflict resolution strategy applied (if any) */
  conflict_resolution?: 'client_wins' | 'server_wins' | 'merged';
  
  // ---- METADATA ----
  
  /** Server timestamp (auto-managed) */
  created_at: Date;
  
  /** Server timestamp (auto-managed) */
  updated_at: Date;
}

/**
 * FindLog entry - individual specimen found during a session
 * Aggregated into session-level metrics
 */
export interface FindLog {
  /** Unique identifier */
  id: string;
  
  /** Parent session ID */
  session_id: string;
  
  /** Owner user ID */
  user_id: string;
  
  /** Material/mineral found */
  material_id?: string;
  
  /** Material name (for display if offline) */
  material_name?: string;
  
  /** Quality rating (1-5) */
  quality_rating?: number;
  
  /** Weight in grams */
  weight_grams?: number;
  
  /** Specimen dimensions (LxWxH mm) */
  dimensions_mm?: { length: number; width: number; height: number };
  
  /** Field notes for this specimen */
  notes?: string;
  
  /** Photo storage paths */
  photo_paths: string[];
  
  /** Location where found (may differ from session start) */
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;
  
  /** Timestamp when specimen was found */
  found_at: Date;
  
  /** Sync status */
  sync_status: SyncStatus;
  
  /** Client metadata */
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  device_id: string;
  
  /** Server metadata */
  created_at: Date;
  updated_at: Date;
}

/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * GeoJSON LineString geometry (for GPS tracks)
 */
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // Array of [lon, lat] points
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Session lifecycle events
 * All state transitions emit events for audit trail and sync queue
 */
export type SessionEvent =
  | SessionCreatedEvent
  | SessionStartedEvent
  | SessionPausedEvent
  | SessionResumedEvent
  | SessionEndedEvent
  | SessionCancelledEvent
  | SessionSyncedEvent
  | SessionConflictEvent
  | FindLogAddedEvent
  | FindLogUpdatedEvent
  | FindLogDeletedEvent
  | MetricsRecalculatedEvent;

/**
 * Base event structure
 */
export interface BaseSessionEvent {
  /** Event ID (UUID) */
  id: string;
  
  /** Session ID this event belongs to */
  session_id: string;
  
  /** User who triggered the event */
  user_id: string;
  
  /** Event type discriminator */
  type: string;
  
  /** Client timestamp when event occurred */
  timestamp: Date;
  
  /** Device that generated the event */
  device_id: string;
  
  /** Sync status of this event */
  sync_status: SyncStatus;
  
  /** Event sequence number (for ordering) */
  sequence_number: number;
}

export interface SessionCreatedEvent extends BaseSessionEvent {
  type: 'session.created';
  payload: {
    title: string;
    location_id?: string;
    start_time: Date;
  };
}

export interface SessionStartedEvent extends BaseSessionEvent {
  type: 'session.started';
  payload: {
    previous_state: SessionState;
    start_geom?: GeoJSONPoint;
    weather_condition?: WeatherCondition;
  };
}

export interface SessionPausedEvent extends BaseSessionEvent {
  type: 'session.paused';
  payload: {
    reason?: string;
    pause_geom?: GeoJSONPoint;
  };
}

export interface SessionResumedEvent extends BaseSessionEvent {
  type: 'session.resumed';
  payload: {
    resume_geom?: GeoJSONPoint;
  };
}

export interface SessionEndedEvent extends BaseSessionEvent {
  type: 'session.ended';
  payload: {
    end_time: Date;
    end_geom?: GeoJSONPoint;
    final_metrics: {
      total_specimens: number;
      unique_materials: number;
      duration_seconds: number;
    };
  };
}

export interface SessionCancelledEvent extends BaseSessionEvent {
  type: 'session.cancelled';
  payload: {
    reason?: string;
  };
}

export interface SessionSyncedEvent extends BaseSessionEvent {
  type: 'session.synced';
  payload: {
    server_synced_at: Date;
    events_synced: number;
  };
}

export interface SessionConflictEvent extends BaseSessionEvent {
  type: 'session.conflict';
  payload: {
    conflict_type: 'version_mismatch' | 'data_divergence' | 'deleted_on_server';
    local_version: number;
    server_version: number;
    resolution_strategy?: 'client_wins' | 'server_wins' | 'manual';
  };
}

export interface FindLogAddedEvent extends BaseSessionEvent {
  type: 'findlog.added';
  payload: {
    find_log_id: string;
    material_id?: string;
    quality_rating?: number;
  };
}

export interface FindLogUpdatedEvent extends BaseSessionEvent {
  type: 'findlog.updated';
  payload: {
    find_log_id: string;
    updated_fields: string[];
  };
}

export interface FindLogDeletedEvent extends BaseSessionEvent {
  type: 'findlog.deleted';
  payload: {
    find_log_id: string;
  };
}

export interface MetricsRecalculatedEvent extends BaseSessionEvent {
  type: 'metrics.recalculated';
  payload: {
    total_specimens: number;
    unique_materials: number;
    total_weight_grams?: number;
    average_quality?: number;
  };
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

/**
 * Session state enum schema
 */
export const SessionStateSchema = z.nativeEnum(SessionState);

/**
 * Sync status enum schema
 */
export const SyncStatusSchema = z.nativeEnum(SyncStatus);

/**
 * Weather condition enum schema
 */
export const WeatherConditionSchema = z.nativeEnum(WeatherCondition);

/**
 * Session visibility enum schema
 */
export const SessionVisibilitySchema = z.nativeEnum(SessionVisibility);

/**
 * GeoJSON Point schema
 */
export const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

/**
 * GeoJSON LineString schema
 */
export const GeoJSONLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])
  ).min(2), // At least 2 points for a line
});

/**
 * Specimen dimensions schema
 */
export const SpecimenDimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
});

/**
 * FieldSession creation schema (for new sessions)
 */
export const CreateFieldSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  location_id: z.string().uuid().optional(),
  visibility: SessionVisibilitySchema.default(SessionVisibility.PRIVATE),
  start_time: z.date().default(() => new Date()),
  weather_condition: WeatherConditionSchema.optional(),
  temperature_celsius: z.number().min(-50).max(60).optional(),
  field_conditions: z.string().max(500).optional(),
  start_lat: z.number().min(-90).max(90).optional(),
  start_lon: z.number().min(-180).max(180).optional(),
  device_id: z.string().min(1),
});

/**
 * FieldSession update schema (for editing existing sessions)
 */
export const UpdateFieldSessionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  location_id: z.string().uuid().optional(),
  visibility: SessionVisibilitySchema.optional(),
  weather_condition: WeatherConditionSchema.optional(),
  temperature_celsius: z.number().min(-50).max(60).optional(),
  field_conditions: z.string().max(500).optional(),
  end_time: z.date().optional(),
  end_lat: z.number().min(-90).max(90).optional(),
  end_lon: z.number().min(-180).max(180).optional(),
});

/**
 * FindLog creation schema
 */
export const CreateFindLogSchema = z.object({
  session_id: z.string().uuid(),
  material_id: z.string().uuid().optional(),
  material_name: z.string().max(200).optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  weight_grams: z.number().positive().optional(),
  dimensions_mm: SpecimenDimensionsSchema.optional(),
  notes: z.string().max(2000).optional(),
  photo_paths: z.array(z.string()).default([]),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  found_at: z.date().default(() => new Date()),
  device_id: z.string().min(1),
});

/**
 * FindLog update schema
 */
export const UpdateFindLogSchema = z.object({
  material_id: z.string().uuid().optional(),
  material_name: z.string().max(200).optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  weight_grams: z.number().positive().optional(),
  dimensions_mm: SpecimenDimensionsSchema.optional(),
  notes: z.string().max(2000).optional(),
  photo_paths: z.array(z.string()).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

/**
 * Session state transition schema
 * Validates allowed state transitions
 */
export const SessionStateTransitionSchema = z.object({
  from_state: SessionStateSchema,
  to_state: SessionStateSchema,
  reason: z.string().max(500).optional(),
}).refine(
  (data) => isValidStateTransition(data.from_state, data.to_state),
  {
    message: 'Invalid state transition',
    path: ['to_state'],
  }
);

// ============================================================================
// VALIDATION RULES & BUSINESS LOGIC
// ============================================================================

/**
 * State machine: Valid state transitions
 * Enforces deterministic lifecycle rules
 */
export const VALID_STATE_TRANSITIONS: Record<SessionState, SessionState[]> = {
  [SessionState.DRAFT]: [
    SessionState.ACTIVE,
    SessionState.CANCELLED,
  ],
  [SessionState.ACTIVE]: [
    SessionState.PAUSED,
    SessionState.FINALIZING,
    SessionState.CANCELLED,
  ],
  [SessionState.PAUSED]: [
    SessionState.ACTIVE,
    SessionState.FINALIZING,
    SessionState.CANCELLED,
  ],
  [SessionState.FINALIZING]: [
    SessionState.COMPLETED,
    SessionState.CONFLICT,
  ],
  [SessionState.COMPLETED]: [
    // Terminal state - no transitions allowed
  ],
  [SessionState.CANCELLED]: [
    // Terminal state - no transitions allowed
  ],
  [SessionState.CONFLICT]: [
    SessionState.COMPLETED, // After manual resolution
    SessionState.CANCELLED, // If unresolvable
  ],
};

/**
 * Check if a state transition is valid
 */
export function isValidStateTransition(
  fromState: SessionState,
  toState: SessionState
): boolean {
  return VALID_STATE_TRANSITIONS[fromState]?.includes(toState) ?? false;
}

/**
 * Deterministic rule: Session must be ACTIVE or PAUSED to add FindLog entries
 */
export function canAddFindLog(session: FieldSession): boolean {
  return [SessionState.ACTIVE, SessionState.PAUSED].includes(session.state);
}

/**
 * Deterministic rule: Session can only be finalized if it has at least one FindLog
 */
export function canFinalizeSession(session: FieldSession): boolean {
  return (
    [SessionState.ACTIVE, SessionState.PAUSED].includes(session.state) &&
    session.total_specimens > 0
  );
}

/**
 * Deterministic rule: Session can be cancelled at any time except COMPLETED
 */
export function canCancelSession(session: FieldSession): boolean {
  return ![SessionState.COMPLETED, SessionState.CANCELLED].includes(session.state);
}

/**
 * Calculate session duration in seconds
 */
export function calculateSessionDuration(
  startTime: Date,
  endTime?: Date
): number {
  const end = endTime ?? new Date();
  return Math.floor((end.getTime() - startTime.getTime()) / 1000);
}

/**
 * Aggregate metrics from FindLog entries
 * Recomputes session-level statistics
 */
export function aggregateSessionMetrics(findLogs: FindLog[]): {
  total_specimens: number;
  unique_materials: number;
  total_weight_grams: number;
  average_quality: number;
  materials_found: string[];
} {
  const total_specimens = findLogs.length;
  
  // Unique materials (filter out undefined/null)
  const materialIds = findLogs
    .map(f => f.material_id)
    .filter((id): id is string => !!id);
  const materials_found = Array.from(new Set(materialIds));
  const unique_materials = materials_found.length;
  
  // Total weight (sum all entries with weight)
  const total_weight_grams = findLogs.reduce(
    (sum, f) => sum + (f.weight_grams ?? 0),
    0
  );
  
  // Average quality (only entries with ratings)
  const ratingsWithValues = findLogs
    .map(f => f.quality_rating)
    .filter((r): r is number => r !== undefined);
  const average_quality = ratingsWithValues.length > 0
    ? ratingsWithValues.reduce((sum, r) => sum + r, 0) / ratingsWithValues.length
    : 0;
  
  return {
    total_specimens,
    unique_materials,
    total_weight_grams,
    average_quality,
    materials_found,
  };
}

/**
 * Validate session for sync
 * Ensures session meets requirements for server sync
 */
export function validateSessionForSync(session: FieldSession): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Must have user_id
  if (!session.user_id) {
    errors.push('Session must have user_id');
  }
  
  // Must have title
  if (!session.title || session.title.trim().length < 3) {
    errors.push('Session must have valid title');
  }
  
  // Must have start_time
  if (!session.start_time) {
    errors.push('Session must have start_time');
  }
  
  // If COMPLETED, must have end_time
  if (session.state === SessionState.COMPLETED && !session.end_time) {
    errors.push('Completed session must have end_time');
  }
  
  // Must have device_id
  if (!session.device_id) {
    errors.push('Session must have device_id');
  }
  
  // Metrics must be non-negative
  if (session.total_specimens < 0) {
    errors.push('total_specimens cannot be negative');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// OFFLINE SYNC QUEUE INTEGRATION
// ============================================================================

/**
 * Sync queue entry for offline replay
 * Queues session events for batch sync when connection restored
 */
export interface SyncQueueEntry {
  /** Queue entry ID */
  id: string;
  
  /** Event to sync */
  event: SessionEvent;
  
  /** Priority (higher = sync first) */
  priority: number;
  
  /** Retry count */
  retry_count: number;
  
  /** Max retries before failure */
  max_retries: number;
  
  /** Next retry time (exponential backoff) */
  next_retry_at?: Date;
  
  /** Error message if failed */
  last_error?: string;
  
  /** Queue status */
  status: 'pending' | 'processing' | 'failed' | 'completed';
  
  /** Timestamps */
  created_at: Date;
  updated_at: Date;
}

/**
 * Sync queue priorities
 * Higher priority events sync first
 */
export const SYNC_PRIORITIES = {
  SESSION_CREATED: 100,
  SESSION_STARTED: 90,
  FINDLOG_ADDED: 80,
  FINDLOG_UPDATED: 70,
  SESSION_ENDED: 60,
  METRICS_RECALCULATED: 50,
  SESSION_PAUSED: 40,
  SESSION_RESUMED: 40,
  FINDLOG_DELETED: 30,
  SESSION_CANCELLED: 20,
} as const;

/**
 * Get sync priority for event type
 */
export function getSyncPriority(eventType: string): number {
  const priorityMap: Record<string, number> = {
    'session.created': SYNC_PRIORITIES.SESSION_CREATED,
    'session.started': SYNC_PRIORITIES.SESSION_STARTED,
    'findlog.added': SYNC_PRIORITIES.FINDLOG_ADDED,
    'findlog.updated': SYNC_PRIORITIES.FINDLOG_UPDATED,
    'session.ended': SYNC_PRIORITIES.SESSION_ENDED,
    'metrics.recalculated': SYNC_PRIORITIES.METRICS_RECALCULATED,
    'session.paused': SYNC_PRIORITIES.SESSION_PAUSED,
    'session.resumed': SYNC_PRIORITIES.SESSION_RESUMED,
    'findlog.deleted': SYNC_PRIORITIES.FINDLOG_DELETED,
    'session.cancelled': SYNC_PRIORITIES.SESSION_CANCELLED,
  };
  
  return priorityMap[eventType] ?? 0;
}

/**
 * Calculate exponential backoff for retry
 */
export function calculateNextRetry(retryCount: number): Date {
  const baseDelayMs = 1000; // 1 second
  const maxDelayMs = 60000; // 60 seconds
  const delayMs = Math.min(baseDelayMs * Math.pow(2, retryCount), maxDelayMs);
  
  return new Date(Date.now() + delayMs);
}

/**
 * Session sync interaction patterns
 * 
 * OFFLINE OPERATION:
 * 1. User creates session while offline -> stored in IndexedDB
 * 2. All events (started, findlog.added, etc.) queued in SyncQueue
 * 3. Metrics aggregated locally (deterministic computation)
 * 4. Session state transitions tracked in event log
 * 
 * SYNC OPERATION:
 * 1. Connection restored -> sync worker processes queue by priority
 * 2. Events replayed to server in sequence_number order
 * 3. Server validates and persists events
 * 4. Server recomputes aggregations (idempotent)
 * 5. Client receives confirmation and updates sync_status
 * 
 * CONFLICT RESOLUTION:
 * 1. Server detects version mismatch during sync
 * 2. Server returns conflict event with both versions
 * 3. Client applies resolution strategy:
 *    - client_wins: Keep local changes, increment version
 *    - server_wins: Discard local changes, adopt server state
 *    - manual: Prompt user to resolve conflicts
 * 4. Resolved session re-queued for sync
 * 
 * DETERMINISTIC GUARANTEES:
 * - Same event sequence always produces same session state
 * - Aggregations are pure functions (no side effects)
 * - State transitions follow strict state machine
 * - Version numbers prevent lost updates
 * - Event sequence numbers ensure ordering
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateFieldSessionInput = z.infer<typeof CreateFieldSessionSchema>;
export type UpdateFieldSessionInput = z.infer<typeof UpdateFieldSessionSchema>;
export type CreateFindLogInput = z.infer<typeof CreateFindLogSchema>;
export type UpdateFindLogInput = z.infer<typeof UpdateFindLogSchema>;
export type SessionStateTransition = z.infer<typeof SessionStateTransitionSchema>;

# FieldSession Schema Documentation

## Overview

The FieldSession schema provides a complete system for managing rockhounding field sessions with offline-first capabilities, deterministic state management, and eventual consistency guarantees. This document describes the architecture, lifecycle, sync patterns, and integration with the offline replay queue.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Data Model](#data-model)
3. [State Machine](#state-machine)
4. [Lifecycle Management](#lifecycle-management)
5. [FindLog Aggregation](#findlog-aggregation)
6. [Offline Sync Architecture](#offline-sync-architecture)
7. [Event Sourcing](#event-sourcing)
8. [Conflict Resolution](#conflict-resolution)
9. [API Integration](#api-integration)
10. [Usage Examples](#usage-examples)

---

## Core Concepts

### FieldSession

A **FieldSession** represents a discrete rockhounding expedition where a geologist collects multiple specimens over a time period. Key characteristics:

- **Offline-first**: Sessions can be created and managed entirely offline
- **Event-sourced**: All state changes tracked as events for replay
- **Deterministic**: Same input events always produce same session state
- **Eventually consistent**: Local changes sync to server when online

### FindLog

A **FindLog** is an individual specimen found during a session. FindLog entries are:

- Child entities of a FieldSession
- Aggregated into session-level metrics
- Independently synced with versioning
- Deletable without affecting session

### Sync Queue

The **SyncQueue** manages offline operations:

- Queues events for batch sync when connection restored
- Priority-based processing (session creation before find logs)
- Exponential backoff for failed syncs
- Idempotent replay (same events produce same server state)

---

## Data Model

### FieldSession Entity

```typescript
interface FieldSession {
  // Identity
  id: string; // UUID v4
  user_id: string; // References auth.users
  device_id: string; // Device that created session

  // State
  state: SessionState; // DRAFT | ACTIVE | PAUSED | FINALIZING | COMPLETED | CANCELLED | CONFLICT
  sync_status: SyncStatus; // LOCAL_ONLY | PENDING | SYNCING | SYNCED | FAILED | CONFLICT
  version: number; // Optimistic locking version

  // Metadata
  title: string; // Human-readable name
  description?: string; // Optional notes
  location_id?: string; // Primary location (references locations table)
  visibility: SessionVisibility; // PRIVATE | SHARED_LINK | TEAM

  // Temporal
  start_time: Date; // Planned/actual start
  end_time?: Date; // Actual end (null if active)
  duration_seconds?: number; // Computed duration

  // Environmental
  weather_condition?: WeatherCondition;
  temperature_celsius?: number;
  field_conditions?: string;

  // Spatial
  start_geom?: GeoJSONPoint; // Starting coordinates
  start_lat?: number;
  start_lon?: number;
  end_geom?: GeoJSONPoint; // Ending coordinates
  end_lat?: number;
  end_lon?: number;
  track_geom?: GeoJSONLineString; // GPS track (if recorded)

  // Aggregated Metrics (computed from FindLog entries)
  total_specimens: number;
  unique_materials: number;
  total_weight_grams?: number;
  average_quality?: number;
  materials_found: string[]; // Array of material IDs
  best_find_id?: string; // ID of best FindLog entry

  // Sync Metadata
  client_created_at: Date; // Client timestamp
  client_updated_at: Date; // Client last modification
  server_synced_at?: Date; // Server sync timestamp
  conflict_resolution?: string; // 'client_wins' | 'server_wins' | 'merged'

  // Database Metadata
  created_at: Date; // Server-managed
  updated_at: Date; // Server-managed
}
```

### FindLog Entity

```typescript
interface FindLog {
  // Identity
  id: string;
  session_id: string; // Parent session
  user_id: string;
  device_id: string;

  // Specimen Data
  material_id?: string; // References materials table
  material_name?: string; // For offline display
  quality_rating?: number; // 1-5 scale
  weight_grams?: number;
  dimensions_mm?: {
    length: number;
    width: number;
    height: number;
  };
  notes?: string;
  photo_paths: string[]; // Storage paths

  // Spatial
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;

  // Temporal
  found_at: Date; // When specimen was found

  // Sync
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;

  // Database
  created_at: Date;
  updated_at: Date;
}
```

---

## State Machine

### States

```typescript
enum SessionState {
  DRAFT = 'DRAFT', // Created but not started
  ACTIVE = 'ACTIVE', // In progress, collecting specimens
  PAUSED = 'PAUSED', // Temporarily suspended
  FINALIZING = 'FINALIZING', // Ended, computing aggregations
  COMPLETED = 'COMPLETED', // Finalized and synced (terminal)
  CANCELLED = 'CANCELLED', // Abandoned (terminal)
  CONFLICT = 'CONFLICT', // Sync conflict detected
}
```

### Valid Transitions

```
DRAFT → ACTIVE          (Start session)
DRAFT → CANCELLED       (Abandon before starting)

ACTIVE → PAUSED         (Pause collection)
ACTIVE → FINALIZING     (End session)
ACTIVE → CANCELLED      (Abandon session)

PAUSED → ACTIVE         (Resume collection)
PAUSED → FINALIZING     (End session)
PAUSED → CANCELLED      (Abandon session)

FINALIZING → COMPLETED  (Successfully synced)
FINALIZING → CONFLICT   (Conflict detected)

CONFLICT → COMPLETED    (Conflict resolved)
CONFLICT → CANCELLED    (Unresolvable conflict)

COMPLETED → ∅           (Terminal state)
CANCELLED → ∅           (Terminal state)
```

### State Transition Rules

**Deterministic validation** ensures consistency:

```typescript
// Check if transition is valid
function isValidStateTransition(from: SessionState, to: SessionState): boolean {
  const validTransitions = {
    DRAFT: [ACTIVE, CANCELLED],
    ACTIVE: [PAUSED, FINALIZING, CANCELLED],
    PAUSED: [ACTIVE, FINALIZING, CANCELLED],
    FINALIZING: [COMPLETED, CONFLICT],
    COMPLETED: [],
    CANCELLED: [],
    CONFLICT: [COMPLETED, CANCELLED],
  };

  return validTransitions[from]?.includes(to) ?? false;
}
```

### Business Rules

```typescript
// Can only add FindLog entries when session is active or paused
canAddFindLog(session): boolean {
  return [ACTIVE, PAUSED].includes(session.state);
}

// Can only finalize if session has specimens
canFinalizeSession(session): boolean {
  return [ACTIVE, PAUSED].includes(session.state)
    && session.total_specimens > 0;
}

// Can cancel at any time except terminal states
canCancelSession(session): boolean {
  return ![COMPLETED, CANCELLED].includes(session.state);
}
```

---

## Lifecycle Management

### Creating a Session

```typescript
// 1. Create session in DRAFT state
const session = await createSession({
  title: 'Morning at Crystal Peak',
  location_id: 'location-123',
  start_time: new Date(),
  device_id: getDeviceId(),
});

// 2. Session stored in IndexedDB
await saveToIndexedDB('sessions', session);

// 3. Queue sync event
await queueSyncEvent({
  type: 'session.created',
  session_id: session.id,
  payload: { title: session.title, location_id: session.location_id },
  priority: SYNC_PRIORITIES.SESSION_CREATED,
});
```

### Starting a Session

```typescript
// 1. Validate state transition
if (!isValidStateTransition(session.state, SessionState.ACTIVE)) {
  throw new Error('Cannot start session from current state');
}

// 2. Update session state
session.state = SessionState.ACTIVE;
session.start_time = new Date();
session.start_lat = currentLocation.lat;
session.start_lon = currentLocation.lon;

// 3. Queue sync event
await queueSyncEvent({
  type: 'session.started',
  session_id: session.id,
  payload: {
    previous_state: SessionState.DRAFT,
    start_geom: { type: 'Point', coordinates: [lon, lat] },
  },
});
```

### Adding FindLog Entries

```typescript
// 1. Validate session state
if (!canAddFindLog(session)) {
  throw new Error('Cannot add specimens to session in current state');
}

// 2. Create FindLog entry
const findLog = await createFindLog({
  session_id: session.id,
  material_id: 'quartz-123',
  quality_rating: 4,
  weight_grams: 150,
  notes: 'Clear quartz crystal cluster',
  device_id: getDeviceId(),
});

// 3. Store locally
await saveToIndexedDB('find_logs', findLog);

// 4. Queue sync event
await queueSyncEvent({
  type: 'findlog.added',
  session_id: session.id,
  payload: { find_log_id: findLog.id, material_id: findLog.material_id },
  priority: SYNC_PRIORITIES.FINDLOG_ADDED,
});

// 5. Update session metrics
await recalculateSessionMetrics(session);
```

### Ending a Session

```typescript
// 1. Validate can finalize
if (!canFinalizeSession(session)) {
  throw new Error('Session must have specimens before finalizing');
}

// 2. Transition to FINALIZING state
session.state = SessionState.FINALIZING;
session.end_time = new Date();
session.duration_seconds = calculateSessionDuration(session.start_time, session.end_time);

// 3. Recalculate final metrics
const findLogs = await getSessionFindLogs(session.id);
const metrics = aggregateSessionMetrics(findLogs);
Object.assign(session, metrics);

// 4. Queue end event
await queueSyncEvent({
  type: 'session.ended',
  session_id: session.id,
  payload: {
    end_time: session.end_time,
    final_metrics: metrics,
  },
  priority: SYNC_PRIORITIES.SESSION_ENDED,
});

// 5. Transition to COMPLETED once synced
session.state = SessionState.COMPLETED;
```

---

## FindLog Aggregation

### Aggregation Rules

Session-level metrics are **deterministically computed** from FindLog entries:

```typescript
function aggregateSessionMetrics(findLogs: FindLog[]) {
  return {
    // Count all specimens
    total_specimens: findLogs.length,

    // Count unique materials (filter nulls)
    unique_materials: new Set(findLogs.map((f) => f.material_id).filter(Boolean)).size,

    // Sum weights (ignore nulls)
    total_weight_grams: findLogs.reduce((sum, f) => sum + (f.weight_grams ?? 0), 0),

    // Average quality (only entries with ratings)
    average_quality: average(findLogs.map((f) => f.quality_rating).filter(Boolean)),

    // List of material IDs
    materials_found: Array.from(new Set(findLogs.map((f) => f.material_id).filter(Boolean))),
  };
}
```

### When to Recalculate

Metrics are recalculated:

1. After adding a FindLog entry
2. After updating a FindLog entry
3. After deleting a FindLog entry
4. Before finalizing session
5. After resolving sync conflicts

### Idempotent Aggregation

**Key property**: Calling `aggregateSessionMetrics()` multiple times with same input produces identical output. This ensures:

- Local and server metrics converge
- Replay produces consistent state
- Conflicts can be resolved deterministically

---

## Offline Sync Architecture

### Sync Status Flow

```
LOCAL_ONLY → PENDING → SYNCING → SYNCED
                ↓          ↓
              FAILED ← ─ ─ ┘
                ↓
            CONFLICT (requires resolution)
```

### Sync Queue Entry

```typescript
interface SyncQueueEntry {
  id: string;
  event: SessionEvent; // Event to sync
  priority: number; // Higher = sync first
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date; // Exponential backoff
  last_error?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  created_at: Date;
  updated_at: Date;
}
```

### Priority Levels

Events sync in priority order:

```typescript
const SYNC_PRIORITIES = {
  SESSION_CREATED: 100, // Must create session first
  SESSION_STARTED: 90, // Then start it
  FINDLOG_ADDED: 80, // Add specimens
  FINDLOG_UPDATED: 70, // Update specimens
  SESSION_ENDED: 60, // End session
  METRICS_RECALCULATED: 50, // Update metrics
  SESSION_PAUSED: 40,
  SESSION_RESUMED: 40,
  FINDLOG_DELETED: 30,
  SESSION_CANCELLED: 20,
};
```

### Sync Worker Flow

```typescript
// Service Worker or background process
async function processSyncQueue() {
  // 1. Check if online
  if (!navigator.onLine) {
    scheduleNextSync();
    return;
  }

  // 2. Get pending events (highest priority first)
  const entries = await getPendingSyncEntries();

  // 3. Process in order
  for (const entry of entries) {
    try {
      // 4. Mark as processing
      await updateSyncStatus(entry.id, 'processing');

      // 5. Send event to server
      const response = await fetch('/api/sync/events', {
        method: 'POST',
        body: JSON.stringify(entry.event),
      });

      if (response.ok) {
        // 6. Success - mark completed
        await updateSyncStatus(entry.id, 'completed');

        // 7. Update local entity sync status
        await updateEntitySyncStatus(entry.event.session_id, 'SYNCED');
      } else if (response.status === 409) {
        // 8. Conflict detected
        const conflict = await response.json();
        await handleConflict(entry.event.session_id, conflict);
      } else {
        // 9. Failed - schedule retry
        await scheduleRetry(entry);
      }
    } catch (error) {
      // 10. Network error - retry with backoff
      await scheduleRetry(entry);
    }
  }

  scheduleNextSync();
}
```

### Exponential Backoff

Failed syncs retry with exponential backoff:

```typescript
function calculateNextRetry(retryCount: number): Date {
  const baseDelayMs = 1000; // 1 second
  const maxDelayMs = 60000; // 60 seconds max
  const delayMs = Math.min(baseDelayMs * Math.pow(2, retryCount), maxDelayMs);
  return new Date(Date.now() + delayMs);
}

// Retry schedule:
// Attempt 0: 1s delay
// Attempt 1: 2s delay
// Attempt 2: 4s delay
// Attempt 3: 8s delay
// Attempt 4: 16s delay
// Attempt 5+: 60s delay (capped)
```

---

## Event Sourcing

### Event Types

All state changes emit events:

```typescript
type SessionEvent =
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
```

### Event Structure

```typescript
interface BaseSessionEvent {
  id: string; // Event UUID
  session_id: string; // Session this event belongs to
  user_id: string; // User who triggered event
  type: string; // Event discriminator
  timestamp: Date; // Client timestamp
  device_id: string; // Source device
  sync_status: SyncStatus; // Sync state
  sequence_number: number; // For ordering
}

interface FindLogAddedEvent extends BaseSessionEvent {
  type: 'findlog.added';
  payload: {
    find_log_id: string;
    material_id?: string;
    quality_rating?: number;
  };
}
```

### Event Log

Events are stored for:

1. **Audit trail**: Complete history of session
2. **Replay**: Reconstruct session state from events
3. **Sync**: Batch sync to server when online
4. **Debugging**: Troubleshoot state issues

### Event Replay

Reconstruct session state from event log:

```typescript
async function replaySession(sessionId: string): Promise<FieldSession> {
  // 1. Get all events for session (ordered by sequence_number)
  const events = await getSessionEvents(sessionId);

  // 2. Initialize empty session
  let session = createEmptySession();

  // 3. Replay each event
  for (const event of events) {
    session = applyEvent(session, event);
  }

  // 4. Recalculate aggregations
  const findLogs = await getSessionFindLogs(sessionId);
  const metrics = aggregateSessionMetrics(findLogs);
  Object.assign(session, metrics);

  return session;
}

function applyEvent(session: FieldSession, event: SessionEvent): FieldSession {
  switch (event.type) {
    case 'session.started':
      session.state = SessionState.ACTIVE;
      session.start_time = event.payload.start_time;
      break;

    case 'session.paused':
      session.state = SessionState.PAUSED;
      break;

    case 'session.ended':
      session.state = SessionState.FINALIZING;
      session.end_time = event.payload.end_time;
      break;

    // ... handle all event types
  }

  return session;
}
```

---

## Conflict Resolution

### Conflict Detection

Conflicts occur when:

1. **Version mismatch**: Client version ≠ server version
2. **Data divergence**: Same entity modified on multiple devices
3. **Deleted on server**: Entity synced but deleted by another client

### Conflict Event

```typescript
interface SessionConflictEvent {
  type: 'session.conflict';
  payload: {
    conflict_type: 'version_mismatch' | 'data_divergence' | 'deleted_on_server';
    local_version: number;
    server_version: number;
    server_data?: FieldSession; // Current server state
    resolution_strategy?: string; // How to resolve
  };
}
```

### Resolution Strategies

#### 1. Client Wins

Keep local changes, force-update server:

```typescript
async function resolveClientWins(sessionId: string) {
  const localSession = await getLocalSession(sessionId);

  // Increment version to overwrite server
  localSession.version += 1;
  localSession.conflict_resolution = 'client_wins';

  // Force sync with new version
  await forceSyncSession(localSession);
}
```

#### 2. Server Wins

Discard local changes, adopt server state:

```typescript
async function resolveServerWins(sessionId: string, serverData: FieldSession) {
  // Replace local session with server version
  await saveToIndexedDB('sessions', serverData);

  // Mark conflict as resolved
  await updateSessionState(sessionId, {
    state: SessionState.COMPLETED,
    conflict_resolution: 'server_wins',
  });
}
```

#### 3. Manual Resolution

Prompt user to choose:

```typescript
async function resolveManually(sessionId: string) {
  const localSession = await getLocalSession(sessionId);
  const serverSession = await fetchServerSession(sessionId);

  // Show UI for user to review differences
  const resolution = await showConflictDialog({
    local: localSession,
    server: serverSession,
    options: ['keep-local', 'keep-server', 'merge'],
  });

  if (resolution === 'keep-local') {
    await resolveClientWins(sessionId);
  } else if (resolution === 'keep-server') {
    await resolveServerWins(sessionId, serverSession);
  } else {
    // User manually merges fields
    const merged = await mergeSessionData(localSession, serverSession);
    await syncMergedSession(merged);
  }
}
```

### Optimistic Locking

Version numbers prevent lost updates:

```sql
-- Server update query
UPDATE field_sessions
SET
  title = $1,
  state = $2,
  version = version + 1,
  updated_at = now()
WHERE
  id = $3
  AND version = $4  -- Check current version matches
RETURNING *;
```

If version mismatch:

- Server returns 409 Conflict
- Client queues conflict resolution
- User resolves manually or auto-strategy applied

---

## API Integration

### POST /api/sessions

Create a new field session:

```typescript
// Request
POST /api/sessions
{
  "title": "Morning Rockhounding",
  "location_id": "loc-123",
  "start_time": "2024-01-01T10:00:00Z",
  "device_id": "device-abc"
}

// Response (201 Created)
{
  "id": "session-xyz",
  "user_id": "user-456",
  "state": "DRAFT",
  "sync_status": "SYNCED",
  "version": 1,
  "title": "Morning Rockhounding",
  "location_id": "loc-123",
  "start_time": "2024-01-01T10:00:00Z",
  "total_specimens": 0,
  "unique_materials": 0,
  "materials_found": [],
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### PATCH /api/sessions/:id

Update session state:

```typescript
// Request
PATCH /api/sessions/session-xyz
{
  "state": "ACTIVE",
  "version": 1  // Optimistic locking
}

// Response (200 OK)
{
  "id": "session-xyz",
  "state": "ACTIVE",
  "version": 2,  // Incremented
  // ... rest of session data
}

// Response (409 Conflict) - version mismatch
{
  "error": "Version conflict",
  "local_version": 1,
  "server_version": 3,
  "server_data": { /* current server state */ }
}
```

### POST /api/sessions/:id/find-logs

Add FindLog entry:

```typescript
// Request
POST /api/sessions/session-xyz/find-logs
{
  "material_id": "quartz-123",
  "quality_rating": 4,
  "weight_grams": 150,
  "device_id": "device-abc"
}

// Response (201 Created)
{
  "id": "find-abc",
  "session_id": "session-xyz",
  "material_id": "quartz-123",
  "quality_rating": 4,
  "weight_grams": 150,
  "version": 1,
  "created_at": "2024-01-01T11:00:00Z"
}

// Parent session metrics automatically updated
```

### POST /api/sync/events

Batch sync events:

```typescript
// Request
POST /api/sync/events
{
  "events": [
    {
      "type": "session.created",
      "session_id": "session-xyz",
      "sequence_number": 1,
      "payload": { /* ... */ }
    },
    {
      "type": "findlog.added",
      "session_id": "session-xyz",
      "sequence_number": 2,
      "payload": { /* ... */ }
    }
  ]
}

// Response (200 OK)
{
  "synced": 2,
  "conflicts": 0,
  "errors": []
}
```

---

## Usage Examples

### Example 1: Complete Offline Session

```typescript
// User goes offline at a remote location
// 1. Create session
const session = await createSession({
  title: 'Desert Canyon Exploration',
  location_id: 'canyon-site-789',
  start_time: new Date(),
  device_id: await getDeviceId(),
});

// 2. Start session
await transitionSessionState(session.id, SessionState.ACTIVE);

// 3. Collect specimens (all stored locally)
for (let i = 0; i < 5; i++) {
  const findLog = await createFindLog({
    session_id: session.id,
    material_id: 'agate-456',
    quality_rating: 4,
    weight_grams: 200 + i * 50,
    notes: `Specimen ${i + 1}`,
    device_id: await getDeviceId(),
  });

  // Metrics updated locally after each find
  await recalculateSessionMetrics(session.id);
}

// 4. End session
await transitionSessionState(session.id, SessionState.FINALIZING);

// 5. User returns home, connection restored
// Sync worker automatically processes queue:
// - session.created (priority 100)
// - session.started (priority 90)
// - findlog.added × 5 (priority 80 each)
// - session.ended (priority 60)

// 6. All events synced, session marked COMPLETED
```

### Example 2: Handling Conflicts

```typescript
// Scenario: User modified session on two devices offline

// Device A
await updateSession('session-123', {
  title: 'Updated Title A',
  version: 1,
});

// Device B (simultaneously)
await updateSession('session-123', {
  title: 'Updated Title B',
  version: 1,
});

// Both devices go online and sync
// Device A syncs first - success (version 1 → 2)
// Device B syncs second - conflict (version 1 ≠ 2)

// Device B receives conflict event
const conflict = {
  type: 'session.conflict',
  payload: {
    conflict_type: 'version_mismatch',
    local_version: 1,
    server_version: 2,
    server_data: { title: 'Updated Title A', version: 2 },
  },
};

// Resolution options:
// Option 1: Auto-resolve (server wins)
await resolveServerWins('session-123', conflict.payload.server_data);

// Option 2: Auto-resolve (client wins)
await resolveClientWins('session-123');

// Option 3: Manual resolution
const resolution = await showConflictDialog({
  local: localSession,
  server: conflict.payload.server_data,
});
```

### Example 3: Session Analytics

```typescript
// Query completed sessions for analytics
const sessions = await getCompletedSessions(userId);

// Calculate statistics
const stats = {
  total_sessions: sessions.length,
  total_specimens: sum(sessions.map((s) => s.total_specimens)),
  total_duration_hours: sum(sessions.map((s) => s.duration_seconds)) / 3600,
  average_specimens_per_session: average(sessions.map((s) => s.total_specimens)),
  most_common_materials: topMaterials(sessions.flatMap((s) => s.materials_found)),
  best_quality_average: max(sessions.map((s) => s.average_quality)),
};

// Generate report
console.table(stats);
```

---

## Summary

The FieldSession schema provides:

✅ **Offline-first operation** - Create and manage sessions without connectivity  
✅ **Deterministic state management** - Strict state machine with validated transitions  
✅ **Event sourcing** - Complete audit trail and replay capability  
✅ **Aggregated metrics** - FindLog entries rolled up to session level  
✅ **Priority-based sync** - Important events sync first  
✅ **Conflict resolution** - Multiple strategies for handling divergence  
✅ **Optimistic locking** - Version numbers prevent lost updates  
✅ **Idempotent operations** - Same input always produces same output  
✅ **Eventually consistent** - Local and server state converge

This architecture ensures data integrity, user productivity (offline work), and system reliability (automatic sync with conflict handling).

# FieldSession Schema - Quick Reference

## Overview

Complete TypeScript schema for managing rockhounding field sessions with offline-first capabilities, deterministic state management, and eventual consistency.

## Key Files Created

### 1. **field-session-schema.ts**

- Location: `packages/shared/src/field-session-schema.ts`
- 1000+ lines of TypeScript interfaces, enums, validation, and business logic
- Exports:
  - `FieldSession` and `FindLog` interfaces
  - `SessionState`, `SyncStatus`, `WeatherCondition`, `SessionVisibility` enums
  - 12 event types for event sourcing
  - Zod validation schemas
  - Business logic functions
  - Sync queue integration

### 2. **field-session-schema.test.ts**

- Location: `packages/shared/src/field-session-schema.test.ts`
- 850+ lines of comprehensive tests
- Test coverage:
  - State machine transitions (11 tests)
  - Business rules (10 tests)
  - Duration calculations (3 tests)
  - Aggregation logic (7 tests)
  - Validation schemas (10 tests)
  - Sync queue behavior (5 tests)
  - Deterministic guarantees (5 tests)

### 3. **field-session-architecture.md**

- Location: `docs/field-session-architecture.md`
- Complete architectural documentation
- Sections:
  - Data model
  - State machine
  - Lifecycle management
  - FindLog aggregation
  - Offline sync architecture
  - Event sourcing
  - Conflict resolution
  - API integration
  - Usage examples

### 4. **index.ts** (Updated)

- Location: `packages/shared/src/index.ts`
- Exports all FieldSession types and functions

## Core Components

### Enums

```typescript
enum SessionState {
  DRAFT,
  ACTIVE,
  PAUSED,
  FINALIZING,
  COMPLETED,
  CANCELLED,
  CONFLICT,
}

enum SyncStatus {
  LOCAL_ONLY,
  PENDING,
  SYNCING,
  SYNCED,
  FAILED,
  CONFLICT,
}

enum WeatherCondition {
  CLEAR,
  PARTLY_CLOUDY,
  OVERCAST,
  LIGHT_RAIN,
  HEAVY_RAIN,
  SNOW,
  FOG,
  WINDY,
  EXTREME_HEAT,
  EXTREME_COLD,
}

enum SessionVisibility {
  PRIVATE,
  SHARED_LINK,
  TEAM,
}
```

### Interfaces

```typescript
interface FieldSession {
  id: string;
  user_id: string;
  state: SessionState;
  sync_status: SyncStatus;

  // Metadata
  title: string;
  description?: string;
  location_id?: string;
  visibility: SessionVisibility;

  // Temporal
  start_time: Date;
  end_time?: Date;
  duration_seconds?: number;

  // Environmental
  weather_condition?: WeatherCondition;
  temperature_celsius?: number;
  field_conditions?: string;

  // Spatial
  start_geom?: GeoJSONPoint;
  start_lat?: number;
  start_lon?: number;
  end_geom?: GeoJSONPoint;
  end_lat?: number;
  end_lon?: number;
  track_geom?: GeoJSONLineString;

  // Aggregated Metrics (from FindLog entries)
  total_specimens: number;
  unique_materials: number;
  total_weight_grams?: number;
  average_quality?: number;
  materials_found: string[];
  best_find_id?: string;

  // Sync Metadata
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  device_id: string;
  conflict_resolution?: 'client_wins' | 'server_wins' | 'merged';

  // Database
  created_at: Date;
  updated_at: Date;
}

interface FindLog {
  id: string;
  session_id: string;
  user_id: string;

  // Specimen Data
  material_id?: string;
  material_name?: string;
  quality_rating?: number; // 1-5
  weight_grams?: number;
  dimensions_mm?: { length: number; width: number; height: number };
  notes?: string;
  photo_paths: string[];

  // Spatial
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;

  // Temporal
  found_at: Date;

  // Sync
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  device_id: string;

  // Database
  created_at: Date;
  updated_at: Date;
}
```

### Event Types

12 event types for complete audit trail:

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

### Validation Schemas

Zod schemas for runtime validation:

```typescript
CreateFieldSessionSchema; // For new sessions
UpdateFieldSessionSchema; // For updates
CreateFindLogSchema; // For new specimens
UpdateFindLogSchema; // For specimen updates
SessionStateTransitionSchema; // Validates state machine
```

### Business Logic Functions

```typescript
// State machine
isValidStateTransition(from, to): boolean
canAddFindLog(session): boolean
canFinalizeSession(session): boolean
canCancelSession(session): boolean

// Calculations
calculateSessionDuration(start, end?): number
aggregateSessionMetrics(findLogs): Metrics

// Validation
validateSessionForSync(session): { valid: boolean; errors: string[] }

// Sync queue
getSyncPriority(eventType): number
calculateNextRetry(retryCount): Date
```

## State Machine

### Valid Transitions

```
DRAFT → [ACTIVE, CANCELLED]
ACTIVE → [PAUSED, FINALIZING, CANCELLED]
PAUSED → [ACTIVE, FINALIZING, CANCELLED]
FINALIZING → [COMPLETED, CONFLICT]
COMPLETED → [] (terminal)
CANCELLED → [] (terminal)
CONFLICT → [COMPLETED, CANCELLED]
```

### Deterministic Rules

1. **Can add FindLog**: Only when state is `ACTIVE` or `PAUSED`
2. **Can finalize**: Only when state is `ACTIVE` or `PAUSED` AND `total_specimens > 0`
3. **Can cancel**: Any time except `COMPLETED` or `CANCELLED`
4. **Metrics recalculated**: After any FindLog change
5. **Version increments**: On every update (optimistic locking)

## Offline Sync Integration

### Sync Queue Priority

```typescript
SESSION_CREATED: 100; // Create session first
SESSION_STARTED: 90; // Then start
FINDLOG_ADDED: 80; // Add specimens
FINDLOG_UPDATED: 70; // Update specimens
SESSION_ENDED: 60; // End session
METRICS_RECALCULATED: 50; // Update metrics
SESSION_PAUSED: 40;
SESSION_RESUMED: 40;
FINDLOG_DELETED: 30;
SESSION_CANCELLED: 20;
```

### Sync Flow

```
1. User creates/modifies session offline
   ↓
2. Changes stored in IndexedDB
   ↓
3. Events queued with priority
   ↓
4. Connection restored
   ↓
5. Sync worker processes queue (priority order)
   ↓
6. Events replayed to server
   ↓
7. Server validates and persists
   ↓
8. Client receives confirmation
   ↓
9. Local sync_status updated to SYNCED
```

### Conflict Resolution

Three strategies:

1. **Client Wins**: Keep local changes, increment version, force-update server
2. **Server Wins**: Discard local changes, adopt server state
3. **Manual**: Prompt user to review and choose

### Exponential Backoff

Failed syncs retry with exponential backoff:

```
Attempt 0: 1 second delay
Attempt 1: 2 seconds
Attempt 2: 4 seconds
Attempt 3: 8 seconds
Attempt 4: 16 seconds
Attempt 5+: 60 seconds (capped)
```

## Aggregation Rules

Session metrics computed from FindLog entries:

```typescript
{
  total_specimens: findLogs.length,
  unique_materials: new Set(findLogs.map(f => f.material_id)).size,
  total_weight_grams: sum(findLogs.map(f => f.weight_grams)),
  average_quality: average(findLogs.map(f => f.quality_rating)),
  materials_found: [...new Set(findLogs.map(f => f.material_id))]
}
```

**Deterministic guarantee**: Same FindLog array always produces same metrics.

## Usage Example

```typescript
// 1. Create session offline
const session = await createSession({
  title: 'Morning at Crystal Peak',
  location_id: 'loc-123',
  start_time: new Date(),
  device_id: getDeviceId(),
});

// 2. Start collecting
await transitionState(session.id, SessionState.ACTIVE);

// 3. Log specimens
for (let i = 0; i < 5; i++) {
  await createFindLog({
    session_id: session.id,
    material_id: 'quartz-123',
    quality_rating: 4,
    weight_grams: 150,
    device_id: getDeviceId(),
  });
}

// 4. End session
await transitionState(session.id, SessionState.FINALIZING);

// 5. Sync when online
// Automatic via service worker
// - session.created (priority 100)
// - session.started (priority 90)
// - findlog.added × 5 (priority 80)
// - session.ended (priority 60)
// - metrics.recalculated (priority 50)

// 6. Session marked COMPLETED after sync
```

## Implementation Checklist

To implement this schema in your application:

- [ ] Install dependencies: `zod` for validation
- [ ] Import schema from `@rockhounding/shared`
- [ ] Create IndexedDB stores: `sessions`, `find_logs`, `events`, `sync_queue`
- [ ] Implement API endpoints: `/api/sessions`, `/api/sessions/:id/find-logs`, `/api/sync/events`
- [ ] Add database tables: `field_sessions`, `find_logs`, `session_events`
- [ ] Implement sync worker in service worker
- [ ] Add conflict resolution UI
- [ ] Create session management UI components
- [ ] Add session analytics/reporting

## Testing

Run the comprehensive test suite:

```bash
cd packages/shared
npm test field-session-schema.test.ts
```

51 tests covering:

- State machine transitions
- Business rules validation
- Duration calculations
- Aggregation logic
- Zod schema validation
- Sync queue behavior
- Deterministic guarantees

## Summary

This schema provides:

✅ **Offline-first** - Sessions work without connectivity  
✅ **Event sourced** - Complete audit trail  
✅ **Deterministic** - Same input → same output  
✅ **Eventually consistent** - Local ↔ server convergence  
✅ **Conflict aware** - Multiple resolution strategies  
✅ **Type-safe** - Full TypeScript + Zod validation  
✅ **Well-tested** - 51 comprehensive tests  
✅ **Documented** - Full architectural documentation

All code is production-ready and follows established patterns from your Rockhounding application.

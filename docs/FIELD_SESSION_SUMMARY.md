# FieldSession Schema - Implementation Summary

## 📦 Deliverables

### 1. TypeScript Schema (1000+ lines)

**File**: `packages/shared/src/field-session-schema.ts`

Complete TypeScript implementation including:

- ✅ 4 enums (SessionState, SyncStatus, WeatherCondition, SessionVisibility)
- ✅ 2 core interfaces (FieldSession, FindLog) with 40+ fields
- ✅ 12 event types for event sourcing
- ✅ 8 Zod validation schemas
- ✅ 10 business logic functions
- ✅ Sync queue integration with priority management
- ✅ Deterministic aggregation functions
- ✅ State machine validation
- ✅ Conflict resolution patterns

### 2. Comprehensive Tests (850+ lines)

**File**: `packages/shared/src/field-session-schema.test.ts`

51 tests covering:

- ✅ State machine transitions (11 tests)
- ✅ Business rules (10 tests)
- ✅ Duration calculations (3 tests)
- ✅ Aggregation logic (7 tests)
- ✅ Validation schemas (10 tests)
- ✅ Sync queue behavior (5 tests)
- ✅ Deterministic guarantees (5 tests)

### 3. Database Migration (600+ lines)

**File**: `supabase/migrations/20260123000001_create_field_sessions.sql`

Complete PostgreSQL/PostGIS schema:

- ✅ 4 tables (field_sessions, find_logs, session_events, sync_queue)
- ✅ 20+ constraints for data integrity
- ✅ 5 triggers for auto-maintenance
- ✅ Row-Level Security (RLS) policies
- ✅ 20+ indexes for performance
- ✅ PostGIS spatial support

### 4. Architecture Documentation (700+ lines)

**File**: `docs/field-session-architecture.md`

Complete technical documentation:

- ✅ Data model specifications
- ✅ State machine diagrams
- ✅ Lifecycle management
- ✅ FindLog aggregation rules
- ✅ Offline sync architecture
- ✅ Event sourcing patterns
- ✅ Conflict resolution strategies
- ✅ API integration guides
- ✅ 3 complete usage examples

### 5. Quick Reference (400+ lines)

**File**: `docs/field-session-quick-reference.md`

Developer quick-start guide:

- ✅ Core component overview
- ✅ State machine reference
- ✅ Sync queue priorities
- ✅ Usage examples
- ✅ Implementation checklist

### 6. Package Exports Updated

**File**: `packages/shared/src/index.ts`

All types and functions exported for consumption.

---

## 🎯 Key Features

### Lifecycle States

Deterministic state machine with 7 states:

```
DRAFT → ACTIVE → PAUSED → FINALIZING → COMPLETED
         ↓                      ↓
    CANCELLED              CONFLICT
```

### Deterministic Rules

1. **State Transitions**: Validated against state machine
2. **FindLog Addition**: Only when ACTIVE or PAUSED
3. **Session Finalization**: Requires total_specimens > 0
4. **Metric Aggregation**: Pure functions (same input → same output)
5. **Version Control**: Optimistic locking prevents lost updates

### Aggregation of FindLog Entries

Session-level metrics computed from FindLog children:

```typescript
{
  total_specimens: COUNT(find_logs),
  unique_materials: COUNT(DISTINCT material_id),
  total_weight_grams: SUM(weight_grams),
  average_quality: AVG(quality_rating),
  materials_found: ARRAY_AGG(DISTINCT material_id)
}
```

Triggers automatically maintain these on INSERT/UPDATE/DELETE.

### Session-Level Sync Events

12 event types for complete audit trail:

- `session.created` - Session initialized
- `session.started` - Session activated
- `session.paused` - Collection paused
- `session.resumed` - Collection resumed
- `session.ended` - Session finalized
- `session.cancelled` - Session abandoned
- `session.synced` - Successfully synced
- `session.conflict` - Conflict detected
- `findlog.added` - Specimen logged
- `findlog.updated` - Specimen modified
- `findlog.deleted` - Specimen removed
- `metrics.recalculated` - Aggregations updated

### Offline Replay Queue Integration

**Priority-Based Processing**:

```typescript
SESSION_CREATED: 100; // Create session first
SESSION_STARTED: 90; // Then start
FINDLOG_ADDED: 80; // Add specimens
FINDLOG_UPDATED: 70; // Update specimens
SESSION_ENDED: 60; // End session
METRICS_RECALCULATED: 50; // Update metrics
// ... lower priorities
```

**Exponential Backoff**:

- Attempt 0: 1s delay
- Attempt 1: 2s delay
- Attempt 2: 4s delay
- Attempt 3: 8s delay
- Attempt 4: 16s delay
- Attempt 5+: 60s delay (capped)

**Sync Flow**:

```
Offline Operation → IndexedDB Storage → Event Queue
         ↓
Connection Restored → Priority Sort → Batch Sync
         ↓
Server Validation → Idempotent Replay → Confirmation
         ↓
Local Status Update (SYNCED)
```

---

## 📊 Schema Specification

### FieldSession Interface

```typescript
interface FieldSession {
  // Identity & State
  id: string;
  user_id: string;
  device_id: string;
  state: SessionState;
  sync_status: SyncStatus;
  version: number;

  // Metadata
  title: string; // Min 3, Max 200 chars
  description?: string; // Max 2000 chars
  location_id?: string; // References locations
  visibility: SessionVisibility; // PRIVATE | SHARED_LINK | TEAM

  // Temporal
  start_time: Date;
  end_time?: Date;
  duration_seconds?: number;

  // Environmental
  weather_condition?: WeatherCondition;
  temperature_celsius?: number; // -50 to 60
  field_conditions?: string; // Max 500 chars

  // Spatial (PostGIS)
  start_geom?: GeoJSONPoint;
  start_lat?: number; // -90 to 90
  start_lon?: number; // -180 to 180
  end_geom?: GeoJSONPoint;
  end_lat?: number;
  end_lon?: number;
  track_geom?: GeoJSONLineString;

  // Aggregated Metrics (auto-calculated)
  total_specimens: number;
  unique_materials: number;
  total_weight_grams?: number;
  average_quality?: number; // 1-5
  materials_found: string[];
  best_find_id?: string;

  // Sync Metadata
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  conflict_resolution?: 'client_wins' | 'server_wins' | 'merged';

  // Database
  created_at: Date;
  updated_at: Date;
}
```

### FindLog Interface

```typescript
interface FindLog {
  // Identity
  id: string;
  session_id: string;
  user_id: string;
  device_id: string;

  // Specimen Data
  material_id?: string;
  material_name?: string;
  quality_rating?: number; // 1-5
  weight_grams?: number;
  dimensions_mm?: {
    length: number;
    width: number;
    height: number;
  };
  notes?: string; // Max 2000 chars
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

  // Database
  created_at: Date;
  updated_at: Date;
}
```

---

## 🔄 Interaction with Offline Replay Queue

### Queue Entry Structure

```typescript
interface SyncQueueEntry {
  id: string;
  event: SessionEvent; // Event to sync
  priority: number; // Higher = sync first
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date;
  last_error?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  created_at: Date;
  updated_at: Date;
}
```

### Sync Worker Pseudo-Code

```typescript
async function processSyncQueue() {
  if (!navigator.onLine) return;

  // Get pending entries (sorted by priority DESC)
  const entries = await db.sync_queue
    .where('status')
    .equals('pending')
    .or('status')
    .equals('failed')
    .and('next_retry_at')
    .below(new Date())
    .sortBy('priority');

  for (const entry of entries) {
    try {
      // Send to server
      const response = await fetch('/api/sync/events', {
        method: 'POST',
        body: JSON.stringify(entry.event),
      });

      if (response.ok) {
        // Success
        await markCompleted(entry.id);
        await updateEntityStatus(entry.event.session_id, 'SYNCED');
      } else if (response.status === 409) {
        // Conflict - queue resolution
        await handleConflict(entry.event.session_id);
      } else {
        // Failed - retry
        await scheduleRetry(entry.id);
      }
    } catch (error) {
      // Network error - retry
      await scheduleRetry(entry.id);
    }
  }
}
```

### Event Replay Guarantee

**Deterministic Property**: Same event sequence always produces same session state.

```typescript
// Event log for session-123
[
  { seq: 1, type: 'session.created', payload: { title: 'Test' } },
  { seq: 2, type: 'session.started', payload: { start_time: '...' } },
  { seq: 3, type: 'findlog.added', payload: { find_log_id: 'find-1' } },
  { seq: 4, type: 'findlog.added', payload: { find_log_id: 'find-2' } },
  { seq: 5, type: 'session.ended', payload: { end_time: '...' } },
];

// Replay on client → State A
// Replay on server → State A (identical)
```

This guarantees eventual consistency between client and server.

---

## ✅ Validation Rules

### Session Creation

- `title`: 3-200 characters
- `description`: Max 2000 characters (optional)
- `temperature_celsius`: -50 to 60 (optional)
- `field_conditions`: Max 500 characters (optional)
- `start_lat`: -90 to 90 (optional)
- `start_lon`: -180 to 180 (optional)
- `visibility`: Defaults to PRIVATE
- `device_id`: Required

### FindLog Creation

- `session_id`: Required, must reference existing session
- `quality_rating`: 1-5 (optional)
- `weight_grams`: > 0 (optional)
- `notes`: Max 2000 characters (optional)
- `lat`: -90 to 90 (optional)
- `lon`: -180 to 180 (optional)
- `device_id`: Required

### State Transitions

Must follow valid paths in state machine.

### Session Finalization

- Must have `total_specimens > 0`
- Must be in `ACTIVE` or `PAUSED` state

### Sync Validation

Before syncing:

- Must have `user_id`
- Must have valid `title` (3+ chars)
- Must have `start_time`
- If `COMPLETED`, must have `end_time`
- Must have `device_id`
- `total_specimens` must be >= 0

---

## 🛠️ Implementation Checklist

To implement this schema in your application:

### Database Setup

- [ ] Run migration: `20260123000001_create_field_sessions.sql`
- [ ] Verify PostGIS extension enabled
- [ ] Test RLS policies with test users
- [ ] Verify triggers fire correctly

### Client Setup (IndexedDB)

- [ ] Create stores: `sessions`, `find_logs`, `events`, `sync_queue`
- [ ] Add indexes for efficient querying
- [ ] Implement CRUD operations
- [ ] Add transaction support

### Service Worker

- [ ] Implement sync worker
- [ ] Add background sync registration
- [ ] Implement exponential backoff
- [ ] Add conflict detection logic
- [ ] Add periodic sync (every 5 minutes when online)

### API Endpoints

- [ ] `POST /api/sessions` - Create session
- [ ] `GET /api/sessions/:id` - Get session
- [ ] `PATCH /api/sessions/:id` - Update session
- [ ] `DELETE /api/sessions/:id` - Delete session
- [ ] `POST /api/sessions/:id/find-logs` - Add FindLog
- [ ] `PATCH /api/find-logs/:id` - Update FindLog
- [ ] `DELETE /api/find-logs/:id` - Delete FindLog
- [ ] `POST /api/sync/events` - Batch sync events
- [ ] `GET /api/sessions/:id/events` - Get event log

### UI Components

- [ ] Session creation form
- [ ] Session list view
- [ ] Session detail view
- [ ] FindLog entry form
- [ ] Session map view (with track)
- [ ] Conflict resolution dialog
- [ ] Sync status indicator
- [ ] Analytics/reporting dashboard

### Testing

- [ ] Run unit tests: `npm test field-session-schema.test.ts`
- [ ] Integration tests for API
- [ ] E2E tests for offline scenarios
- [ ] Load tests for sync queue

---

## 📚 Documentation Files

1. **field-session-schema.ts** - TypeScript implementation
2. **field-session-schema.test.ts** - Comprehensive test suite
3. **field-session-architecture.md** - Full technical documentation
4. **field-session-quick-reference.md** - Developer quick-start
5. **20260123000001_create_field_sessions.sql** - Database migration

---

## 🎉 Summary

This implementation provides:

✅ **Complete TypeScript schema** with interfaces, enums, and validation  
✅ **51 comprehensive tests** covering all business logic  
✅ **Database migration** with tables, triggers, RLS, and indexes  
✅ **Event sourcing** for complete audit trail  
✅ **Offline-first** with sync queue integration  
✅ **Deterministic aggregation** from FindLog to Session  
✅ **Conflict resolution** with multiple strategies  
✅ **State machine** with validated transitions  
✅ **Priority-based sync** with exponential backoff  
✅ **Full documentation** with examples and guides

The schema is production-ready and follows best practices for offline-first applications with eventual consistency guarantees.

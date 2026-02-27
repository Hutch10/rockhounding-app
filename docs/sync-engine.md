# Rockhound Sync Engine

Complete offline-first sync engine with deterministic conflict resolution, priority-based queues, and multi-entity dependency management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Sync Protocol](#sync-protocol)
- [Conflict Resolution](#conflict-resolution)
- [Setup & Integration](#setup--integration)
- [Entity Types](#entity-types)
- [Priority System](#priority-system)
- [Dependency Graph](#dependency-graph)
- [Retry Logic](#retry-logic)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

The Rockhound Sync Engine provides a robust, offline-first synchronization system that:

- **Offline-First**: Queue operations locally, sync when online
- **Deterministic**: Predictable conflict resolution with multiple strategies
- **Priority-Based**: Critical operations sync first
- **Dependency-Aware**: Respects entity relationships
- **Resilient**: Exponential backoff with retry logic
- **Verifiable**: Integrity checks and replay protection

### Key Features

| Feature                    | Description                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **Offline Queuing**        | IndexedDB-backed queue with 7-day TTL                                                |
| **Batch Processing**       | Groups up to 50 operations per batch                                                 |
| **Exponential Backoff**    | 1s → 2s → 4s → 8s → 16s → 60s max                                                    |
| **Conflict Detection**     | Automatic version-based conflict detection                                           |
| **Conflict Resolution**    | 6 strategies: client_wins, server_wins, manual, merge, latest_timestamp, field_level |
| **Priority Queues**        | 5 levels: critical, high, normal, low, background                                    |
| **Dependency Graph**       | Ensures parent entities sync before children                                         |
| **Integrity Verification** | Checksum validation for data consistency                                             |
| **Replay Protection**      | Idempotency keys prevent duplicate operations                                        |
| **Telemetry Integration**  | Automatic event tracking for monitoring                                              |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
├─────────────────────────────────────────────────────────────┤
│  React Hooks (useSync, useSyncState, useSyncQueue, etc.)   │
├─────────────────────────────────────────────────────────────┤
│            Sync Coordinator (SyncCoordinator)                │
│  • Queue Management     • Batch Creation                     │
│  • Network Detection    • Retry Logic                        │
│  • Dependency Resolution • Telemetry                         │
├─────────────────────────────────────────────────────────────┤
│             IndexedDB (rockhound-sync)                       │
│  • operations store     • batches store                      │
│  • state store          • idempotency store                  │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
                         HTTP (JSON)
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                     Sync API Endpoint                        │
│                   /api/sync/batch (POST)                     │
├─────────────────────────────────────────────────────────────┤
│                    Supabase PostgreSQL                       │
│  • sync_queue           • sync_conflicts                     │
│  • sync_batches         • sync_state                         │
│  • sync_history         • sync_metrics                       │
│  • sync_idempotency_keys                                     │
└─────────────────────────────────────────────────────────────┘
```

## Sync Protocol

### Lifecycle

```
┌──────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Create  │ ──→ │ Pending │ ──→ │ Syncing │ ──→ │ Success │
│  Local   │     │  Queue  │     │  Batch  │     │ Remove  │
└──────────┘     └─────────┘     └─────────┘     └─────────┘
                      │                │
                      ↓                ↓
                 ┌─────────┐     ┌──────────┐
                 │  Retry  │ ←── │  Error   │
                 │ (Backoff)│    │(Max:5x)  │
                 └─────────┘     └──────────┘
                      │                │
                      ↓                ↓
                 ┌──────────┐    ┌──────────┐
                 │ Conflict │    │ Cancelled│
                 │  Manual  │    │  Remove  │
                 └──────────┘    └──────────┘
```

### Operation Phases

#### 1. Enqueue Phase

```typescript
const syncId = await coordinator.enqueue(
  'specimen', // entity type
  specimen.id, // entity ID
  'update', // operation
  originalSpecimen, // original state
  modifiedSpecimen, // new state
  'normal' // priority
);
```

**Steps:**

1. Compute delta (changed fields only)
2. Generate checksum for integrity
3. Assign priority based on entity type
4. Check idempotency (prevent duplicates)
5. Persist to IndexedDB
6. Trigger sync if online

#### 2. Batch Creation Phase

```typescript
// Coordinator automatically creates batches
const batches = createBatches(pendingOperations);

// Each batch contains:
{
  batch_id: UUID,
  operations: Operation[], // Max 50
  priority: 'high',
  batch_checksum: string,
  total_operations: 50
}
```

**Batching Rules:**

- Max 50 operations per batch
- Operations sorted by priority
- Dependencies resolved
- Same-entity operations grouped

#### 3. Sync Phase

```typescript
// Send batch to server
POST /api/sync/batch
{
  batch_id: "uuid",
  user_id: "uuid",
  device_id: "uuid",
  operations: [...],
  batch_checksum: "abc123"
}

// Server responds
{
  success: true,
  batch_id: "uuid",
  results: [
    { sync_id: "uuid-1", status: "success", server_version: 5 },
    { sync_id: "uuid-2", status: "conflict", conflict_id: "uuid" },
    { sync_id: "uuid-3", status: "error", error_message: "..." }
  ]
}
```

#### 4. Result Processing Phase

```typescript
// For each operation result:
if (status === 'success') {
  // Remove from queue
  // Add to idempotency cache
  // Update metrics
}

if (status === 'conflict') {
  // Mark as conflict
  // Create conflict record
  // Wait for manual resolution
}

if (status === 'error') {
  // Increment retry_count
  // Calculate next_retry_at (exponential backoff)
  // Mark as 'retry' or 'error' (if max retries)
}
```

## Conflict Resolution

### Conflict Detection

Conflicts occur when:

- Client version ≠ Server version
- Field values differ between client and server
- Concurrent modifications to same entity

```typescript
// Automatic detection
const conflicts = detectConflicts(
  clientData,
  serverData,
  clientVersion, // e.g., 3
  serverVersion // e.g., 4 (conflict!)
);
// Returns: ['name', 'location', 'description']
```

### Resolution Strategies

#### 1. Client Wins (`client_wins`)

Client version completely overwrites server version.

```typescript
await resolveWithStrategy('client_wins', userId);
// Result: client data saved, server data discarded
```

**Use Case:** User explicitly wants their local changes to override server.

#### 2. Server Wins (`server_wins`)

Server version completely overwrites client version.

```typescript
await resolveWithStrategy('server_wins', userId);
// Result: server data kept, client data discarded
```

**Use Case:** Server has authoritative data (e.g., admin changes).

#### 3. Latest Timestamp (`latest_timestamp`)

Use data with most recent `updated_at` timestamp.

```typescript
await resolveWithStrategy('latest_timestamp', userId);

// Compares:
clientTime = new Date(clientData.updated_at); // 2026-01-23T10:30:00Z
serverTime = new Date(serverData.updated_at); // 2026-01-23T10:25:00Z

// Result: Client wins (newer timestamp)
```

**Use Case:** Default strategy for most conflicts.

#### 4. Field-Level Merge (`field_level`)

Merge at individual field level using per-field timestamps.

```typescript
await resolveWithStrategy('field_level', userId);

// For each conflicting field:
// - Compare field-specific timestamps (if available)
// - Fall back to entity timestamp
// - Select newer value

// Example:
clientData = {
  name: 'Quartz Crystal',
  name_updated_at: '2026-01-23T10:30:00Z',
  location: 'Cabinet A',
  location_updated_at: '2026-01-23T09:00:00Z',
};

serverData = {
  name: 'Clear Quartz',
  name_updated_at: '2026-01-23T10:00:00Z',
  location: 'Cabinet B',
  location_updated_at: '2026-01-23T10:15:00Z',
};

// Result:
resolved = {
  name: 'Quartz Crystal', // Client wins (newer)
  location: 'Cabinet B', // Server wins (newer)
};
```

**Use Case:** Complex entities with many independent fields.

#### 5. Merge (`merge`)

Attempt automatic merge of non-conflicting fields.

```typescript
await resolveWithStrategy('merge', userId);

// Combines both versions, client overwrites server for conflicts
resolved = { ...serverData, ...clientData };
```

**Use Case:** Simple entities where client changes should be additive.

#### 6. Manual (`manual`)

Require user intervention to resolve conflict.

```typescript
// Presents both versions to user
const { resolveManually } = useConflictResolution(conflictId);

// User makes selection
await resolveManually(
  {
    name: 'User Selected Name',
    location: 'User Selected Location',
    description: 'User Selected Description',
  },
  userId
);
```

**Use Case:** Critical data where automated resolution is risky.

### Conflict Resolution UI

```typescript
import { useSyncConflicts, useConflictResolution } from '@/app/hooks/useSync';

function ConflictResolver({ userId }: { userId: string }) {
  const { data: conflicts } = useSyncConflicts(userId, false);
  const { resolveWithStrategy, resolveManually } = useConflictResolution(conflicts[0]?.conflict_id);

  return (
    <div>
      {conflicts?.map(conflict => (
        <div key={conflict.conflict_id}>
          <h3>Conflict in {conflict.entity_type}</h3>

          <div>
            <h4>Client Version</h4>
            <pre>{JSON.stringify(conflict.client_data, null, 2)}</pre>
          </div>

          <div>
            <h4>Server Version</h4>
            <pre>{JSON.stringify(conflict.server_data, null, 2)}</pre>
          </div>

          <div>
            <button onClick={() => resolveWithStrategy('client_wins', userId)}>
              Use My Version
            </button>
            <button onClick={() => resolveWithStrategy('server_wins', userId)}>
              Use Server Version
            </button>
            <button onClick={() => resolveWithStrategy('latest_timestamp', userId)}>
              Use Latest
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Setup & Integration

### 1. Install Dependencies

```bash
cd apps/web
pnpm add idb
```

### 2. Run Database Migration

```bash
supabase db push
# Or manually apply: supabase/migrations/20260123000002_create_sync_engine.sql
```

### 3. Initialize Sync Coordinator

```typescript
// apps/web/app/layout.tsx or similar
import { initSync } from '@/lib/sync/coordinator';
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.Node }) {
  useEffect(() => {
    // Initialize sync on app load
    const sync = initSync({
      api_endpoint: '/api/sync',
      batch_size: 50,
      batch_timeout_ms: 5000,
      enable_auto_sync: true,
      auto_sync_interval_ms: 60000, // Sync every minute
    });

    // Set user ID when authenticated
    const user = getCurrentUser(); // Your auth logic
    if (user) {
      sync.setUserId(user.id);
    }

    return () => {
      sync.destroy();
    };
  }, []);

  return <html>{children}</html>;
}
```

### 4. Create Sync API Endpoint

```typescript
// apps/web/app/api/sync/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SyncBatchSchema } from '@rockhound/shared';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate batch
  const body = await request.json();
  const validation = SyncBatchSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid batch', details: validation.error },
      { status: 400 }
    );
  }

  const batch = validation.data;
  const results = [];

  // Process each operation in batch
  for (const operation of batch.operations) {
    try {
      // Apply operation to database
      const result = await applyOperation(supabase, operation);
      results.push(result);
    } catch (error) {
      results.push({
        sync_id: operation.sync_id,
        status: 'error',
        error_message: error.message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    batch_id: batch.batch_id,
    results,
  });
}

async function applyOperation(supabase: any, operation: any) {
  // Your operation application logic
  // This varies by entity type

  const table = getTableName(operation.entity_type);

  if (operation.operation_type === 'create') {
    const { data, error } = await supabase.from(table).insert(operation.full_entity).single();

    if (error) throw error;

    return {
      sync_id: operation.sync_id,
      status: 'success',
      server_version: data.version,
    };
  }

  if (operation.operation_type === 'update') {
    // Check for conflicts
    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .eq('id', operation.entity_id)
      .single();

    if (existing && existing.version !== operation.client_version) {
      // Conflict detected
      return {
        sync_id: operation.sync_id,
        status: 'conflict',
        conflict_id: await createConflict(supabase, operation, existing),
      };
    }

    // Apply delta
    const { data, error } = await supabase
      .from(table)
      .update({
        ...operation.delta,
        version: existing.version + 1,
      })
      .eq('id', operation.entity_id)
      .single();

    if (error) throw error;

    return {
      sync_id: operation.sync_id,
      status: 'success',
      server_version: data.version,
    };
  }

  // Handle delete...
}
```

## Entity Types

| Entity Type         | Priority   | Can Batch | Requires Online | Dependencies                        |
| ------------------- | ---------- | --------- | --------------- | ----------------------------------- |
| `field_session`     | High       | Yes       | Yes             | None → find_log, capture_session    |
| `find_log`          | High       | Yes       | Yes             | field_session → specimen            |
| `specimen`          | Normal     | Yes       | Yes             | None                                |
| `capture_session`   | High       | Yes       | Yes             | field_session → raw_capture         |
| `raw_capture`       | Normal     | Yes       | No              | capture_session → processed_capture |
| `processed_capture` | Normal     | Yes       | No              | raw_capture → specimen              |
| `storage_location`  | Normal     | Yes       | Yes             | None → specimen                     |
| `collection_group`  | Normal     | Yes       | Yes             | None                                |
| `tag`               | Low        | Yes       | Yes             | None                                |
| `export_job`        | Low        | No        | Yes             | None                                |
| `analytics_cache`   | Background | Yes       | No              | None                                |

## Priority System

Priority determines sync order:

```typescript
enum SyncPriority {
  critical = 0, // User-initiated blocking operations (deletes)
  high = 1, // Field data (sessions, finds, captures)
  normal = 2, // Collection management (specimens, locations)
  low = 3, // Non-critical (tags, exports)
  background = 4, // Derived data (analytics)
}
```

### Priority Assignment

```typescript
function getSyncPriority(
  entityType: SyncEntityType,
  operationType: SyncOperationType
): SyncPriority {
  // Deletes are always critical
  if (operationType === 'delete') return 'critical';

  // Field data is high priority
  if (
    entityType === 'field_session' ||
    entityType === 'find_log' ||
    entityType === 'capture_session'
  ) {
    return 'high';
  }

  // Collection management is normal
  if (entityType === 'specimen' || entityType === 'storage_location') {
    return 'normal';
  }

  // Analytics is background
  if (entityType === 'analytics_cache') return 'background';

  return 'normal';
}
```

## Dependency Graph

Entities have parent/child relationships that affect sync order:

```
field_session
  ├─→ find_log
  │     └─→ specimen
  └─→ capture_session
        └─→ raw_capture
              └─→ processed_capture
                    └─→ specimen

storage_location
  └─→ specimen
```

### Dependency Rules

1. **Parent First**: Parent entities must sync before children
2. **Child After**: Child entities sync after their parents
3. **Circular Check**: No circular dependencies allowed
4. **Orphan Prevention**: Children without synced parents are held

### Example

```typescript
// If you create a find_log with field_session_id
const findLog = {
  id: 'find-123',
  field_session_id: 'session-456',
  // ...
};

// The sync engine ensures:
// 1. field_session 'session-456' syncs first
// 2. Then find_log 'find-123' syncs
```

## Retry Logic

### Exponential Backoff

```typescript
const config: BackoffConfig = {
  initial_delay_ms: 1000, // Start at 1 second
  max_delay_ms: 60000, // Cap at 60 seconds
  multiplier: 2, // Double each time
  jitter: true, // Add randomness ±25%
};

// Retry schedule:
// Attempt 1: 1s    (±250ms)
// Attempt 2: 2s    (±500ms)
// Attempt 3: 4s    (±1s)
// Attempt 4: 8s    (±2s)
// Attempt 5: 16s   (±4s)
// Attempt 6: 32s   (±8s)
// Attempt 7+: 60s  (±15s) [max]
```

### Max Retries

```typescript
const operation = {
  retry_count: 0,
  max_retries: 5, // Give up after 5 failed attempts
  // ...
};

// If retry_count reaches max_retries:
// - Status changes from 'retry' to 'error'
// - Manual intervention required
```

### Retry Triggers

- **Automatic**: Network errors, timeouts, 5xx server errors
- **Manual**: User clicks "Retry" button in UI

## API Reference

### SyncCoordinator

```typescript
class SyncCoordinator {
  constructor(config?: Partial<SyncCoordinatorConfig>);

  setUserId(userId: string): void;

  enqueue<T>(
    entityType: SyncEntityType,
    entityId: string,
    operationType: SyncOperationType,
    original: T | null,
    modified: T,
    priority?: SyncPriority
  ): Promise<string>;

  sync(): Promise<void>;
  cancel(syncId: string): Promise<void>;
  retry(syncId: string): Promise<void>;
  getState(): Promise<SyncState>;
  getMetrics(): SyncMetrics;
  destroy(): Promise<void>;
}

// Usage
const coordinator = initSync(config);
coordinator.setUserId('user-123');

const syncId = await coordinator.enqueue(
  'specimen',
  specimen.id,
  'update',
  originalSpecimen,
  modifiedSpecimen
);
```

### React Hooks

#### useSync

```typescript
const {
  sync, // Trigger manual sync
  enqueue, // Add operation to queue
  cancel, // Cancel pending operation
  retry, // Retry failed operation
  coordinator, // Access coordinator instance
} = useSync({
  autoSync: true, // Auto-sync enabled
  syncInterval: 60000, // Sync every 60 seconds
});
```

#### useSyncState

```typescript
const { data: state, isLoading } = useSyncState(userId);

// state: {
//   is_syncing: boolean,
//   is_online: boolean,
//   pending_count: number,
//   conflict_count: number,
//   error_count: number,
//   last_sync_at: string | null,
//   connection_quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline',
// }
```

#### useSyncQueue

```typescript
const { data: operations } = useSyncQueue(userId, {
  status: ['pending', 'retry'],
  entity_type: ['specimen', 'find_log'],
  priority: ['high', 'critical'],
});
```

#### useSyncConflicts

```typescript
const { data: conflicts } = useSyncConflicts(userId, false); // false = unresolved

conflicts?.map(conflict => ({
  conflict_id: string,
  entity_type: SyncEntityType,
  client_data: any,
  server_data: any,
  conflicting_fields: string[],
  detected_at: string,
}));
```

#### useConflictResolution

```typescript
const { resolveWithStrategy, resolveManually } = useConflictResolution(conflictId);

// Automatic resolution
await resolveWithStrategy('latest_timestamp', userId);

// Manual resolution
await resolveManually(mergedData, userId);
```

### Integration Functions

```typescript
import {
  syncFieldSession,
  syncFindLog,
  syncSpecimen,
  syncCaptureSession,
  trackSyncOperation,
} from '@/lib/sync/integrations';

// Sync a field session
await syncFieldSession('update', original, modified);

// Sync with telemetry tracking
await trackSyncOperation('specimen', 'create', async () => {
  return await syncSpecimen('create', null, newSpecimen);
});
```

## Examples

### Example 1: Sync Specimen Update

```typescript
import { useEntitySync } from '@/app/hooks/useSync';

function SpecimenEditor({ specimen }: { specimen: Specimen }) {
  const { syncUpdate, isSyncing } = useEntitySync('specimen', specimen.id, specimen);
  const [formData, setFormData] = useState(specimen);

  const handleSave = async () => {
    // Save locally first
    await saveToLocalDB(formData);

    // Queue sync operation
    await syncUpdate(specimen, formData);

    // UI updates automatically when sync completes
  };

  return (
    <form onSubmit={handleSave}>
      {/* Form fields */}
      <button disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Save'}
      </button>
    </form>
  );
}
```

### Example 2: Batch Sync Field Session

```typescript
import { useBatchSync } from '@/app/hooks/useSync';

function FieldSessionCompleter({ session }: { session: FieldSession }) {
  const { syncBatch, isSyncing } = useBatchSync();

  const completeSession = async () => {
    // Prepare all related entities
    const operations = [
      // Update session status
      {
        entityType: 'field_session',
        entityId: session.id,
        operationType: 'update',
        original: session,
        modified: { ...session, status: 'completed', end_time: new Date().toISOString() },
        priority: 'high',
      },
      // Sync all find logs
      ...session.find_logs.map(log => ({
        entityType: 'find_log',
        entityId: log.id,
        operationType: 'update',
        original: log,
        modified: log,
        priority: 'high',
      })),
      // Sync all captures
      ...session.captures.map(capture => ({
        entityType: 'capture_session',
        entityId: capture.id,
        operationType: 'update',
        original: capture,
        modified: capture,
        priority: 'high',
      })),
    ];

    // Sync everything in one batch
    await syncBatch(operations);
  };

  return (
    <button onClick={completeSession} disabled={isSyncing}>
      {isSyncing ? 'Completing...' : 'Complete Session'}
    </button>
  );
}
```

### Example 3: Sync Status Monitor

```typescript
import { useSyncMonitor } from '@/app/hooks/useSync';

function SyncStatusIndicator({ userId }: { userId: string }) {
  const monitor = useSyncMonitor(userId);

  return (
    <div className="sync-status">
      {/* Online/Offline Badge */}
      <div className={monitor.isOnline ? 'online' : 'offline'}>
        {monitor.isOnline ? '● Online' : '○ Offline'}
      </div>

      {/* Sync Status */}
      {monitor.isSyncing && (
        <div className="syncing">
          <Spinner /> Syncing...
        </div>
      )}

      {/* Pending Count */}
      {monitor.pendingCount > 0 && (
        <div className="pending">
          {monitor.pendingCount} pending
        </div>
      )}

      {/* Conflicts */}
      {monitor.conflictCount > 0 && (
        <div className="conflicts">
          ⚠ {monitor.conflictCount} conflicts
        </div>
      )}

      {/* Errors */}
      {monitor.errorCount > 0 && (
        <div className="errors">
          ✗ {monitor.errorCount} errors
        </div>
      )}

      {/* Connection Quality */}
      <div className={`quality-${monitor.connectionQuality}`}>
        {monitor.connectionQuality}
      </div>

      {/* Last Sync */}
      {monitor.lastSyncAt && (
        <div className="last-sync">
          Last: {formatDistanceToNow(new Date(monitor.lastSyncAt))} ago
        </div>
      )}
    </div>
  );
}
```

### Example 4: Handle Conflicts

```typescript
import { useSyncConflicts, useConflictResolution } from '@/app/hooks/useSync';

function ConflictsList({ userId }: { userId: string }) {
  const { data: conflicts } = useSyncConflicts(userId, false);

  return (
    <div>
      {conflicts?.map(conflict => (
        <ConflictCard key={conflict.conflict_id} conflict={conflict} userId={userId} />
      ))}
    </div>
  );
}

function ConflictCard({ conflict, userId }) {
  const { resolveWithStrategy, resolveManually } = useConflictResolution(conflict.conflict_id);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [resolved, setResolved] = useState(conflict.resolved_data || conflict.server_data);

  const handleAutoResolve = async (strategy: ConflictResolutionStrategy) => {
    await resolveWithStrategy(strategy, userId);
  };

  const handleManualResolve = async () => {
    await resolveManually(resolved, userId);
  };

  return (
    <div className="conflict-card">
      <h3>Conflict in {conflict.entity_type}</h3>
      <p>Conflicting fields: {conflict.conflicting_fields.join(', ')}</p>

      {mode === 'auto' ? (
        <div>
          <button onClick={() => handleAutoResolve('client_wins')}>
            Use My Version
          </button>
          <button onClick={() => handleAutoResolve('server_wins')}>
            Use Server Version
          </button>
          <button onClick={() => handleAutoResolve('latest_timestamp')}>
            Use Latest
          </button>
          <button onClick={() => setMode('manual')}>
            Resolve Manually
          </button>
        </div>
      ) : (
        <div>
          {/* Show merge UI */}
          {conflict.conflicting_fields.map(field => (
            <FieldMerger
              key={field}
              field={field}
              clientValue={conflict.client_data[field]}
              serverValue={conflict.server_data[field]}
              onChange={(value) => setResolved({ ...resolved, [field]: value })}
            />
          ))}
          <button onClick={handleManualResolve}>
            Save Resolution
          </button>
          <button onClick={() => setMode('auto')}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Operations Not Syncing

**Symptoms:** Operations stay in "pending" status indefinitely.

**Possible Causes:**

1. Device is offline
2. Sync coordinator not initialized
3. User ID not set
4. Network errors

**Solutions:**

```typescript
// Check sync state
const state = await coordinator.getState();
console.log('Online:', state.is_online);
console.log('Syncing:', state.is_syncing);
console.log('Pending:', state.pending_count);

// Check user ID
console.log('User ID set:', coordinator.userId);

// Force sync
await coordinator.sync();

// Check IndexedDB
const db = await openDB('rockhound-sync');
const operations = await db.getAll('operations');
console.log('Queued operations:', operations);
```

### High Conflict Rate

**Symptoms:** Many operations end up in "conflict" status.

**Possible Causes:**

1. Multiple devices syncing same data
2. Long offline periods
3. Concurrent editing

**Solutions:**

```typescript
// Increase sync frequency
initSync({
  auto_sync_interval_ms: 30000, // Sync every 30 seconds
});

// Use field-level resolution
initSync({
  default_conflict_strategy: 'field_level',
});

// Implement optimistic locking
const specimen = {
  ...data,
  version: currentVersion,
  updated_at: new Date().toISOString(),
};
```

### Sync Takes Too Long

**Symptoms:** Sync operations taking >5 seconds.

**Possible Causes:**

1. Large batch sizes
2. Slow network
3. Many retries

**Solutions:**

```typescript
// Reduce batch size
initSync({
  batch_size: 25, // Smaller batches
});

// Adjust priorities
await coordinator.enqueue(
  'specimen',
  id,
  'update',
  original,
  modified,
  'background' // Lower priority
);

// Check metrics
const metrics = coordinator.getMetrics();
console.log('Avg sync time:', metrics.avgSyncTime);
console.log('Failed operations:', metrics.failedOperations);
```

### Memory Issues

**Symptoms:** Browser becomes slow, high memory usage.

**Possible Causes:**

1. Too many queued operations
2. Large entity payloads
3. IndexedDB not cleaning up

**Solutions:**

```typescript
// Reduce queue size
initSync({
  max_queue_size: 1000, // Limit queue
});

// Clean up old operations
const db = await openDB('rockhound-sync');
await db.clear('operations');
await db.clear('batches');

// Use delta computation
// Instead of storing full entities, store only changed fields
```

### Idempotency Issues

**Symptoms:** Operations processed multiple times.

**Possible Causes:**

1. Idempotency keys not persisted
2. Keys expired
3. Keys cleared

**Solutions:**

```typescript
// Check idempotency cache
const db = await openDB('rockhound-sync');
const keys = await db.getAll('idempotency');
console.log('Cached keys:', keys.length);

// Manually add to cache
await db.put('idempotency', {
  idempotency_key: generateIdempotencyKey(operation),
  sync_id: operation.sync_id,
  processed_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});
```

## Best Practices

1. **Always Use Versioning**: Include a `version` field in all entities
2. **Compute Deltas**: Only sync changed fields to reduce bandwidth
3. **Set Priorities**: Use appropriate priorities for different entity types
4. **Handle Conflicts**: Implement conflict resolution UI for critical data
5. **Monitor Sync State**: Show sync status in UI
6. **Test Offline**: Regularly test offline → online transition
7. **Validate Data**: Use Zod schemas to validate before enqueueing
8. **Track Telemetry**: Monitor sync performance and error rates
9. **Clean Up**: Periodically remove old completed operations
10. **Document Dependencies**: Clearly define entity relationships

## Performance Characteristics

| Metric             | Target     | Notes                 |
| ------------------ | ---------- | --------------------- |
| Enqueue Latency    | <10ms      | Local IndexedDB write |
| Batch Creation     | <50ms      | For 50 operations     |
| Sync Latency       | <500ms     | Network dependent     |
| Conflict Detection | <20ms      | Per operation         |
| Retry Delay        | 1s-60s     | Exponential backoff   |
| Queue Capacity     | 10,000 ops | Configurable          |
| Batch Size         | 50 ops     | Configurable          |
| Auto-Sync Interval | 60s        | Configurable          |

## Next Steps

1. **Implement Sync API**: Create `/api/sync/batch` endpoint
2. **Add Conflict UI**: Build conflict resolution interface
3. **Test Offline**: Test sync with airplane mode
4. **Monitor Production**: Track sync metrics in production
5. **Optimize Queries**: Add indexes for common queries
6. **Document Integration**: Add sync to each entity type

# Rockhound Sync Engine - Quick Start

Complete offline-first sync system with conflict resolution, priority queues, and automatic retry logic.

## Installation

### 1. Install Dependencies

```bash
cd apps/web
pnpm add idb
```

### 2. Run Database Migration

```bash
supabase db push
```

Or manually apply:

```bash
psql -f supabase/migrations/20260123000002_create_sync_engine.sql
```

### 3. Export Sync Types

Sync types are already exported from `@rockhound/shared` package.

## Quick Start

### Initialize Sync Engine

```typescript
// apps/web/app/layout.tsx
import { initSync } from '@/lib/sync/coordinator';
import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize sync coordinator
    const sync = initSync({
      api_endpoint: '/api/sync',
      batch_size: 50,
      enable_auto_sync: true,
      auto_sync_interval_ms: 60000, // 1 minute
    });

    // Set user ID when authenticated
    const user = getCurrentUser();
    if (user) {
      sync.setUserId(user.id);
    }

    return () => sync.destroy();
  }, []);

  return <html>{children}</html>;
}
```

### Sync a Specimen

```typescript
import { useEntitySync } from '@/app/hooks/useSync';

function SpecimenEditor({ specimen }) {
  const { syncUpdate, isSyncing } = useEntitySync(
    'specimen',
    specimen.id,
    specimen
  );

  const handleSave = async (formData) => {
    // Queue sync operation
    await syncUpdate(specimen, formData);
    // Syncs automatically when online
  };

  return (
    <button onClick={() => handleSave(formData)} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Save'}
    </button>
  );
}
```

### Monitor Sync Status

```typescript
import { useSyncMonitor } from '@/app/hooks/useSync';

function SyncStatus({ userId }) {
  const monitor = useSyncMonitor(userId);

  return (
    <div>
      <div className={monitor.isOnline ? 'online' : 'offline'}>
        {monitor.isOnline ? '● Online' : '○ Offline'}
      </div>

      {monitor.pendingCount > 0 && (
        <div>{monitor.pendingCount} pending</div>
      )}

      {monitor.conflictCount > 0 && (
        <div>⚠ {monitor.conflictCount} conflicts</div>
      )}
    </div>
  );
}
```

### Handle Conflicts

```typescript
import { useSyncConflicts, useConflictResolution } from '@/app/hooks/useSync';

function ConflictResolver({ userId }) {
  const { data: conflicts } = useSyncConflicts(userId, false);
  const { resolveWithStrategy } = useConflictResolution(
    conflicts?.[0]?.conflict_id
  );

  return (
    <div>
      {conflicts?.map(conflict => (
        <div key={conflict.conflict_id}>
          <h3>Conflict in {conflict.entity_type}</h3>
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
      ))}
    </div>
  );
}
```

## Configuration Options

### Development

```typescript
initSync({
  api_endpoint: '/api/sync',
  batch_size: 25, // Smaller batches
  batch_timeout_ms: 2000, // Faster batching
  enable_auto_sync: true,
  auto_sync_interval_ms: 30000, // Sync every 30s
  max_retries: 3,
  backoff: {
    initial_delay_ms: 500,
    max_delay_ms: 10000,
    multiplier: 2,
    jitter: true,
  },
});
```

### Production

```typescript
initSync({
  api_endpoint: '/api/sync',
  batch_size: 50,
  batch_timeout_ms: 5000,
  enable_auto_sync: true,
  auto_sync_interval_ms: 60000, // Sync every 1min
  max_retries: 5,
  backoff: {
    initial_delay_ms: 1000,
    max_delay_ms: 60000,
    multiplier: 2,
    jitter: true,
  },
  enable_telemetry: true,
});
```

### Offline-Heavy Use

```typescript
initSync({
  api_endpoint: '/api/sync',
  batch_size: 100, // Larger batches
  max_queue_size: 10000, // More queued operations
  queue_ttl_ms: 14 * 24 * 60 * 60 * 1000, // 14 days
  persist_queue: true,
  enable_auto_sync: true,
  auto_sync_interval_ms: 120000, // Sync every 2min
});
```

## Entity Types

### Supported Entities

- `field_session` - Field sessions (High priority)
- `find_log` - Find logs (High priority)
- `specimen` - Specimens (Normal priority)
- `capture_session` - Capture sessions (High priority)
- `raw_capture` - Raw captures (Normal priority)
- `processed_capture` - Processed captures (Normal priority)
- `storage_location` - Storage locations (Normal priority)
- `collection_group` - Collection groups (Normal priority)
- `tag` - Tags (Low priority)
- `export_job` - Export jobs (Low priority)
- `analytics_cache` - Analytics cache (Background priority)

### Integration Examples

#### Field Session

```typescript
import { syncFieldSession } from '@/lib/sync/integrations';

await syncFieldSession('create', null, newSession);
await syncFieldSession('update', originalSession, modifiedSession);
await syncFieldSession('delete', sessionToDelete, sessionToDelete);
```

#### Find Log

```typescript
import { syncFindLog } from '@/lib/sync/integrations';

await syncFindLog('create', null, newFindLog);
```

#### Batch Operations

```typescript
import { syncMixedBatch } from '@/lib/sync/integrations';

await syncMixedBatch([
  {
    entityType: 'field_session',
    entityId: session.id,
    operation: 'update',
    original: session,
    modified: { ...session, status: 'completed' },
    priority: 'high',
  },
  {
    entityType: 'find_log',
    entityId: log.id,
    operation: 'create',
    original: null,
    modified: newLog,
    priority: 'high',
  },
]);
```

## Verification

### Check IndexedDB

1. Open DevTools → Application → IndexedDB
2. Find `rockhound-sync` database
3. Check `operations` store for queued operations
4. Check `batches` store for sent batches

### Check Database

```sql
-- Check sync queue
SELECT * FROM sync_queue WHERE user_id = '<your-user-id>';

-- Check sync state
SELECT * FROM sync_state WHERE user_id = '<your-user-id>';

-- Check conflicts
SELECT * FROM sync_conflicts WHERE NOT resolved;

-- Check sync history
SELECT * FROM sync_history
WHERE user_id = '<your-user-id>'
ORDER BY completed_at DESC
LIMIT 10;
```

### Check Telemetry

```typescript
// Sync events are automatically tracked
// View in /dashboard/telemetry

// Look for events:
// - sync_operation_start
// - sync_operation_success
// - sync_operation_error
// - sync_batch_success
// - sync_batch_error
```

## Troubleshooting

### Operations Not Syncing

```typescript
// Check sync state
const sync = getSync();
const state = await sync.getState();
console.log('State:', state);

// Force sync
await sync.sync();
```

### Clear Queue

```typescript
// Clear all pending operations (use with caution!)
const db = await openDB('rockhound-sync');
await db.clear('operations');
```

### Reset Sync

```typescript
// Complete reset
const db = await openDB('rockhound-sync');
await db.clear('operations');
await db.clear('batches');
await db.clear('idempotency');

// Reinitialize
const sync = initSync();
sync.setUserId(userId);
```

## Next Steps

1. **Read Full Documentation**: See [docs/sync-engine.md](../docs/sync-engine.md)
2. **Implement Conflict UI**: Build user-friendly conflict resolution
3. **Test Offline**: Test airplane mode thoroughly
4. **Monitor Metrics**: Track sync performance in production
5. **Optimize**: Adjust batch sizes and intervals based on usage

## Key Features

✅ **Offline-First**: Works without network  
✅ **Automatic Sync**: Syncs in background  
✅ **Conflict Resolution**: 6 resolution strategies  
✅ **Priority Queues**: Critical operations first  
✅ **Retry Logic**: Exponential backoff  
✅ **Integrity Checks**: Checksum validation  
✅ **Replay Protection**: Idempotency keys  
✅ **Telemetry**: Automatic monitoring

## Support

For issues or questions, see [docs/sync-engine.md](../docs/sync-engine.md#troubleshooting) for detailed troubleshooting.

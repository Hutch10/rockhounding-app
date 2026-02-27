#!/usr/bin/env bash

# FieldSession Subsystem - Quick Start Guide for Developers

cat > FieldSession_QuickStart.md << 'EOF'

# FieldSession Subsystem - Developer Quick Start

## Setup

### 1. Initialize the Provider

```typescript
import { SessionProvider } from '@/app/hooks/useFieldSession';
import { storageManager } from '@/lib/storage/manager';
import { syncEngine } from '@/lib/sync/engine';
import { telemetry } from '@/lib/telemetry/tracker';

function App() {
  return (
    <SessionProvider
      userId={currentUser.id}
      storageManager={storageManager}
      syncEngine={syncEngine}
      telemetryTracker={telemetry}
    >
      <YourAppContent />
    </SessionProvider>
  );
}
```

### 2. Verify Database Migration

```bash
# Apply migrations
supabase migration up 20260125000009_create_field_sessions

# Verify table creation
psql "postgresql://..." -c "SELECT COUNT(*) FROM field_sessions;"
```

## Common Tasks

### Creating a Session

```typescript
import { useCreateSession } from '@/app/hooks/useFieldSession';

function SessionForm() {
  const createSession = useCreateSession();

  const handleCreate = async () => {
    const session = await createSession.mutateAsync({
      title: 'Morning Hunt',
      description: 'Looking for quartz specimens',
      location_name: 'Crystal Ridge',
      geology_type: 'Quartz Vein',
      tags: ['quartz', 'minerals'],
    });

    console.log('Session created:', session.id);
  };

  return (
    <button onClick={handleCreate} disabled={createSession.isPending}>
      {createSession.isPending ? 'Creating...' : 'Create Session'}
    </button>
  );
}
```

### Starting an Active Session

```typescript
import { useStartSession, useActiveSession } from '@/app/hooks/useFieldSession';

function SessionControl({ sessionId }) {
  const startSession = useStartSession();
  const activeSession = useActiveSession();

  const handleStart = async () => {
    await startSession.mutateAsync(sessionId);
  };

  return (
    <div>
      <button onClick={handleStart}>Start Session</button>
      {activeSession && <p>Active: {activeSession.title}</p>}
    </div>
  );
}
```

### Listing User Sessions

```typescript
import { useSessionList } from '@/app/hooks/useFieldSession';

function SessionsPage({ userId }) {
  const { data: sessions, isLoading } = useSessionList(userId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {sessions?.map(session => (
        <div key={session.id}>
          <h3>{session.title}</h3>
          <p>Status: {session.state}</p>
          <p>Finds: {session.find_log_count}</p>
        </div>
      ))}
    </div>
  );
}
```

### Getting Session Details

```typescript
import { useFieldSession, useSessionStats } from '@/app/hooks/useFieldSession';

function SessionDetail({ sessionId }) {
  const { data: session } = useFieldSession(sessionId);
  const { data: stats } = useSessionStats(sessionId);

  if (!session) return <div>Not found</div>;

  return (
    <div>
      <h1>{session.title}</h1>
      <p>Duration: {stats?.duration || 0} ms</p>
      <p>Distance: {stats?.distance || 0} m</p>
      <p>Finds: {stats?.finds || 0}</p>
      <p>Notes: {stats?.notes || 0}</p>
    </div>
  );
}
```

### Completing a Session

```typescript
import { useCompleteSession } from '@/app/hooks/useFieldSession';

function CompleteSessionButton({ sessionId }) {
  const completeSession = useCompleteSession();

  const handleComplete = async () => {
    await completeSession.mutateAsync(sessionId);
    // Session metrics auto-calculated
    // Telemetry event auto-tracked
  };

  return (
    <button onClick={handleComplete} disabled={completeSession.isPending}>
      {completeSession.isPending ? 'Completing...' : 'Complete Session'}
    </button>
  );
}
```

### Adding a Find Log

```typescript
import { useAddFindLog } from '@/app/hooks/useFieldSession';

function AddFindButton({ sessionId, findLogId }) {
  const addFindLog = useAddFindLog();

  const handleAddFind = async () => {
    await addFindLog.mutateAsync({
      sessionId,
      findLogId,
    });
  };

  return <button onClick={handleAddFind}>Link Find Log</button>;
}
```

## Advanced Usage

### Accessing the Manager Directly

```typescript
import { getFieldSessionManager } from '@/lib/sessions/manager';

const manager = getFieldSessionManager();
const session = manager.getSession(sessionId);

// Listen to changes
manager.on('change', (event) => {
  console.log('Session changed:', event.type, event.sessionId);
});
```

### Using Integration Helpers

```typescript
import * as integrations from '@/lib/sessions/integrations';

// Cache for offline storage
await integrations.cacheSessionForStorage(session, userId, storageManager);

// Queue for sync
await integrations.queueSessionForSync(session, syncEngine, 'create');

// Track telemetry
integrations.recordSessionEndTelemetry(session, metrics, telemetry);

// Get dashboard summary
const summary = integrations.getSessionSummaryForDashboard(session);

// Find nearby sessions
const nearby = integrations.getNearbySessionsForMap(session, 10, allSessions);
```

### Resolving Sync Conflicts

```typescript
import * as integrations from '@/lib/sessions/integrations';

const resolved = await integrations.resolveSessionSyncConflict(
  localVersion,
  remoteVersion,
  'merge' // or 'local' or 'remote'
);

// Merge strategy:
// - Keeps remote metadata (title, location, status)
// - Merges notes, finds, photos arrays
// - Avoids data loss
```

## Schema & Types

### Import Types

```typescript
import {
  FieldSession,
  SessionState,
  SyncStatus,
  WeatherCondition,
  VisibilityCondition,
  EquipmentType,
  SpecimenType,
  CreateFieldSessionInput,
  UpdateFieldSessionInput,
} from '@rockhound/shared/field-session-schema';
```

### Validate Data

```typescript
import { validateFieldSession } from '@rockhound/shared/field-session-schema';

const result = validateFieldSession(session);
if (result.valid) {
  console.log('Session is valid');
} else {
  console.log('Errors:', result.errors);
}
```

## Database Queries

### Get User Sessions

```sql
SELECT * FROM field_sessions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### Get Session Details

```sql
SELECT * FROM field_sessions_summary
WHERE id = $1;
```

### Get User Statistics

```sql
SELECT * FROM user_session_stats
WHERE user_id = $1;
```

### Find Sessions Near Location

```sql
SELECT * FROM field_sessions
WHERE ST_DWithin(center_point, ST_Point($1, $2)::geography, 5000) -- 5km
AND user_id = $3
ORDER BY created_at DESC;
```

### Get Active Sessions

```sql
SELECT * FROM field_sessions
WHERE user_id = $1
AND status = 'ACTIVE';
```

## Error Handling

### Manager Events

```typescript
const manager = getFieldSessionManager();

manager.on('error', (error) => {
  console.error('Manager error:', error.message);
  // Handle storage, validation, or sync errors
});

manager.on('change', (event) => {
  if (event.type === 'stateChanged') {
    console.log(`Session ${event.sessionId} changed state`);
  }
});
```

### Hook Error Handling

```typescript
const { data, error, isLoading } = useFieldSession(sessionId);

if (error) {
  return <div>Error: {error.message}</div>;
}

if (isLoading) {
  return <div>Loading...</div>;
}

return <div>{data?.title}</div>;
```

### Mutation Errors

```typescript
const createSession = useCreateSession();

const handleCreate = async () => {
  try {
    await createSession.mutateAsync(input);
  } catch (error) {
    console.error('Create failed:', error.message);
    // Show user-friendly error
  }
};
```

## Testing

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import {
  isValidStateTransition,
  validateFieldSession,
} from '@rockhound/shared/field-session-schema';

describe('FieldSession', () => {
  it('validates state transitions', () => {
    expect(isValidStateTransition('DRAFT', 'ACTIVE')).toBe(true);
    expect(isValidStateTransition('COMPLETED', 'ACTIVE')).toBe(false);
  });

  it('validates session data', () => {
    const session = createNewSession('user-1', 'device-1', 'Test Session');
    const result = validateFieldSession(session);
    expect(result.valid).toBe(true);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldSessionManager } from '@/lib/sessions/manager';

describe('FieldSessionManager', () => {
  let manager: FieldSessionManager;

  beforeEach(() => {
    manager = new FieldSessionManager({
      storageManager: mockStorage,
      syncEngine: mockSync,
    });
  });

  it('creates session', async () => {
    const session = await manager.createSession('user-1', 'device-1', {
      title: 'Test',
    });
    expect(session.id).toBeDefined();
    expect(session.status).toBe('DRAFT');
  });

  it('transitions state correctly', async () => {
    const session = await manager.createSession('user-1', 'device-1', {
      title: 'Test',
    });

    const active = await manager.startSession(session.id);
    expect(active.status).toBe('ACTIVE');
  });
});
```

## Performance Tips

1. **Use Query Caching** - TanStack Query auto-caches for 30-60s
2. **Batch Updates** - Debounced saves (500ms) batch rapid changes
3. **Filter in Database** - Use session_list hooks with filters
4. **Paginate Results** - Don't load all sessions at once
5. **Index Commonly Filtered Fields** - Already indexed: user_id, status, created_at

## Troubleshooting

### Sessions Not Persisting

```typescript
// Check if manager is initialized
const manager = getFieldSessionManager();
if (!manager.isInitialized()) {
  console.error('Manager not initialized');
}

// Check storage configuration
const session = await manager.getSession(sessionId);
console.log('Session:', session);
```

### Sync Conflicts

```typescript
// Check sync status
const session = await manager.getSession(sessionId);
console.log('Sync status:', session.sync_status);
console.log('Last error:', session.last_sync_error);

// Resolve manually if needed
const resolved = await resolveSessionSyncConflict(local, remote, 'merge');
```

### Query Not Updating

```typescript
// Invalidate cache
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: sessionKeys.all });

// Or set data directly
queryClient.setQueryData(sessionKeys.byId(sessionId), updatedSession);
```

## Resources

- [Full Architecture Documentation](./FieldSession_Architecture.md)
- [Delivery Summary](./FieldSession_Delivery_Summary.md)
- [Schema Reference](../packages/shared/src/field-session-schema.ts)
- [Manager Reference](../apps/web/lib/sessions/manager.ts)
- [Hooks Reference](../apps/web/app/hooks/useFieldSession.tsx)

## Support

For issues or questions:

1. Check the architecture documentation
2. Review example code in tests
3. Check error messages in manager events
4. Validate schema with validateFieldSession()
   EOF

cat FieldSession_QuickStart.md

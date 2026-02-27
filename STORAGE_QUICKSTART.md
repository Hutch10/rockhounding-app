# Rockhound Storage & Caching - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd apps/web
pnpm add idb
```

### 2. Initialize in App Layout

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { initStorageManager } from '@/lib/storage/manager';
import { initBackgroundJobs } from '@/lib/storage/background-jobs';

export default function RootLayout({children}) {
  useEffect(() => {
    // Initialize storage and background jobs
    const init = async () => {
      const storage = await initStorageManager({
        eviction_policy: 'lru',
        enable_compression: true,
      });

      const jobs = await initBackgroundJobs({
        compaction: {enabled: true},
        cleanup: {enabled: true},
      });

      console.log('✓ Storage & caching initialized');
    };

    init().catch(console.error);
  }, []);

  return <html>{children}</html>;
}
```

### 3. Use Hooks in Components

```typescript
// Offline field session editor
function FieldSessionEditor({sessionId}) {
  const {data, save, syncStatus} = useOfflineStorage<CachedFieldSession>(
    'field_session',
    sessionId
  );

  return (
    <div>
      <input
        value={data?.title || ''}
        onChange={(e) => save({...data, title: e.target.value})}
      />
      <span>{syncStatus}</span>
    </div>
  );
}

// Auto-saving specimen form
function SpecimenForm({specimenId}) {
  const [form, setForm] = useState({name: '', description: ''});

  useAutosave('specimen', specimenId, form, {
    delay: 1000,
    enabled: form.name.length > 0,
  });

  return (
    <form>
      <input
        value={form.name}
        onChange={(e) => setForm({...form, name: e.target.value})}
      />
    </form>
  );
}

// Storage monitoring
function StorageMonitor() {
  const {stats, health} = useStorageMonitor({pollInterval: 60000});

  return (
    <div>
      <p>Storage: {stats?.total_size_bytes} bytes</p>
      <p>Status: {health?.status}</p>
    </div>
  );
}
```

### 4. Verify Setup

**In Browser DevTools:**

1. Open DevTools → Application → Storage
2. Select "IndexedDB" → "rockhound-storage"
3. Verify stores: `entities`, `metadata`, `stats`, `migrations`

**In Console:**

```javascript
// Get storage manager
const storage = getStorageManager();

// Check stats
const stats = await storage.getStats();
console.log(stats);

// Check health
const health = await storage.getHealth();
console.log(health);
```

---

## Common Patterns

### Pattern 1: Offline-First Editing

```typescript
function EditorComponent({id}) {
  const {data, save, remove} = useOfflineStorage('specimen', id);

  const handleSave = async (updated) => {
    try {
      await save(updated);
      showToast('Saved to local storage');
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  return (
    <Editor
      data={data}
      onSave={handleSave}
      onDelete={() => remove()}
    />
  );
}
```

### Pattern 2: Batch Operations

```typescript
async function importSpecimens(specimens) {
  const manager = getStorageManager();

  // Cache all at once
  const keys = await manager.bulkSet(
    'specimen',
    specimens.map((s) => ({ id: s.id, data: s }))
  );

  console.log(`Cached ${keys.length} specimens`);
  return keys;
}
```

### Pattern 3: Analytics Caching

```typescript
function AnalyticsChart({userId}) {
  const fetchMetrics = async () => {
    // Check cache first
    const cached = await getAnalyticsCache(userId, 'monthly-summary');
    if (cached) return cached;

    // Compute if not cached
    const computed = await computeMetrics(userId);

    // Cache for 24 hours
    await cacheAnalyticsData(userId, 'monthly-summary', computed, 24*60*60*1000);

    return computed;
  };

  const {data} = useQuery({
    queryKey: ['analytics', userId],
    queryFn: fetchMetrics,
  });

  return <Chart data={data} />;
}
```

### Pattern 4: Sync Integration

```typescript
function SyncableFieldSession({sessionId, userId}) {
  const {data, save} = useOfflineStorage('field_session', sessionId);

  const handleSave = async (updated) => {
    // Save to local storage
    await save(updated);

    // Mark as pending sync
    await cacheFieldSessionForSync(updated, userId);

    // Trigger sync
    triggerSync();
  };

  return <Editor data={data} onSave={handleSave} />;
}
```

---

## Configuration Profiles

### Development (Small Cache)

```typescript
{
  max_storage_bytes: 10 * 1024 * 1024,    // 10MB
  eviction_policy: 'none',                 // Error on full
  compaction_interval_ms: 5 * 60 * 1000,  // 5 min
  enable_checksums: true,
  verify_on_read: true,
}
```

### Production (Standard)

```typescript
{
  max_storage_bytes: 50 * 1024 * 1024,    // 50MB
  eviction_policy: 'lru',
  compaction_interval_ms: 60 * 60 * 1000, // 1 hour
  enable_compression: true,
  enable_checksums: true,
  verify_on_read: true,
}
```

### Offline-Heavy (Large Cache)

```typescript
{
  max_storage_bytes: 200 * 1024 * 1024,     // 200MB
  default_ttl_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
  eviction_policy: 'priority',
  compaction_interval_ms: 6 * 60 * 60 * 1000, // 6 hours
  enable_compression: true,
}
```

---

## Testing & Verification

### Unit Tests

```typescript
describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(async () => {
    manager = await initStorageManager();
  });

  it('should store and retrieve data', async () => {
    const session: CachedFieldSession = {
      id: 'test-1',
      title: 'Test Session',
      // ...
    };

    await manager.set('field_session', session.id, session);
    const retrieved = await manager.get('field_session', session.id);

    expect(retrieved).toEqual(session);
  });

  it('should evict LRU items', async () => {
    // Add items to exceed capacity
    // Verify oldest accessed items removed
  });

  it('should detect checksum failures', async () => {
    // Corrupt data
    // Verify detection on read
  });
});
```

### Integration Tests

```typescript
describe('Storage with Sync', () => {
  it('should mark items as pending sync', async () => {
    const specimen = {...};

    await cacheSpecimenForSync(specimen, userId);
    const cached = await manager.get('specimen', specimen.id);

    expect(cached.metadata.sync_status).toBe('pending');
  });

  it('should update sync status', async () => {
    await markSyncItemAsSynced(syncId, userId);
    // Verify in storage
  });
});
```

### Manual Verification

1. **Add entity offline**

   ```typescript
   const { save } = useOfflineStorage('field_session', id);
   await save(session);
   ```

2. **Verify in IndexedDB**
   - DevTools → Storage → IndexedDB → rockhound-storage
   - Check `entities` and `metadata` stores

3. **Reload page and verify persistence**

   ```typescript
   const { data } = useStorageRead('field_session', id);
   expect(data).toBeDefined();
   ```

4. **Trigger background job**

   ```typescript
   const manager = getStorageManager();
   await manager.compact();
   ```

5. **Check metrics**
   ```typescript
   const stats = await manager.getStats();
   console.log(stats);
   ```

---

## Troubleshooting

### Items not persisting

```typescript
// Check if storage manager initialized
try {
  const manager = getStorageManager();
  console.log('✓ Storage manager ready');
} catch {
  console.error('✗ Storage manager not initialized');
  // Initialize: await initStorageManager()
}

// Check if userId set
manager.setUserId(userId);

// Verify write
const key = await manager.set('specimen', id, data);
console.log('Stored as:', key);
```

### Storage full

```typescript
const stats = await manager.getStats();
if (stats.total_size_bytes > config.max_storage_bytes * 0.9) {
  // Manually trigger compaction
  const removed = await manager.compact();
  console.log(`Freed ${removed} items`);
}
```

### Background jobs not running

```typescript
// Verify initialized
try {
  const jobs = getBackgroundJobManager();
  console.log('✓ Job manager ready');
} catch {
  console.error('✗ Job manager not initialized');
  // Initialize: await initBackgroundJobs()
}

// Check metrics
const metrics = jobs.getMetrics();
console.log(metrics);
```

---

## Entity-Specific Guides

### Field Sessions

```typescript
import { useCachedFieldSession } from '@/app/hooks/useStorage';

function FieldSessionComponent({ sessionId }) {
  const { data, save } = useCachedFieldSession(sessionId);

  // data: CachedFieldSession with auto-typing
  // save: (data) => Promise<void>
}
```

### Find Logs

```typescript
import { useCachedFindLog } from '@/app/hooks/useStorage';

function FindLogComponent({ findLogId }) {
  const { data, save } = useCachedFindLog(findLogId);
}
```

### Specimens

```typescript
import { useCachedSpecimen } from '@/app/hooks/useStorage';

function SpecimenComponent({ specimenId }) {
  const { data, save } = useCachedSpecimen(specimenId);
}
```

---

## Next Steps

1. **Integrate with UI**
   - Replace direct API calls with offline hooks
   - Add sync indicators
   - Show offline mode status

2. **Add Telemetry**
   - Cache telemetry events
   - Batch upload on sync

3. **Enable Analytics**
   - Cache computed metrics locally
   - Update on background

4. **Monitor Performance**
   - Track cache hit rates
   - Monitor eviction patterns
   - Alert on storage issues

---

## Support & Resources

- **Full Documentation:** `docs/storage-caching.md`
- **API Reference:** `packages/shared/src/storage-schema.ts`
- **Examples:** `apps/web/app/examples/storage-examples.tsx` (coming)
- **Issues:** Check troubleshooting section above

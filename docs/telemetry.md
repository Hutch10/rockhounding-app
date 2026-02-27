# Rockhound Telemetry System Documentation

## Overview

The Rockhound Telemetry System is a comprehensive observability platform for tracking performance metrics, sync timings, cache efficiency, background job durations, user interactions, and system errors. It provides offline-first event capture with intelligent batching and a rich analytics dashboard.

## Architecture

### Components

1. **Data Model** (`packages/shared/src/telemetry.ts`)
   - TypeScript interfaces and Zod schemas
   - 8 event categories with specialized schemas
   - Type-safe event validation

2. **Database Layer** (`supabase/migrations/20260123000001_create_telemetry_tables.sql`)
   - Partitioned events table for scalability
   - Denormalized tables for performance (errors, performance metrics)
   - Materialized views for dashboard queries
   - Automated triggers and aggregation

3. **Client-Side Aggregator** (`apps/web/lib/telemetry/aggregator.ts`)
   - Offline-first event buffering with IndexedDB
   - Intelligent batching (50 events or 5 seconds)
   - Configurable sampling rates
   - Network-aware sync

4. **React Hooks** (`apps/web/app/hooks/useTelemetry.ts`)
   - Easy-to-use capture hooks
   - Automatic Web Vitals tracking
   - Query hooks for dashboard data

5. **Ingestion API** (`apps/web/app/api/telemetry/ingest/route.ts`)
   - Batch event processing
   - Validation and sanitization
   - Database insertion with triggers

6. **Dashboard Components**
   - Widget for main dashboard
   - Full analytics page with trends
   - Error spike detection
   - Performance regression alerts

## Event Categories

### 1. Performance Metrics

Track Core Web Vitals and custom performance timings:

```typescript
import { useTelemetry } from '@/app/hooks/useTelemetry';

const { recordPerformance } = useTelemetry();

recordPerformance({
  event_name: 'api_call',
  user_id: currentUser.id,
  api_response_time: 234, // ms
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null,
  fcp: null,
  tti: null,
  component_render_time: null,
  query_execution_time: null,
  memory_used_mb: null,
  memory_limit_mb: null,
  // Context fields auto-filled
});
```

**Tracked Metrics:**

- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- FCP (First Contentful Paint)
- TTI (Time to Interactive)
- Component render times
- API response times
- Database query times
- Memory usage

### 2. Sync Events

Track data synchronization operations:

```typescript
const { recordSync } = useTelemetry();

recordSync({
  event_name: 'analytics_sync',
  user_id: currentUser.id,
  sync_type: 'incremental',
  sync_direction: 'bidirectional',
  sync_start: startTime.toISOString(),
  sync_end: endTime.toISOString(),
  sync_duration_ms: duration,
  records_synced: 142,
  bytes_transferred: 52480,
  sync_status: 'success',
  conflicts_detected: 0,
  conflicts_resolved: 0,
  error_message: null,
  error_code: null,
});
```

**Use Cases:**

- Track sync performance
- Identify sync failures
- Monitor conflict resolution
- Analyze data transfer volumes

### 3. Cache Events

Monitor cache hit/miss ratios:

```typescript
const { recordCache } = useTelemetry();

recordCache({
  event_name: 'cache_lookup',
  user_id: currentUser.id,
  operation: 'hit', // or 'miss', 'write', 'invalidate', 'evict'
  cache_key: 'user:123:analytics',
  cache_level: 'user',
  lookup_time_ms: 12,
  write_time_ms: null,
  entry_size_bytes: 4096,
  cache_size_entries: 245,
  cache_size_bytes: 1048576,
  eviction_count: 0,
});
```

**Metrics:**

- Cache hit rate by level
- Lookup/write performance
- Cache size and evictions
- Memory usage

### 4. Background Job Events

Track background job execution:

```typescript
const { recordBackgroundJob } = useTelemetry();

recordBackgroundJob({
  event_name: 'analytics_refresh',
  user_id: null, // System job
  job_type: 'analytics_refresh',
  job_id: crypto.randomUUID(),
  job_start: startTime.toISOString(),
  job_end: endTime.toISOString(),
  job_duration_ms: duration,
  job_status: 'completed',
  items_processed: 1523,
  items_failed: 0,
  cpu_time_ms: 8234,
  memory_peak_mb: 512,
  error_message: null,
  error_stack: null,
});
```

**Tracked Jobs:**

- Analytics refresh
- Cache warmup
- Data exports
- Image processing
- Notification delivery
- Scheduled backups

### 5. User Interaction Events

Capture user behavior:

```typescript
const { trackClick, trackNavigation } = useInteractionTracking();

// Button clicks
trackClick('export-button', 'button', 'exports');

// Navigation
trackNavigation('/dashboard/storage', '/dashboard');
```

**Interaction Types:**

- Click, scroll, input, submit
- Navigation, search, filter, sort
- Export, share

### 6. Error Events

Automatically track errors:

```typescript
const { trackError } = useErrorTracking();

try {
  // Your code
} catch (error) {
  trackError(error, {
    componentName: 'ExportForm',
    componentStack: errorInfo.componentStack,
  });
}
```

**Error Types:**

- JavaScript errors
- Network errors
- API errors
- Validation errors
- Auth errors
- Database errors

### 7. Network Events

Track API requests:

```typescript
const { recordNetwork } = useTelemetry();

recordNetwork({
  event_name: 'api_request',
  user_id: currentUser.id,
  request_id: requestId,
  method: 'POST',
  endpoint: '/api/specimens',
  request_start: startTime.toISOString(),
  request_end: endTime.toISOString(),
  duration_ms: duration,
  status_code: 201,
  response_size_bytes: 2048,
  is_success: true,
  is_cached: false,
  retry_count: 0,
});
```

### 8. Database Events

Monitor database performance:

```typescript
const { recordDatabase } = useTelemetry();

recordDatabase({
  event_name: 'rpc_call',
  user_id: currentUser.id,
  query_type: 'rpc',
  table_name: null,
  rpc_name: 'get_user_analytics',
  query_start: startTime.toISOString(),
  query_end: endTime.toISOString(),
  execution_time_ms: duration,
  rows_affected: null,
  rows_returned: 1,
  is_success: true,
  error_code: null,
  query_plan: null,
});
```

## Setup & Integration

### 1. Initialize Telemetry

Wrap your app with the TelemetryProvider:

```tsx
// app/layout.tsx
import { TelemetryProvider } from '@/app/components/telemetry/TelemetryProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TelemetryProvider
          config={{
            sampling_rate: 1.0,
            performance_sampling_rate: 0.1,
            batch_size: 50,
            batch_timeout_ms: 5000,
          }}
          userId={currentUser?.id}
        >
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
```

### 2. Track Component Performance

Use the automatic tracking hook:

```tsx
import { usePerformanceTracking } from '@/app/hooks/useTelemetry';

function MyComponent() {
  usePerformanceTracking('MyComponent');

  return <div>Content</div>;
}
```

### 3. Track User Interactions

```tsx
import { useInteractionTracking } from '@/app/hooks/useTelemetry';

function ExportButton() {
  const { trackClick } = useInteractionTracking();

  return (
    <button
      onClick={() => {
        trackClick('export-button', 'button', 'exports');
        handleExport();
      }}
    >
      Export
    </button>
  );
}
```

### 4. Add Telemetry Widget to Dashboard

```tsx
import TelemetryWidget from '@/app/components/telemetry/TelemetryWidget';

function Dashboard() {
  return (
    <div>
      {/* Other dashboard content */}
      <TelemetryWidget userId={currentUser.id} days={7} />
    </div>
  );
}
```

## Configuration

### Sampling

Control event capture rates:

```typescript
const config: TelemetryConfig = {
  // General sampling (100% = capture all events)
  sampling_rate: 1.0,

  // Performance events (10% = capture 1 in 10 events)
  performance_sampling_rate: 0.1,

  // Filter by category
  enabled_categories: ['performance', 'error', 'sync'],
};
```

### Batching

Configure batch behavior:

```typescript
const config: TelemetryConfig = {
  // Send batch after 50 events
  batch_size: 50,

  // Or after 5 seconds (whichever comes first)
  batch_timeout_ms: 5000,

  // Maximum events to buffer offline
  max_buffer_size: 1000,

  // Discard events older than 24 hours
  offline_buffer_ttl_ms: 86400000,
};
```

### Privacy

Protect user data:

```typescript
const config: TelemetryConfig = {
  // Anonymize user IDs
  anonymize_user_data: true,

  // Exclude device info
  include_device_info: false,

  // Exclude network info
  include_network_info: false,
};
```

## Dashboard

### Telemetry Widget

Compact widget for main dashboard showing:

- Total events
- Error count and rate
- Performance score (0-100)
- Cache hit rate
- Performance trend chart
- Top 3 errors

### Full Telemetry Page

Comprehensive analytics at `/dashboard/telemetry`:

- Time range selector (24h, 7d, 30d, 90d)
- Key metrics cards
- Core Web Vitals (LCP, FID, CLS)
- Performance trends over time
- Error rate trends
- Recent errors list with details
- Most frequent errors chart

## Database Schema

### Main Tables

**telemetry_events** (partitioned by timestamp)

- Stores all raw events
- Partitioned monthly for performance
- Triggers populate denormalized tables

**telemetry_aggregated_metrics**

- Pre-computed statistics
- Time-windowed aggregations
- Percentile calculations

**telemetry_sessions**

- Session tracking
- Event counts per session
- Duration calculations

**telemetry_errors** (denormalized)

- Fast error queries
- Full-text search on messages
- Component/file tracking

**telemetry_performance_metrics** (denormalized)

- Web Vitals storage
- Page-level analysis
- Percentile queries

### Materialized Views

Refresh with: `SELECT refresh_telemetry_materialized_views();`

**telemetry_error_summary_daily**

- Daily error aggregations
- Affected users/sessions
- Critical error rates

**telemetry_performance_summary**

- Performance by page
- Percentile calculations (p50, p75, p95)
- Sample counts

**telemetry_cache_summary**

- Hit rates by cache level
- Daily granularity
- 30-day retention

### RPC Functions

**get_telemetry_summary(user_id, start_date, end_date)**

- Returns comprehensive summary
- Error rates and top errors
- Performance scores
- Cache hit rates

**get_performance_trends(user_id, days)**

- Daily performance metrics
- LCP, FID, CLS trends
- Sample counts

## Performance Optimization

### Client-Side

1. **Sampling**: Reduce performance event volume

   ```typescript
   performance_sampling_rate: 0.1; // 10% of events
   ```

2. **Batching**: Minimize network requests

   ```typescript
   batch_size: 50; // Send in batches of 50
   ```

3. **Offline Buffering**: Queue events when offline
   - IndexedDB storage
   - Auto-sync when online
   - TTL-based cleanup

### Server-Side

1. **Partitioning**: Monthly partitions for events table

   ```sql
   CREATE TABLE telemetry_events_2026_01 PARTITION OF telemetry_events
     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
   ```

2. **Denormalization**: Specialized tables for hot queries
   - `telemetry_errors` for error analysis
   - `telemetry_performance_metrics` for Web Vitals

3. **Materialized Views**: Pre-computed aggregations
   - Refresh every 5 minutes
   - CONCURRENTLY to avoid locks

4. **Indexes**: Optimized for common queries
   ```sql
   CREATE INDEX idx_events_user_category_time
     ON telemetry_events(user_id, category, timestamp DESC);
   ```

## Data Retention

### Automatic Cleanup

```sql
-- Run daily via cron
SELECT cleanup_old_telemetry_events();
```

**Retention Periods:**

- Raw events: 90 days
- Aggregated metrics: 180 days
- Sessions: 90 days
- Materialized views: Rebuild from retained data

### Manual Cleanup

```sql
-- Delete specific time range
DELETE FROM telemetry_events
WHERE timestamp < '2025-10-01'::timestamptz;

-- Vacuum to reclaim space
VACUUM ANALYZE telemetry_events;
```

## Troubleshooting

### Events Not Appearing

1. Check sampling configuration
2. Verify user is online
3. Check browser console for errors
4. Inspect IndexedDB (`rockhound-telemetry`)

### High Event Volume

1. Reduce sampling rates
2. Filter unnecessary categories
3. Increase batch size
4. Check for event loops

### Slow Dashboard Queries

1. Refresh materialized views
2. Check for missing indexes
3. Verify partition creation
4. Monitor database load

### Memory Issues

1. Reduce `max_buffer_size`
2. Lower `offline_buffer_ttl_ms`
3. Increase batch frequency
4. Check for memory leaks

## Best Practices

### 1. Minimal Overhead

```typescript
// ✅ Good: Sample performance events
performance_sampling_rate: 0.1;

// ❌ Bad: Capture every event
performance_sampling_rate: 1.0;
```

### 2. Meaningful Event Names

```typescript
// ✅ Good: Descriptive names
event_name: 'specimen_export_completed';

// ❌ Bad: Generic names
event_name: 'action';
```

### 3. Contextual Metadata

```typescript
// ✅ Good: Add context
metadata: {
  export_format: 'csv',
  record_count: 142,
  file_size_kb: 23,
}

// ❌ Bad: Empty metadata
metadata: null
```

### 4. Error Handling

```typescript
// ✅ Good: Catch and track
try {
  await dangerousOperation();
} catch (error) {
  trackError(error, { componentName: 'Export' });
  throw error;
}

// ❌ Bad: Silent failures
try {
  await dangerousOperation();
} catch {}
```

### 5. Privacy First

```typescript
// ✅ Good: Exclude sensitive data
metadata: {
  action: 'search',
  result_count: 5,
}

// ❌ Bad: Include user data
metadata: {
  search_query: 'sensitive data',
  user_email: 'user@example.com',
}
```

## API Reference

See [useTelemetry.ts](../app/hooks/useTelemetry.ts) for complete hook API.

### Core Hooks

- `useTelemetry()` - Main telemetry API
- `usePerformanceTracking(componentName)` - Auto-track renders
- `useInteractionTracking()` - Track clicks/navigation
- `useErrorTracking()` - Track errors
- `useWebVitals()` - Auto-track Core Web Vitals

### Query Hooks

- `useTelemetrySummary(userId, days)` - Overview metrics
- `usePerformanceTrends(userId, days)` - Performance over time
- `useRecentErrors(userId, limit)` - Recent error list
- `useRefreshTelemetryViews()` - Refresh materialized views

## Support

For issues or questions:

1. Check this documentation
2. Review code examples in hook files
3. Inspect browser DevTools → Application → IndexedDB
4. Check database logs for ingestion errors
5. Open an issue on the project repository

# Telemetry System - Quick Start Guide

## Installation

The telemetry system is already integrated into the Rockhound project. To use it:

### 1. Install Dependencies

The only additional dependency needed is `idb` for IndexedDB:

```bash
cd apps/web
pnpm add idb
```

### 2. Initialize in Your App

Wrap your application with the TelemetryProvider in your root layout:

```tsx
// apps/web/app/layout.tsx
import { TelemetryProvider } from './components/telemetry/TelemetryProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TelemetryProvider
          userId={currentUser?.id}
          config={{
            sampling_rate: 1.0,
            performance_sampling_rate: 0.1,
            batch_size: 50,
            batch_timeout_ms: 5000,
          }}
        >
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
```

### 3. Run Database Migration

Apply the telemetry database schema:

```bash
# Using Supabase CLI
supabase db push

# Or manually
psql -U postgres -d rockhound -f supabase/migrations/20260123000001_create_telemetry_tables.sql
```

### 4. Add Widget to Dashboard

```tsx
// apps/web/app/dashboard/page.tsx
import TelemetryWidget from '@/app/components/telemetry/TelemetryWidget';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Your existing dashboard content */}

      <TelemetryWidget userId={currentUser.id} days={7} />
    </div>
  );
}
```

### 5. Start Tracking Events

```tsx
import { useTelemetry } from '@/app/hooks/useTelemetry';

function MyComponent() {
  const { recordPerformance, recordError } = useTelemetry();

  // Track performance
  recordPerformance({
    event_name: 'data_load',
    api_response_time: 234,
  });

  // Track errors
  try {
    // Your code
  } catch (error) {
    recordError({
      event_name: 'operation_failed',
      severity: 'error',
      error_type: 'javascript_error',
      error_message: error.message,
      error_stack: error.stack,
    });
  }
}
```

## Verify Installation

1. **Check IndexedDB:**
   - Open DevTools → Application → IndexedDB
   - Look for `rockhound-telemetry` database

2. **Check Events:**
   - Navigate to `/dashboard/telemetry`
   - You should see telemetry data (may take a few seconds)

3. **Check Database:**
   ```sql
   SELECT COUNT(*) FROM telemetry_events;
   SELECT * FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5;
   ```

## Common Issues

### Events Not Appearing

1. Check sampling configuration (may be too low)
2. Verify network connection
3. Check browser console for errors
4. Inspect IndexedDB for buffered events

### Database Errors

1. Ensure migration ran successfully
2. Check RLS policies are enabled
3. Verify user has proper permissions

### Performance Issues

1. Reduce sampling rates
2. Increase batch size
3. Check partition creation
4. Refresh materialized views

## Next Steps

- Read full documentation: [docs/telemetry.md](../../../docs/telemetry.md)
- Review integration examples: [apps/web/app/examples/telemetry-integration.tsx](../../examples/telemetry-integration.tsx)
- Set up monitoring alerts
- Configure automatic cleanup
- Create custom aggregations

## Configuration Options

```typescript
interface TelemetryConfig {
  // Sampling (0.0 - 1.0)
  sampling_rate: number; // General events (1.0 = 100%)
  performance_sampling_rate: number; // Performance events (0.1 = 10%)

  // Batching
  batch_size: number; // Events per batch (default: 50)
  batch_timeout_ms: number; // Flush timeout (default: 5000ms)

  // Buffering
  max_buffer_size: number; // Max offline events (default: 1000)
  offline_buffer_ttl_ms: number; // Event TTL (default: 24 hours)

  // Filtering
  enabled_categories: Array<
    // Which categories to capture
    | 'performance'
    | 'sync'
    | 'cache'
    | 'background_job'
    | 'user_interaction'
    | 'error'
    | 'network'
    | 'database'
  >;

  // Privacy
  anonymize_user_data: boolean; // Strip user IDs
  include_device_info: boolean; // Include device context
  include_network_info: boolean; // Include network context
}
```

## Support

- Documentation: [docs/telemetry.md](../../../docs/telemetry.md)
- Examples: [apps/web/app/examples/telemetry-integration.tsx](../../examples/telemetry-integration.tsx)
- Issues: Open a ticket with telemetry metrics

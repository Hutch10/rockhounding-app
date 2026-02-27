# Rockhound Dashboard - Component Documentation

## Overview

The Rockhound Dashboard is a comprehensive analytics UI built with Next.js 14, React 18, TypeScript, and TanStack React Query. It provides offline-first, real-time analytics across six levels: user, storage, tags, collections, materials, and time periods.

## Architecture

### Directory Structure

```
apps/web/app/
├── dashboard/
│   ├── layout.tsx              # Main dashboard layout with navigation
│   ├── page.tsx                # User-level analytics dashboard
│   ├── storage/
│   │   └── page.tsx            # Storage location list
│   ├── tags/
│   │   └── page.tsx            # Tag analytics list
│   ├── collections/
│   │   └── page.tsx            # Collection group list
│   └── materials/
│       └── page.tsx            # Material analytics list
├── hooks/
│   ├── useAnalytics.ts         # Data fetching hooks with React Query
│   └── useSyncStatus.ts        # Network and sync status monitoring
└── components/
    ├── ui/
    │   └── index.tsx           # Reusable UI components
    ├── charts/
    │   └── index.tsx           # Data visualization components
    └── ErrorBoundary.tsx       # Error boundary component
```

## Core Concepts

### 1. Offline-First Architecture

The dashboard implements a two-tier caching strategy:

1. **First Tier**: Check `analytics_cache` table for fresh cached results
2. **Second Tier**: Query materialized views if cache miss or stale
3. **IndexedDB**: Persist analytics data locally for offline access

```typescript
// Example: useUserAnalytics hook checks cache first
const { data, isLoading } = useUserAnalytics(userId);
```

### 2. Real-Time Sync

The `useSyncStatus` hook monitors network status and provides sync indicators:

- **Online**: Green pulse indicator, auto-sync enabled
- **Offline**: Yellow indicator, queues changes locally
- **Syncing**: Blue spinner, actively syncing data
- **Error**: Red indicator with error message

```typescript
const { isOnline, isSyncing, lastSyncTime, triggerSync } = useSyncStatus();
```

### 3. Analytics Levels

Six analytics levels with corresponding hooks:

| Level       | Hook                                         | Description                        |
| ----------- | -------------------------------------------- | ---------------------------------- |
| User        | `useUserAnalytics(userId)`                   | Overall collection statistics      |
| Storage     | `useStorageLocationAnalytics(locationId)`    | Per-location capacity and contents |
| Tag         | `useTagAnalytics(tagId)`                     | Tag usage patterns                 |
| Collection  | `useCollectionGroupAnalytics(groupId)`       | Collection insights                |
| Material    | `useMaterialAnalytics(materialId)`           | Material-specific data             |
| Time Period | `useTimePeriodAnalytics(startDate, endDate)` | Historical trends                  |

## Component Reference

### UI Components

All UI components support:

- Mobile-first responsive design
- Dark mode with `dark:` variants
- Accessibility with ARIA labels
- Loading states

#### StatCard

Display key metrics with icons and trends.

```tsx
<StatCard
  icon={<CubeIcon />}
  label="Total Specimens"
  value={1234}
  trend={{ direction: 'up', value: 12.5 }}
  isLoading={false}
/>
```

**Props:**

- `icon`: ReactNode - Icon element
- `label`: string - Metric label
- `value`: number - Metric value
- `trend?`: { direction: 'up' | 'down', value: number }
- `isLoading?`: boolean

#### MetricCard

Container for grouped metrics with title and cache status.

```tsx
<MetricCard title="Recent Activity" cacheStatus="FRESH" action={<button>Refresh</button>}>
  {/* Child content */}
</MetricCard>
```

**Props:**

- `title`: string
- `children`: ReactNode
- `cacheStatus?`: CacheStatus enum
- `action?`: ReactNode

#### ProgressBar

Animated progress bar with color coding.

```tsx
<ProgressBar value={75} max={100} color="green" showPercentage />
```

**Props:**

- `value`: number - Current value
- `max`: number - Maximum value
- `color?`: 'blue' | 'green' | 'yellow' | 'red'
- `showPercentage?`: boolean

#### Badge

Status badge with variants and sizes.

```tsx
<Badge variant="success" size="md">
  Active
</Badge>
```

**Props:**

- `children`: ReactNode
- `variant?`: 'default' | 'success' | 'warning' | 'error' | 'info'
- `size?`: 'sm' | 'md' | 'lg'

#### GridLayout

Responsive grid container.

```tsx
<GridLayout cols={3} gap="md">
  {items.map((item) => (
    <div key={item.id}>{item.content}</div>
  ))}
</GridLayout>
```

**Props:**

- `children`: ReactNode
- `cols`: 1 | 2 | 3 | 4
- `gap?`: 'sm' | 'md' | 'lg'

#### LoadingSpinner

Loading indicator with sizes.

```tsx
<LoadingSpinner size="lg" label="Loading data..." />
```

**Props:**

- `size?`: 'sm' | 'md' | 'lg'
- `label?`: string - Accessible label

#### EmptyState

Empty state with icon and action.

```tsx
<EmptyState
  icon={<FolderIcon />}
  title="No data found"
  description="Start by adding items"
  action={<button>Add Item</button>}
/>
```

**Props:**

- `icon`: ReactNode
- `title`: string
- `description`: string
- `action?`: ReactNode

### Chart Components

All charts support:

- Responsive sizing
- Dark mode
- Accessibility with ARIA labels
- Custom colors

#### PieChart

Display proportional data.

```tsx
<PieChart
  data={[
    { label: 'Quartz', value: 45, color: '#3B82F6' },
    { label: 'Calcite', value: 30, color: '#10B981' },
  ]}
  title="Material Distribution"
/>
```

**Props:**

- `data`: Array<{ label: string, value: number, color?: string }>
- `title?`: string
- `height?`: number (default: 300)

#### BarChart

Horizontal bar chart.

```tsx
<BarChart
  data={[
    { label: 'Excellent', value: 25 },
    { label: 'Good', value: 45 },
  ]}
  title="Condition Distribution"
  color="#3B82F6"
/>
```

**Props:**

- `data`: Array<{ label: string, value: number }>
- `title?`: string
- `color?`: string (hex color)
- `height?`: number

#### Histogram

Vertical histogram with bins.

```tsx
<Histogram
  data={[
    { bin_start: 0, bin_end: 10, count: 5 },
    { bin_start: 10, bin_end: 20, count: 12 },
  ]}
  title="Weight Distribution"
  xAxisLabel="Weight (g)"
  yAxisLabel="Count"
/>
```

**Props:**

- `data`: HistogramBin[]
- `title?`: string
- `xAxisLabel?`: string
- `yAxisLabel?`: string
- `color?`: string

#### LineChart

Time series line chart with area fill.

```tsx
<LineChart
  data={[
    { date: '2024-01-01', value: 100 },
    { date: '2024-02-01', value: 150 },
  ]}
  title="Collection Growth"
/>
```

**Props:**

- `data`: Array<{ date: string, value: number }>
- `title?`: string
- `height?`: number

## Data Hooks

### useUserAnalytics

Fetch user-level analytics.

```typescript
const { data, isLoading, error, refetch } = useUserAnalytics(userId);

// Data structure:
{
  user_id: string;
  total_specimens: number;
  unique_materials: number;
  total_estimated_value: number;
  total_weight_grams: number;
  material_distribution: MaterialCount[];
  acquisition_methods: { method: string, count: number }[];
  // ... additional fields
}
```

### useStorageLocationAnalyticsList

Fetch all storage locations for a user.

```typescript
const { data, isLoading } = useStorageLocationAnalyticsList(userId);

// Returns array of:
{
  location_id: string;
  location_name: string;
  specimen_count: number;
  capacity: number;
  at_capacity: boolean;
  nearly_full: boolean;
  // ... additional fields
}
```

### useRefreshAnalytics

Manually trigger analytics refresh.

```typescript
const { mutate: refreshAnalytics, isPending } = useRefreshAnalytics();

const handleRefresh = () => {
  refreshAnalytics({ userId });
};
```

### Cache Configuration

Each analytics level has specific cache timings:

```typescript
const CACHE_CONFIG = {
  USER: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  STORAGE_LOCATION: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  // ... other levels
};
```

## Performance Optimization

### 1. Code Splitting

Each analytics page is automatically code-split by Next.js:

```
/dashboard              → page.tsx (user analytics)
/dashboard/storage      → storage/page.tsx
/dashboard/tags         → tags/page.tsx
```

### 2. Query Invalidation

Invalidate specific cache levels:

```typescript
const { mutate: invalidateCache } = useInvalidateCache();

invalidateCache({
  userId,
  level: 'storage-location',
  entityId: locationId,
});
```

### 3. Prefetching

Prefetch analytics data on hover:

```tsx
const queryClient = useQueryClient();

<Link
  href="/dashboard/storage/123"
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.storage('123'),
      queryFn: () => fetchStorageAnalytics('123'),
    });
  }}
>
  Storage Location
</Link>;
```

## Accessibility

### Keyboard Navigation

All interactive elements support keyboard navigation:

- `Tab` / `Shift+Tab`: Navigate between elements
- `Enter` / `Space`: Activate buttons
- `Escape`: Close modals/dropdowns

### Screen Readers

All components include proper ARIA labels:

```tsx
<button aria-label="Refresh analytics">
  <ArrowPathIcon className="h-5 w-5" />
</button>

<div role="status" aria-live="polite">
  {isLoading ? 'Loading...' : `${count} items`}
</div>
```

### Color Contrast

All colors meet WCAG AA standards:

- Text: 4.5:1 contrast ratio
- Interactive elements: 3:1 contrast ratio
- Dark mode: Adjusted for readability

## Mobile Responsiveness

### Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktops */
xl: 1280px  /* Large desktops */
```

### Responsive Patterns

#### Grid Layouts

```tsx
<GridLayout
  cols={4}  // Desktop: 4 columns
  // Automatically adjusts:
  // sm: 2 columns
  // xs: 1 column
>
```

#### Navigation

- Desktop: Sidebar navigation
- Mobile: Hamburger menu with slide-out drawer

#### Typography

```tsx
// Responsive text sizing
<h1 className="text-2xl sm:text-3xl lg:text-4xl">Title</h1>
```

## Error Handling

### Error Boundary

Wrap components to catch rendering errors:

```tsx
<ErrorBoundary>
  <DashboardContent />
</ErrorBoundary>
```

### Query Errors

Handle data fetching errors:

```tsx
const { data, error, isError } = useUserAnalytics(userId);

if (isError) {
  return (
    <div className="text-red-600">
      Error: {error.message}
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

### Network Errors

Monitor connection status:

```tsx
const { isOnline, syncError } = useSyncStatus();

{
  !isOnline && (
    <div className="bg-yellow-100 p-4">
      You are offline. Changes will sync when connection is restored.
    </div>
  );
}
```

## Testing

### Unit Tests

Test hooks with React Query wrapper:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('useUserAnalytics fetches data', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useUserAnalytics('user-123'), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Integration Tests

Test page components:

```typescript
import { render, screen } from '@testing-library/react';

test('dashboard page displays user analytics', async () => {
  render(<DashboardPage />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/total specimens/i)).toBeInTheDocument();
  });
});
```

## Deployment

### Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Analytics
ANALYTICS_REFRESH_INTERVAL=300000  # 5 minutes
```

### Build Optimization

Enable production optimizations:

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
};
```

### Bundle Analysis

Analyze bundle size:

```bash
pnpm build
# Check .next/analyze output
```

## Best Practices

### 1. Data Fetching

```tsx
// ✅ Good: Use hooks for data fetching
const { data } = useUserAnalytics(userId);

// ❌ Bad: Direct API calls in components
useEffect(() => {
  fetch('/api/analytics/user').then(/* ... */);
}, []);
```

### 2. Loading States

```tsx
// ✅ Good: Show loading UI
if (isLoading) return <LoadingSpinner />;

// ❌ Bad: Render nothing
if (isLoading) return null;
```

### 3. Error Handling

```tsx
// ✅ Good: Provide recovery options
if (error) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={refetch}>Retry</button>
    </div>
  );
}

// ❌ Bad: Silent failures
if (error) return null;
```

### 4. Component Composition

```tsx
// ✅ Good: Compose small components
<MetricCard title="Activity">
  <StatCard label="30-day additions" value={data.additions} />
  <StatCard label="Growth rate" value={data.growthRate} />
</MetricCard>

// ❌ Bad: Monolithic components
<ActivityMetrics data={data} />
```

## Troubleshooting

### Issue: Analytics not updating

**Solution**: Trigger manual refresh

```tsx
const { mutate: refreshAnalytics } = useRefreshAnalytics();
refreshAnalytics({ userId });
```

### Issue: Stale data displayed

**Solution**: Invalidate specific cache level

```tsx
const queryClient = useQueryClient();
queryClient.invalidateQueries({
  queryKey: analyticsKeys.user(userId),
});
```

### Issue: Offline mode not working

**Solution**: Check IndexedDB permissions

```typescript
// Verify IndexedDB is available
if ('indexedDB' in window) {
  // IndexedDB available
} else {
  console.error('IndexedDB not supported');
}
```

## Additional Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)

## Support

For issues or questions:

1. Check this documentation
2. Review code examples in component files
3. Consult the README in each directory
4. Open an issue on the project repository

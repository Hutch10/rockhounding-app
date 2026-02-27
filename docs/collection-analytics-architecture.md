# Collection Insights & Analytics Architecture

## Overview

The Collection Analytics subsystem provides comprehensive insights and metrics across all collection data with:

- **Multi-level aggregations**: User, storage, tag, collection group, and material analytics
- **Real-time updates**: Event-sourced architecture for incremental recalculation
- **Offline-first design**: Intelligent caching with configurable TTL
- **Materialized views**: Pre-computed analytics for fast queries
- **Histogram distributions**: Weight, value, and temporal distributions
- **Growth tracking**: Historical trends and collection evolution

## System Architecture

### Data Flow

```
Collection Data → Analytics Events → Cache Invalidation → Materialized Views → API Response
     ↓                                                            ↓
  Specimens                                                  User Analytics
  Storage                                                    Storage Analytics
  Tags                                                       Tag Analytics
  Collections                                                Group Analytics
                                                            Material Analytics
                                                            Time Period Analytics
```

### Analytics Levels

```typescript
enum AnalyticsLevel {
  USER = 'USER', // User-wide overview
  STORAGE_LOCATION = 'STORAGE_LOCATION', // Per storage location
  TAG = 'TAG', // Per tag
  COLLECTION_GROUP = 'COLLECTION_GROUP', // Per collection group
  MATERIAL = 'MATERIAL', // Per material type
  TIME_PERIOD = 'TIME_PERIOD', // Time-based trends
}
```

---

## Core Analytics Types

### 1. User Analytics

Complete overview of user's entire collection.

**Metrics Provided:**

- Total specimens, storage locations, tags, collection groups
- Specimen distribution by state and condition
- Material distribution with top 10 materials
- Acquisition methods and year-over-year growth
- Weight and value distributions (histograms)
- Storage utilization summary
- Tag and collection usage
- Activity metrics (30/90 day additions, growth rate)
- Special flags (favorites, for sale, on display, in studio)

**Example:**

```typescript
const userAnalytics: UserAnalytics = {
  id: 'analytics-id',
  user_id: 'user-id',

  // Counts
  total_specimens: 150,
  total_storage_locations: 12,
  total_tags: 25,
  total_collection_groups: 8,

  // State distribution
  specimens_by_state: {
    STORED: 120,
    ON_DISPLAY: 20,
    IN_STUDIO: 5,
    IN_TRANSIT: 3,
    LOST: 2,
  },

  // Condition distribution
  specimens_by_condition: {
    EXCELLENT: 50,
    VERY_GOOD: 40,
    GOOD: 35,
    FAIR: 15,
    POOR: 8,
    DAMAGED: 2,
  },

  // Material distribution
  unique_materials: 30,
  top_materials: [
    { material_id: 'quartz-id', material_name: 'Quartz', count: 35, percentage: 23.3, total_weight_grams: 1500, total_value: 500 },
    { material_id: 'amethyst-id', material_name: 'Amethyst', count: 20, percentage: 13.3, total_weight_grams: 800, total_value: 2000 },
    // ... top 10
  ],

  // Acquisition
  acquisition_methods: {
    FIELD_COLLECTED: 100,
    PURCHASED: 35,
    TRADED: 10,
    GIFTED: 5,
  },

  specimens_by_year: {
    '2022': 30,
    '2023': 50,
    '2024': 70,
  },

  // Physical metrics
  total_weight_grams: 15000,
  average_weight_grams: 100,
  weight_distribution: [
    { min: 0, max: 10, count: 20, label: '0-10g' },
    { min: 10, max: 50, count: 50, label: '10-50g' },
    { min: 50, max: 100, count: 40, label: '50-100g' },
    { min: 100, max: 500, count: 30, label: '100-500g' },
    { min: 500, max: 1000, count: 8, label: '500g-1kg' },
    { min: 1000, max: Infinity, count: 2, label: '>1kg' },
  ],

  // Financial metrics
  total_estimated_value: 12000,
  average_estimated_value: 80,
  value_distribution: [...],
  total_acquisition_cost: 5000,

  // Storage
  storage_utilization: {
    total_locations: 12,
    locations_with_capacity: 10,
    total_capacity: 500,
    total_used: 120,
    overall_utilization_percentage: 24,
    locations_full: 1,
    locations_nearly_full: 2,
    locations_available: 9,
  },
  specimens_without_storage: 30,

  // Organization
  average_tags_per_specimen: 2.5,
  specimens_without_tags: 15,
  specimens_in_collections: 100,
  specimens_in_multiple_collections: 25,

  // Activity
  specimens_added_last_30_days: 12,
  specimens_added_last_90_days: 35,
  growth_rate_monthly: 8.7, // percentage

  // Special flags
  favorite_specimens: 20,
  specimens_for_sale: 5,
  specimens_for_trade: 3,
  specimens_on_display: 20,
  specimens_in_studio: 5,

  // Cache metadata
  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),
  calculation_time_ms: 150,

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

### 2. Storage Location Analytics

Per-location capacity, utilization, and content analysis.

**Metrics Provided:**

- Capacity and utilization percentage
- Material distribution in location
- Condition and physical metrics
- Nested location counts
- Special specimens (favorites, for sale)

**Example:**

```typescript
const storageAnalytics: StorageLocationAnalytics = {
  id: 'analytics-id',
  storage_location_id: 'storage-id',
  user_id: 'user-id',

  // Basic info
  location_name: 'Display Cabinet A',
  location_type: 'DISPLAY_CASE',
  location_code: 'DC-A',

  // Capacity
  capacity: 50,
  current_count: 48,
  utilization_percentage: 96,
  available_capacity: 2,
  is_at_capacity: false,
  is_nearly_full: true, // >= 90%

  // Material distribution
  materials_stored: [
    { material_id: 'quartz-id', material_name: 'Quartz', count: 20, percentage: 41.7 },
    { material_id: 'amethyst-id', material_name: 'Amethyst', count: 15, percentage: 31.3 },
    // ...
  ],
  unique_materials: 12,

  // Condition
  specimens_by_condition: {
    EXCELLENT: 35,
    VERY_GOOD: 10,
    GOOD: 3,
  },

  // Metrics
  total_weight_grams: 2400,
  total_estimated_value: 5000,
  average_weight_grams: 50,
  average_estimated_value: 104.17,

  // Special
  favorite_specimens: 12,
  specimens_for_sale: 0,

  // Nested locations
  child_location_count: 4, // shelves
  total_descendants: 16, // shelves + boxes

  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

### 3. Tag Analytics

Tag usage patterns, co-occurrence, and growth.

**Metrics Provided:**

- Specimen count and material diversity
- Condition and state distributions
- Tag co-occurrence (tags often used together)
- Growth trends (30-day additions, monthly rate)

**Example:**

```typescript
const tagAnalytics: TagAnalytics = {
  id: 'analytics-id',
  tag_id: 'tag-id',
  user_id: 'user-id',

  // Basic info
  tag_name: 'Crystals',
  tag_type: 'CATEGORY',

  // Usage
  specimen_count: 45,

  // Material distribution
  materials_tagged: [
    { material_id: 'quartz-id', material_name: 'Quartz', count: 20, percentage: 44.4 },
    { material_id: 'amethyst-id', material_name: 'Amethyst', count: 15, percentage: 33.3 },
    // ...
  ],
  unique_materials: 10,

  // Condition
  specimens_by_condition: {
    EXCELLENT: 30,
    VERY_GOOD: 10,
    GOOD: 5,
  },

  // State
  specimens_by_state: {
    STORED: 35,
    ON_DISPLAY: 8,
    IN_STUDIO: 2,
  },

  // Metrics
  total_weight_grams: 2000,
  total_estimated_value: 3500,
  average_weight_grams: 44.4,
  average_estimated_value: 77.8,

  // Co-occurrence
  frequently_combined_tags: [
    {
      tag_id: 'tag-2',
      tag_name: 'Display Worthy',
      cooccurrence_count: 25,
      cooccurrence_percentage: 55.6,
    },
    {
      tag_id: 'tag-3',
      tag_name: 'High Quality',
      cooccurrence_count: 20,
      cooccurrence_percentage: 44.4,
    },
    // ... top 5
  ],

  // Growth
  specimens_added_last_30_days: 8,
  growth_rate_monthly: 17.8,

  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

### 4. Collection Group Analytics

Comprehensive collection metrics with diversity and completeness.

**Metrics Provided:**

- Size and material diversity (Shannon index)
- Condition quality score (weighted average)
- Value and weight distributions with extremes
- Acquisition breakdown and date range
- Storage distribution
- Growth history
- Completeness score (documentation quality)
- Photo coverage

**Example:**

```typescript
const collectionAnalytics: CollectionGroupAnalytics = {
  id: 'analytics-id',
  collection_group_id: 'group-id',
  user_id: 'user-id',

  // Basic info
  group_name: 'Quartz Collection',
  group_type: 'THEMED',
  is_public: false,

  // Size
  specimen_count: 35,

  // Material distribution
  materials_in_collection: [
    { material_id: 'quartz-id', material_name: 'Clear Quartz', count: 15, percentage: 42.9 },
    { material_id: 'smoky-quartz-id', material_name: 'Smoky Quartz', count: 10, percentage: 28.6 },
    { material_id: 'rose-quartz-id', material_name: 'Rose Quartz', count: 10, percentage: 28.6 },
  ],
  unique_materials: 3,
  material_diversity_index: 1.05, // Shannon index

  // Condition
  specimens_by_condition: {
    EXCELLENT: 20,
    VERY_GOOD: 10,
    GOOD: 5,
  },
  condition_quality_score: 8.6, // weighted 0-10

  // State
  specimens_by_state: {
    STORED: 25,
    ON_DISPLAY: 8,
    IN_STUDIO: 2,
  },

  // Metrics
  total_weight_grams: 1750,
  total_estimated_value: 4500,
  average_weight_grams: 50,
  average_estimated_value: 128.57,

  // Value distribution
  value_distribution: [
    { min: 0, max: 50, count: 10, label: '$0-$50' },
    { min: 50, max: 100, count: 15, label: '$50-$100' },
    { min: 100, max: 500, count: 8, label: '$100-$500' },
    { min: 500, max: Infinity, count: 2, label: '>$500' },
  ],
  most_valuable_specimen_id: 'specimen-123',
  least_valuable_specimen_id: 'specimen-456',

  // Weight distribution
  weight_distribution: [...],
  heaviest_specimen_id: 'specimen-789',
  lightest_specimen_id: 'specimen-012',

  // Acquisition
  acquisition_methods: {
    FIELD_COLLECTED: 25,
    PURCHASED: 8,
    TRADED: 2,
  },
  acquisition_date_range: {
    earliest: new Date('2022-03-15'),
    latest: new Date('2024-11-20'),
  },

  // Storage
  storage_locations: [
    { storage_location_id: 'storage-1', location_name: 'Display Case A', location_code: 'DC-A', count: 20, percentage: 57.1 },
    { storage_location_id: 'storage-2', location_name: 'Storage Box 3', location_code: 'SB-03', count: 15, percentage: 42.9 },
  ],
  specimens_without_storage: 0,

  // Growth
  specimens_added_last_30_days: 5,
  specimens_added_last_90_days: 12,
  growth_rate_monthly: 14.3,
  growth_history: [
    { date: new Date('2024-06-01'), specimen_count: 5, cumulative_count: 25, total_weight_grams: 1250, total_value: 3200 },
    { date: new Date('2024-07-01'), specimen_count: 3, cumulative_count: 28, total_weight_grams: 1400, total_value: 3600 },
    { date: new Date('2024-08-01'), specimen_count: 2, cumulative_count: 30, total_weight_grams: 1500, total_value: 3900 },
    // ...
  ],

  // Completeness
  completeness_score: 85.7, // 0-100
  specimens_with_photos: 32,
  specimens_with_description: 30,
  average_photos_per_specimen: 2.8,

  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

### 5. Material Analytics

Material-specific collection insights.

**Metrics Provided:**

- Specimen count and varieties
- Condition and physical metrics
- Color and hardness distributions
- Acquisition sources and methods
- Geographic collection locations
- Storage and organization

**Example:**

```typescript
const materialAnalytics: MaterialAnalytics = {
  id: 'analytics-id',
  material_id: 'quartz-id',
  user_id: 'user-id',

  // Basic info
  material_name: 'Quartz',

  // Count
  specimen_count: 35,

  // Varieties
  varieties: [
    { variety: 'Clear', count: 15, percentage: 42.9 },
    { variety: 'Smoky', count: 10, percentage: 28.6 },
    { variety: 'Rose', count: 10, percentage: 28.6 },
  ],
  unique_varieties: 3,

  // Condition
  specimens_by_condition: {
    EXCELLENT: 20,
    VERY_GOOD: 10,
    GOOD: 5,
  },
  average_condition_score: 8.6,

  // State
  specimens_by_state: {
    STORED: 25,
    ON_DISPLAY: 8,
    IN_STUDIO: 2,
  },

  // Metrics
  total_weight_grams: 1750,
  total_estimated_value: 3500,
  average_weight_grams: 50,
  average_estimated_value: 100,

  // Physical properties
  color_distribution: {
    Clear: 15,
    Gray: 10,
    Pink: 10,
  },
  hardness_mohs_range: {
    min: 7.0,
    max: 7.0,
    average: 7.0,
  },

  // Acquisition
  acquisition_methods: {
    FIELD_COLLECTED: 25,
    PURCHASED: 8,
    TRADED: 2,
  },
  sources: [
    { source: 'Crystal Peak, Colorado', count: 12, percentage: 34.3 },
    { source: 'Mount Ida, Arkansas', count: 8, percentage: 22.9 },
    // ...
  ],

  // Collection locations
  collection_locations: [
    { location: 'Colorado', count: 15, percentage: 42.9 },
    { location: 'Arkansas', count: 10, percentage: 28.6 },
    { location: 'California', count: 10, percentage: 28.6 },
  ],

  // Storage
  storage_locations: [
    {
      storage_location_id: 'storage-1',
      location_name: 'Display Case A',
      location_code: 'DC-A',
      count: 20,
      percentage: 57.1,
    },
    {
      storage_location_id: 'storage-2',
      location_name: 'Storage Box 3',
      location_code: 'SB-03',
      count: 15,
      percentage: 42.9,
    },
  ],

  // Organization
  tags_applied: [
    { tag_id: 'tag-1', tag_name: 'Crystals', count: 30 },
    { tag_id: 'tag-2', tag_name: 'Display Worthy', count: 20 },
  ],
  collection_groups: [
    { collection_group_id: 'group-1', group_name: 'Quartz Collection', count: 35 },
  ],

  // Growth
  specimens_added_last_30_days: 5,
  first_specimen_date: new Date('2022-03-15'),
  latest_specimen_date: new Date('2024-11-20'),

  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

### 6. Time Period Analytics

Historical growth tracking and trends.

**Metrics Provided:**

- Activity counts (added, updated, removed, net change)
- Total metrics at period end
- Acquisition breakdown by method
- State transition tracking
- Top materials added
- Growth rate percentage

**Example:**

```typescript
const timePeriodAnalytics: TimePeriodAnalytics = {
  id: 'analytics-id',
  user_id: 'user-id',

  // Period definition
  period_start: new Date('2024-06-01'),
  period_end: new Date('2024-06-30'),
  granularity: TimePeriodGranularity.MONTH,
  period_label: '2024-06',

  // Activity
  specimens_added: 15,
  specimens_updated: 25,
  specimens_removed: 2,
  net_change: 13,

  // Total at end
  total_specimens: 150,
  total_weight_grams: 15000,
  total_estimated_value: 12000,

  // Acquisition
  specimens_field_collected: 10,
  specimens_purchased: 4,
  specimens_traded: 1,
  specimens_gifted: 0,

  // State changes
  specimens_stored: 12,
  specimens_displayed: 2,
  specimens_sent_to_studio: 1,
  specimens_sold: 0,

  // Material distribution
  top_materials_added: [
    { material_id: 'quartz-id', material_name: 'Quartz', count: 6, percentage: 40.0 },
    { material_id: 'amethyst-id', material_name: 'Amethyst', count: 4, percentage: 26.7 },
    // ...
  ],

  // Growth rate
  growth_rate_percentage: 8.7,

  cache_status: CacheStatus.FRESH,
  calculated_at: new Date(),

  created_at: new Date(),
  updated_at: new Date(),
};
```

---

## Caching Strategy

### Cache Architecture

```typescript
interface AnalyticsCache {
  id: string;
  user_id: string;
  cache_key: string; // 'USER', 'TAG:tag-id', etc.
  level: AnalyticsLevel;
  entity_id?: string;

  // Cached data
  data: unknown; // Serialized analytics

  // Cache control
  status: CacheStatus; // FRESH, STALE, CALCULATING, ERROR
  ttl_seconds: number;
  expires_at: Date;

  // Metadata
  calculation_time_ms: number;
  data_size_bytes: number;
  dependencies: string[]; // Entity IDs

  // Access tracking
  created_at: Date;
  updated_at: Date;
  accessed_at: Date;
  access_count: number;
}
```

### TTL Configuration

```typescript
const CACHE_TTL = {
  USER: 300, // 5 minutes
  STORAGE_LOCATION: 600, // 10 minutes
  TAG: 600, // 10 minutes
  COLLECTION_GROUP: 600, // 10 minutes
  MATERIAL: 900, // 15 minutes
  TIME_PERIOD: 86400, // 24 hours
};
```

### Cache Invalidation

```typescript
// Triggered by entity changes
interface AnalyticsUpdateEvent {
  id: string;
  user_id: string;
  event_type: string; // 'specimen.created', 'specimen.updated'
  entity_type: string; // 'specimen', 'storage_location'
  entity_id: string;

  affected_levels: AnalyticsLevel[];
  affected_entities: string[];

  processed: boolean;
  processed_at?: Date;
  created_at: Date;
}
```

**Invalidation Rules:**

- Specimen changes → Invalidate USER, STORAGE_LOCATION, TAG, COLLECTION_GROUP, MATERIAL
- Storage location changes → Invalidate USER, STORAGE_LOCATION
- Tag changes → Invalidate USER, TAG
- Collection group changes → Invalidate USER, COLLECTION_GROUP

---

## Event-Sourced Updates

### Update Flow

```
1. Entity Change → Trigger creates AnalyticsUpdateEvent
2. Background processor picks up events
3. Invalidate affected caches (mark as STALE)
4. Next request triggers recalculation
5. Cache updated with FRESH status
```

### Processing Events

```typescript
// Process pending events (run periodically)
const processedCount = await processAnalyticsUpdateEvents();
// Returns number of events processed

// Manual refresh of all views
await refreshAnalyticsViews();
```

---

## Materialized Views

### Purpose

Pre-computed analytics for fast queries without real-time calculation overhead.

### Available Views

1. **user_analytics_mv**: User-level overview
2. **storage_location_analytics_mv**: Per-location metrics
3. **tag_analytics_mv**: Per-tag usage and patterns
4. **collection_group_analytics_mv**: Per-group comprehensive metrics
5. **material_analytics_mv**: Per-material insights

### Refresh Strategy

- **Incremental**: Triggered by analytics update events (cache invalidation)
- **Scheduled**: Background refresh every 5-15 minutes (configurable)
- **On-demand**: Manual refresh via `refresh_analytics_views()` function

---

## Integration Patterns

### 1. Fetching Analytics (Client)

```typescript
import { get_user_analytics } from '@/lib/supabase';

// Fetch user analytics (uses cache if available)
const analytics = await supabase.rpc('get_user_analytics', {
  p_user_id: userId,
});

// Check cache freshness
if (analytics.cache_status === CacheStatus.STALE) {
  // Optionally trigger background refresh
  await triggerAnalyticsRefresh(userId);
}
```

### 2. Dashboard Display

```typescript
// Display user overview
const UserDashboard = ({ analytics }: { analytics: UserAnalytics }) => {
  return (
    <div>
      <h1>Collection Overview</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Specimens" value={analytics.total_specimens} />
        <StatCard label="Unique Materials" value={analytics.unique_materials} />
        <StatCard label="Total Value" value={`$${analytics.total_estimated_value}`} />
        <StatCard label="Monthly Growth" value={`${analytics.growth_rate_monthly}%`} />
      </div>

      {/* Material distribution chart */}
      <MaterialDistributionChart materials={analytics.top_materials} />

      {/* Weight histogram */}
      <HistogramChart
        data={analytics.weight_distribution}
        title="Weight Distribution"
      />

      {/* Condition breakdown */}
      <PieChart
        data={analytics.specimens_by_condition}
        title="Condition Distribution"
      />

      {/* Storage utilization */}
      <StorageUtilizationWidget utilization={analytics.storage_utilization} />
    </div>
  );
};
```

### 3. Storage Location Insights

```typescript
// Display storage location card with utilization
const StorageLocationCard = ({ locationId }: { locationId: string }) => {
  const { data: analytics } = useQuery(
    ['storage-analytics', locationId],
    () => fetchStorageLocationAnalytics(locationId)
  );

  if (!analytics) return <Spinner />;

  const utilizationColor =
    analytics.is_at_capacity ? 'red' :
    analytics.is_nearly_full ? 'yellow' :
    'green';

  return (
    <div className="card">
      <h3>{analytics.location_name}</h3>
      <p className="text-sm text-gray-500">{analytics.location_code}</p>

      {/* Capacity bar */}
      <div className="mt-2">
        <div className="flex justify-between text-sm">
          <span>Capacity</span>
          <span>{analytics.current_count} / {analytics.capacity}</span>
        </div>
        <ProgressBar
          value={analytics.utilization_percentage}
          color={utilizationColor}
        />
      </div>

      {/* Top materials */}
      <div className="mt-4">
        <h4 className="text-sm font-medium">Top Materials</h4>
        <ul className="mt-2 space-y-1">
          {analytics.materials_stored.slice(0, 5).map(material => (
            <li key={material.material_id} className="text-sm">
              {material.material_name} ({material.count})
            </li>
          ))}
        </ul>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Total Weight</span>
          <p className="font-medium">{analytics.total_weight_grams}g</p>
        </div>
        <div>
          <span className="text-gray-500">Total Value</span>
          <p className="font-medium">${analytics.total_estimated_value}</p>
        </div>
      </div>
    </div>
  );
};
```

### 4. Tag Analytics View

```typescript
// Display tag usage and co-occurrence
const TagAnalyticsView = ({ tagId }: { tagId: string }) => {
  const { data: analytics } = useQuery(
    ['tag-analytics', tagId],
    () => fetchTagAnalytics(tagId)
  );

  if (!analytics) return <Spinner />;

  return (
    <div>
      <h2>Tag: {analytics.tag_name}</h2>

      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Specimens Tagged" value={analytics.specimen_count} />
        <StatCard label="Unique Materials" value={analytics.unique_materials} />
        <StatCard label="Total Value" value={`$${analytics.total_estimated_value}`} />
      </div>

      {/* Co-occurrence */}
      <div className="mt-6">
        <h3>Frequently Combined With</h3>
        <div className="space-y-2">
          {analytics.frequently_combined_tags.map(tag => (
            <div key={tag.tag_id} className="flex items-center justify-between">
              <TagBadge name={tag.tag_name} />
              <span className="text-sm text-gray-500">
                {tag.cooccurrence_percentage}% ({tag.cooccurrence_count} specimens)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Material distribution */}
      <div className="mt-6">
        <h3>Material Distribution</h3>
        <BarChart data={analytics.materials_tagged} />
      </div>

      {/* Growth trend */}
      <div className="mt-6">
        <h3>Growth</h3>
        <p className="text-sm text-gray-600">
          Added {analytics.specimens_added_last_30_days} specimens in last 30 days
        </p>
        <p className="text-sm text-gray-600">
          Growing at {analytics.growth_rate_monthly}% per month
        </p>
      </div>
    </div>
  );
};
```

### 5. Collection Group Report

```typescript
// Comprehensive collection group analytics
const CollectionGroupReport = ({ groupId }: { groupId: string }) => {
  const { data: analytics } = useQuery(
    ['group-analytics', groupId],
    () => fetchCollectionGroupAnalytics(groupId)
  );

  if (!analytics) return <Spinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1>{analytics.group_name}</h1>
        <p className="text-gray-600">{analytics.group_type} Collection</p>
        <div className="mt-2 flex gap-4">
          <Badge>{analytics.specimen_count} specimens</Badge>
          <Badge>{analytics.unique_materials} materials</Badge>
          <Badge>Diversity: {analytics.material_diversity_index.toFixed(2)}</Badge>
        </div>
      </div>

      {/* Quality metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Condition Quality Score"
          value={analytics.condition_quality_score.toFixed(1)}
          max={10}
        />
        <MetricCard
          label="Completeness Score"
          value={`${analytics.completeness_score.toFixed(0)}%`}
        />
      </div>

      {/* Value analysis */}
      <div>
        <h2>Value Analysis</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Value" value={`$${analytics.total_estimated_value}`} />
          <StatCard label="Average Value" value={`$${analytics.average_estimated_value.toFixed(2)}`} />
          <StatCard label="Total Weight" value={`${analytics.total_weight_grams}g`} />
        </div>
        <HistogramChart
          data={analytics.value_distribution}
          title="Value Distribution"
        />
      </div>

      {/* Material breakdown */}
      <div>
        <h2>Material Composition</h2>
        <PieChart
          data={analytics.materials_in_collection}
          labelKey="material_name"
          valueKey="count"
        />
      </div>

      {/* Growth history */}
      <div>
        <h2>Growth Over Time</h2>
        <LineChart
          data={analytics.growth_history}
          xKey="date"
          yKey="cumulative_count"
          title="Specimen Count"
        />
      </div>

      {/* Storage distribution */}
      <div>
        <h2>Storage Locations</h2>
        <StorageDistributionList locations={analytics.storage_locations} />
      </div>

      {/* Acquisition */}
      <div>
        <h2>Acquisition History</h2>
        <p className="text-sm text-gray-600">
          Collection spans from {formatDate(analytics.acquisition_date_range.earliest)}
          to {formatDate(analytics.acquisition_date_range.latest)}
        </p>
        <BarChart
          data={Object.entries(analytics.acquisition_methods).map(([method, count]) => ({
            method,
            count,
          }))}
          xKey="method"
          yKey="count"
        />
      </div>
    </div>
  );
};
```

### 6. Material Insights Page

```typescript
// Material-specific analytics dashboard
const MaterialInsightsPage = ({ materialId }: { materialId: string }) => {
  const { data: analytics } = useQuery(
    ['material-analytics', materialId],
    () => fetchMaterialAnalytics(materialId)
  );

  if (!analytics) return <Spinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1>{analytics.material_name}</h1>
        <div className="mt-2 flex gap-4">
          <Badge>{analytics.specimen_count} specimens</Badge>
          <Badge>{analytics.unique_varieties} varieties</Badge>
        </div>
      </div>

      {/* Varieties */}
      <div>
        <h2>Varieties</h2>
        <BarChart
          data={analytics.varieties}
          xKey="variety"
          yKey="count"
        />
      </div>

      {/* Physical properties */}
      <div>
        <h2>Physical Properties</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3>Hardness (Mohs)</h3>
            <p>
              {analytics.hardness_mohs_range?.min} - {analytics.hardness_mohs_range?.max}
              (avg: {analytics.hardness_mohs_range?.average})
            </p>
          </div>
          <div>
            <h3>Color Distribution</h3>
            <PieChart data={analytics.color_distribution} />
          </div>
        </div>
      </div>

      {/* Geographic distribution */}
      <div>
        <h2>Collection Locations</h2>
        <MapView locations={analytics.collection_locations} />
      </div>

      {/* Sources */}
      <div>
        <h2>Acquisition Sources</h2>
        <ul className="space-y-2">
          {analytics.sources.map(source => (
            <li key={source.source} className="flex justify-between">
              <span>{source.source}</span>
              <span className="text-gray-500">
                {source.count} ({source.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Storage */}
      <div>
        <h2>Storage Distribution</h2>
        <StorageDistributionList locations={analytics.storage_locations} />
      </div>

      {/* Timeline */}
      <div>
        <h2>Collection Timeline</h2>
        <p className="text-sm text-gray-600">
          First specimen: {formatDate(analytics.first_specimen_date)}
        </p>
        <p className="text-sm text-gray-600">
          Latest specimen: {formatDate(analytics.latest_specimen_date)}
        </p>
        <p className="text-sm text-gray-600">
          Added {analytics.specimens_added_last_30_days} in last 30 days
        </p>
      </div>
    </div>
  );
};
```

---

## Advanced Calculations

### Material Diversity Index (Shannon)

Measures variety in material distribution:

```typescript
H = -Σ(p_i * ln(p_i))

where:
- p_i = proportion of material i
- Higher values = more diverse collection
```

**Example:**

```typescript
const materialCounts = {
  Quartz: 50,
  Amethyst: 30,
  Calcite: 20,
};

const diversity = calculateMaterialDiversity(materialCounts);
// H ≈ 1.03 (moderately diverse)
```

### Condition Quality Score

Weighted average of condition distribution:

```typescript
Score = Σ(condition_weight * count) / total_count

Weights:
- EXCELLENT: 10
- VERY_GOOD: 8
- GOOD: 6
- FAIR: 4
- POOR: 2
- DAMAGED: 1
```

**Example:**

```typescript
const specimensByCondition = {
  EXCELLENT: 20,
  VERY_GOOD: 15,
  GOOD: 10,
  FAIR: 5,
};

const score = calculateConditionQualityScore(specimensByCondition);
// (20*10 + 15*8 + 10*6 + 5*4) / 50 = 7.6
```

### Completeness Score

Measures documentation quality:

```typescript
Score = (fields_completed / total_fields) * 100

Fields per specimen:
- Title (1 point)
- Description (1 point)
- Photos (1 point)
- Weight (1 point)
- Dimensions (1 point)

Max: 5 points per specimen
```

**Example:**

```typescript
const specimens = [
  {
    title: 'Quartz',
    description: 'Clear',
    photos: ['img1.jpg'],
    weight: 50,
    dimensions: '30x20x15',
  }, // 5 points
  { title: 'Amethyst', description: null, photos: [], weight: null, dimensions: null }, // 1 point
];

const score = calculateCompletenessScore(specimens);
// (5 + 1) / 10 = 60%
```

---

## Performance Optimization

### Materialized Views

- **Concurrent refresh**: No table locks during refresh
- **Indexed**: Primary keys on all views for fast lookups
- **Partitioned**: Consider partitioning by user_id for large datasets

### Caching

- **Layered**: Database cache → Redis cache → Client cache
- **TTL-based**: Automatic expiration with configurable lifetimes
- **Access tracking**: Monitor cache hit rates

### Query Optimization

```sql
-- Use materialized views for fast queries
SELECT * FROM user_analytics_mv WHERE user_id = $1;

-- Leverage indexes
CREATE INDEX idx_specimens_user_material ON specimens(user_id, material_id);
CREATE INDEX idx_specimens_acquisition_date ON specimens(acquisition_date);
```

---

## Offline Support

### Client-Side Caching

```typescript
// IndexedDB schema
interface CachedAnalytics {
  level: AnalyticsLevel;
  entity_id?: string;
  data: unknown;
  cached_at: number;
  expires_at: number;
}

// Fetch with offline fallback
async function getAnalytics(level: AnalyticsLevel, entityId?: string) {
  // Try online fetch
  try {
    const data = await fetchFromServer(level, entityId);
    await cacheLocally(data);
    return data;
  } catch (error) {
    // Fallback to cached data
    return await getCachedAnalytics(level, entityId);
  }
}
```

### Sync Strategy

```typescript
// Queue analytics recalculation when back online
async function syncAnalytics() {
  const pendingEvents = await getUnprocessedEvents();

  for (const event of pendingEvents) {
    await processAnalyticsUpdateEvent(event);
  }

  // Refresh materialized views
  await refreshAnalyticsViews();

  // Invalidate client caches
  await invalidateClientCaches();
}
```

---

## Best Practices

### 1. Query Optimization

- Always use materialized views for dashboards
- Leverage cache for frequently accessed analytics
- Batch refresh operations during off-peak hours

### 2. Cache Management

- Set appropriate TTL based on data volatility
- Monitor cache hit rates and adjust TTL accordingly
- Clear stale caches periodically

### 3. Event Processing

- Process events in batches (100 at a time)
- Run background processor on schedule (every 5 minutes)
- Handle errors gracefully with retry logic

### 4. UI/UX

- Show cache status (FRESH, STALE) to users
- Display calculation time for transparency
- Provide manual refresh button for on-demand updates

### 5. Monitoring

- Track calculation times
- Monitor cache hit rates
- Alert on processing failures

---

## Summary

The Collection Analytics subsystem provides:

- **6 levels of analytics**: User, storage, tag, collection group, material, and time period
- **Real-time updates**: Event-sourced architecture with cache invalidation
- **Fast queries**: Materialized views with concurrent refresh
- **Offline support**: Client-side caching with sync on reconnect
- **Rich metrics**: Distributions, diversity indices, quality scores, growth trends
- **Flexible caching**: Configurable TTL with access tracking

This enables users to:

- Track collection growth over time
- Analyze material distributions and diversity
- Monitor storage utilization
- Identify valuable specimens
- Understand tagging patterns
- Measure collection completeness

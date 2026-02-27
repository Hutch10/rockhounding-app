/**
 * Collection Insights & Analytics Schema
 * 
 * Complete analytics system for specimen collections with:
 * - Multi-level aggregations (specimen, storage, tag, collection group, user)
 * - Event-sourced updates for real-time metrics
 * - Offline-first with intelligent caching
 * - Histogram distributions for weight, value, and dates
 * - Growth tracking over time
 * - Integration with all collection systems
 */

import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

/**
 * Analytics aggregation levels
 */
export enum AnalyticsLevel {
  USER = 'USER',                         // User-wide analytics
  STORAGE_LOCATION = 'STORAGE_LOCATION', // Per storage location
  TAG = 'TAG',                           // Per tag
  COLLECTION_GROUP = 'COLLECTION_GROUP', // Per collection group
  MATERIAL = 'MATERIAL',                 // Per material type
  TIME_PERIOD = 'TIME_PERIOD',           // Time-based (month, year)
}

/**
 * Time period granularity
 */
export enum TimePeriodGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

/**
 * Cache status for offline operation
 */
export enum CacheStatus {
  FRESH = 'FRESH',                       // Recently calculated
  STALE = 'STALE',                       // Needs refresh
  CALCULATING = 'CALCULATING',           // Currently recalculating
  ERROR = 'ERROR',                       // Calculation error
}

// =====================================================
// CORE ANALYTICS INTERFACES
// =====================================================

/**
 * User-level analytics snapshot
 * Complete overview of user's entire collection
 */
export interface UserAnalytics {
  id: string;
  user_id: string;
  
  // Overall counts
  total_specimens: number;
  total_storage_locations: number;
  total_tags: number;
  total_collection_groups: number;
  
  // Specimen state distribution
  specimens_by_state: Record<string, number>; // { "STORED": 120, "ON_DISPLAY": 20, ... }
  specimens_by_condition: Record<string, number>; // { "EXCELLENT": 30, "GOOD": 50, ... }
  
  // Material distribution
  unique_materials: number;
  top_materials: MaterialCount[];         // Top 10 materials
  material_distribution: Record<string, number>; // All materials with counts
  
  // Acquisition
  acquisition_methods: Record<string, number>; // { "FIELD_COLLECTED": 80, "PURCHASED": 20, ... }
  specimens_by_year: Record<string, number>; // { "2024": 50, "2025": 30, ... }
  
  // Physical metrics
  total_weight_grams: number;
  average_weight_grams: number;
  weight_distribution: HistogramBin[];   // Weight histogram
  
  // Financial metrics
  total_estimated_value: number;
  average_estimated_value: number;
  value_distribution: HistogramBin[];    // Value histogram
  total_acquisition_cost: number;
  
  // Storage
  storage_utilization: StorageUtilization;
  specimens_without_storage: number;
  
  // Organization
  average_tags_per_specimen: number;
  specimens_without_tags: number;
  specimens_in_collections: number;
  specimens_in_multiple_collections: number;
  
  // Activity
  specimens_added_last_30_days: number;
  specimens_added_last_90_days: number;
  growth_rate_monthly: number;           // Percentage
  
  // Special flags
  favorite_specimens: number;
  specimens_for_sale: number;
  specimens_for_trade: number;
  specimens_on_display: number;
  specimens_in_studio: number;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  calculation_time_ms: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Storage location analytics
 */
export interface StorageLocationAnalytics {
  id: string;
  storage_location_id: string;
  user_id: string;
  
  // Basic info
  location_name: string;
  location_type: string;
  location_code?: string;
  
  // Capacity
  capacity?: number;
  current_count: number;
  utilization_percentage?: number;
  available_capacity?: number;
  is_at_capacity: boolean;
  is_nearly_full: boolean;                // >= 90%
  
  // Material distribution
  materials_stored: MaterialCount[];
  unique_materials: number;
  
  // Condition distribution
  specimens_by_condition: Record<string, number>;
  
  // Metrics
  total_weight_grams: number;
  total_estimated_value: number;
  average_weight_grams: number;
  average_estimated_value: number;
  
  // Special specimens
  favorite_specimens: number;
  specimens_for_sale: number;
  
  // Nested locations (if parent)
  child_location_count?: number;
  total_descendants?: number;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Tag analytics
 */
export interface TagAnalytics {
  id: string;
  tag_id: string;
  user_id: string;
  
  // Basic info
  tag_name: string;
  tag_type: string;
  
  // Usage
  specimen_count: number;
  
  // Material distribution
  materials_tagged: MaterialCount[];
  unique_materials: number;
  
  // Condition distribution
  specimens_by_condition: Record<string, number>;
  
  // State distribution
  specimens_by_state: Record<string, number>;
  
  // Metrics
  total_weight_grams: number;
  total_estimated_value: number;
  average_weight_grams: number;
  average_estimated_value: number;
  
  // Co-occurrence (tags often used together)
  frequently_combined_tags: TagCooccurrence[];
  
  // Growth
  specimens_added_last_30_days: number;
  growth_rate_monthly: number;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Collection group analytics
 */
export interface CollectionGroupAnalytics {
  id: string;
  collection_group_id: string;
  user_id: string;
  
  // Basic info
  group_name: string;
  group_type: string;
  is_public: boolean;
  
  // Size
  specimen_count: number;
  
  // Material distribution
  materials_in_collection: MaterialCount[];
  unique_materials: number;
  material_diversity_index: number;      // Shannon diversity index
  
  // Condition distribution
  specimens_by_condition: Record<string, number>;
  condition_quality_score: number;       // Weighted average
  
  // State distribution
  specimens_by_state: Record<string, number>;
  
  // Metrics
  total_weight_grams: number;
  total_estimated_value: number;
  average_weight_grams: number;
  average_estimated_value: number;
  
  // Value distribution
  value_distribution: HistogramBin[];
  most_valuable_specimen_id?: string;
  least_valuable_specimen_id?: string;
  
  // Physical properties
  weight_distribution: HistogramBin[];
  heaviest_specimen_id?: string;
  lightest_specimen_id?: string;
  
  // Acquisition
  acquisition_methods: Record<string, number>;
  acquisition_date_range: {
    earliest: Date;
    latest: Date;
  };
  
  // Storage distribution
  storage_locations: StorageLocationCount[];
  specimens_without_storage: number;
  
  // Growth
  specimens_added_last_30_days: number;
  specimens_added_last_90_days: number;
  growth_rate_monthly: number;
  growth_history: GrowthDataPoint[];     // Historical growth
  
  // Completeness
  completeness_score: number;            // 0-100, based on documentation
  specimens_with_photos: number;
  specimens_with_description: number;
  average_photos_per_specimen: number;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Material-level analytics
 */
export interface MaterialAnalytics {
  id: string;
  material_id: string;
  user_id: string;
  
  // Basic info
  material_name: string;
  
  // Count
  specimen_count: number;
  
  // Varieties
  varieties: VarietyCount[];
  unique_varieties: number;
  
  // Condition distribution
  specimens_by_condition: Record<string, number>;
  average_condition_score: number;
  
  // State distribution
  specimens_by_state: Record<string, number>;
  
  // Metrics
  total_weight_grams: number;
  total_estimated_value: number;
  average_weight_grams: number;
  average_estimated_value: number;
  
  // Physical properties (aggregated)
  color_distribution: Record<string, number>;
  hardness_mohs_range?: {
    min: number;
    max: number;
    average: number;
  };
  
  // Acquisition
  acquisition_methods: Record<string, number>;
  sources: AcquisitionSource[];          // Where acquired
  
  // Collection locations (where found in field)
  collection_locations: LocationCount[];
  
  // Storage
  storage_locations: StorageLocationCount[];
  
  // Organization
  tags_applied: TagCount[];
  collection_groups: CollectionGroupCount[];
  
  // Growth
  specimens_added_last_30_days: number;
  first_specimen_date: Date;
  latest_specimen_date: Date;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Time period analytics (growth tracking)
 */
export interface TimePeriodAnalytics {
  id: string;
  user_id: string;
  
  // Period definition
  period_start: Date;
  period_end: Date;
  granularity: TimePeriodGranularity;
  period_label: string;                  // "2024-06", "Q2 2024", etc.
  
  // Activity
  specimens_added: number;
  specimens_updated: number;
  specimens_removed: number;
  net_change: number;
  
  // Total at end of period
  total_specimens: number;
  total_weight_grams: number;
  total_estimated_value: number;
  
  // Acquisition breakdown
  specimens_field_collected: number;
  specimens_purchased: number;
  specimens_traded: number;
  specimens_gifted: number;
  
  // State changes
  specimens_stored: number;
  specimens_displayed: number;
  specimens_sent_to_studio: number;
  specimens_sold: number;
  
  // Material distribution
  top_materials_added: MaterialCount[];
  
  // Growth rate
  growth_rate_percentage: number;
  
  // Cache metadata
  cache_status: CacheStatus;
  calculated_at: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// SUPPORTING TYPES
// =====================================================

/**
 * Material count with metadata
 */
export interface MaterialCount {
  material_id: string;
  material_name: string;
  count: number;
  percentage: number;
  total_weight_grams?: number;
  total_value?: number;
}

/**
 * Variety count
 */
export interface VarietyCount {
  variety: string;
  count: number;
  percentage: number;
}

/**
 * Histogram bin for distributions
 */
export interface HistogramBin {
  min: number;
  max: number;
  count: number;
  label: string;                         // "0-10g", "$50-$100", etc.
}

/**
 * Storage utilization summary
 */
export interface StorageUtilization {
  total_locations: number;
  locations_with_capacity: number;
  total_capacity?: number;
  total_used: number;
  overall_utilization_percentage?: number;
  locations_full: number;
  locations_nearly_full: number;          // >= 90%
  locations_available: number;
}

/**
 * Tag co-occurrence
 */
export interface TagCooccurrence {
  tag_id: string;
  tag_name: string;
  cooccurrence_count: number;
  cooccurrence_percentage: number;
}

/**
 * Storage location count
 */
export interface StorageLocationCount {
  storage_location_id: string;
  location_name: string;
  location_code?: string;
  count: number;
  percentage: number;
}

/**
 * Tag count
 */
export interface TagCount {
  tag_id: string;
  tag_name: string;
  count: number;
}

/**
 * Collection group count
 */
export interface CollectionGroupCount {
  collection_group_id: string;
  group_name: string;
  count: number;
}

/**
 * Location count (geographic)
 */
export interface LocationCount {
  location: string;
  count: number;
  percentage: number;
}

/**
 * Acquisition source
 */
export interface AcquisitionSource {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Growth data point
 */
export interface GrowthDataPoint {
  date: Date;
  specimen_count: number;
  cumulative_count: number;
  total_weight_grams: number;
  total_value: number;
}

// =====================================================
// ANALYTICS CACHE
// =====================================================

/**
 * Analytics cache entry
 */
export interface AnalyticsCache {
  id: string;
  user_id: string;
  cache_key: string;                     // Unique identifier for cached data
  level: AnalyticsLevel;
  entity_id?: string;                    // ID of storage location, tag, etc.
  
  // Cached data
  data: unknown;                         // Serialized analytics data
  
  // Cache control
  status: CacheStatus;
  ttl_seconds: number;                   // Time to live
  expires_at: Date;
  
  // Metadata
  calculation_time_ms: number;
  data_size_bytes: number;
  dependencies: string[];                // Entity IDs this cache depends on
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  accessed_at: Date;
  access_count: number;
}

// =====================================================
// EVENT-SOURCED UPDATE TRACKING
// =====================================================

/**
 * Analytics update event
 * Tracks which analytics need recalculation
 */
export interface AnalyticsUpdateEvent {
  id: string;
  user_id: string;
  event_type: string;                    // 'specimen.created', 'specimen.updated', etc.
  entity_type: string;                   // 'specimen', 'storage_location', etc.
  entity_id: string;
  
  // Affected analytics
  affected_levels: AnalyticsLevel[];
  affected_entities: string[];           // IDs of affected entities
  
  // Processing
  processed: boolean;
  processed_at?: Date;
  
  // Timestamps
  created_at: Date;
}

// =====================================================
// ZOD VALIDATION SCHEMAS
// =====================================================

export const MaterialCountSchema = z.object({
  material_id: z.string(),
  material_name: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  total_weight_grams: z.number().nonnegative().optional(),
  total_value: z.number().nonnegative().optional(),
});

export const HistogramBinSchema = z.object({
  min: z.number(),
  max: z.number(),
  count: z.number().int().nonnegative(),
  label: z.string(),
});

export const StorageUtilizationSchema = z.object({
  total_locations: z.number().int().nonnegative(),
  locations_with_capacity: z.number().int().nonnegative(),
  total_capacity: z.number().int().positive().optional(),
  total_used: z.number().int().nonnegative(),
  overall_utilization_percentage: z.number().min(0).max(100).optional(),
  locations_full: z.number().int().nonnegative(),
  locations_nearly_full: z.number().int().nonnegative(),
  locations_available: z.number().int().nonnegative(),
});

export const UserAnalyticsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  
  total_specimens: z.number().int().nonnegative(),
  total_storage_locations: z.number().int().nonnegative(),
  total_tags: z.number().int().nonnegative(),
  total_collection_groups: z.number().int().nonnegative(),
  
  specimens_by_state: z.record(z.number().int().nonnegative()),
  specimens_by_condition: z.record(z.number().int().nonnegative()),
  
  unique_materials: z.number().int().nonnegative(),
  top_materials: z.array(MaterialCountSchema),
  material_distribution: z.record(z.number().int().nonnegative()),
  
  acquisition_methods: z.record(z.number().int().nonnegative()),
  specimens_by_year: z.record(z.number().int().nonnegative()),
  
  total_weight_grams: z.number().nonnegative(),
  average_weight_grams: z.number().nonnegative(),
  weight_distribution: z.array(HistogramBinSchema),
  
  total_estimated_value: z.number().nonnegative(),
  average_estimated_value: z.number().nonnegative(),
  value_distribution: z.array(HistogramBinSchema),
  total_acquisition_cost: z.number().nonnegative(),
  
  storage_utilization: StorageUtilizationSchema,
  specimens_without_storage: z.number().int().nonnegative(),
  
  average_tags_per_specimen: z.number().nonnegative(),
  specimens_without_tags: z.number().int().nonnegative(),
  specimens_in_collections: z.number().int().nonnegative(),
  specimens_in_multiple_collections: z.number().int().nonnegative(),
  
  specimens_added_last_30_days: z.number().int().nonnegative(),
  specimens_added_last_90_days: z.number().int().nonnegative(),
  growth_rate_monthly: z.number(),
  
  favorite_specimens: z.number().int().nonnegative(),
  specimens_for_sale: z.number().int().nonnegative(),
  specimens_for_trade: z.number().int().nonnegative(),
  specimens_on_display: z.number().int().nonnegative(),
  specimens_in_studio: z.number().int().nonnegative(),
  
  cache_status: z.nativeEnum(CacheStatus),
  calculated_at: z.date(),
  calculation_time_ms: z.number().int().nonnegative(),
  
  created_at: z.date(),
  updated_at: z.date(),
});

// =====================================================
// AGGREGATION FUNCTIONS
// =====================================================

/**
 * Calculate user-level analytics from specimens
 */
export function calculateUserAnalytics(specimens: any[]): Omit<UserAnalytics, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  const startTime = Date.now();
  
  // Count specimens by state
  const specimensByState = specimens.reduce((acc, s) => {
    acc[s.state] = (acc[s.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Count specimens by condition
  const specimensByCondition = specimens.reduce((acc, s) => {
    acc[s.condition] = (acc[s.condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Material distribution
  interface MaterialCountItem {
    id: string;
    name: string;
    count: number;
    weight: number;
    value: number;
  }
  
  const materialCounts = specimens.reduce((acc, s) => {
    acc[s.material_id] = acc[s.material_id] || { id: s.material_id, name: s.material_name, count: 0, weight: 0, value: 0 };
    acc[s.material_id].count++;
    acc[s.material_id].weight += s.weight_grams || 0;
    acc[s.material_id].value += s.estimated_value || 0;
    return acc;
  }, {} as Record<string, MaterialCountItem>);
  
  const totalSpecimens = specimens.length;
  const topMaterials = (Object.values(materialCounts) as MaterialCountItem[])
    .map((m) => ({
      material_id: m.id,
      material_name: m.name,
      count: m.count,
      percentage: (m.count / totalSpecimens) * 100,
      total_weight_grams: m.weight,
      total_value: m.value,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const materialDistribution = (Object.values(materialCounts) as MaterialCountItem[]).reduce((acc, m) => {
    acc[m.id] = m.count;
    return acc;
  }, {} as Record<string, number>);
  
  // Acquisition methods
  const acquisitionMethods = specimens.reduce((acc, s) => {
    acc[s.acquisition_method] = (acc[s.acquisition_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Specimens by year
  const specimensByYear = specimens.reduce((acc, s) => {
    const year = new Date(s.acquisition_date).getFullYear().toString();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Weight metrics
  const weights = specimens.map(s => s.weight_grams || 0).filter(w => w > 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const avgWeight = weights.length > 0 ? totalWeight / weights.length : 0;
  const weightDistribution = createHistogram(weights, 'weight');
  
  // Value metrics
  const values = specimens.map(s => s.estimated_value || 0).filter(v => v > 0);
  const totalValue = values.reduce((sum, v) => sum + v, 0);
  const avgValue = values.length > 0 ? totalValue / values.length : 0;
  const valueDistribution = createHistogram(values, 'value');
  
  const totalCost = specimens.reduce((sum, s) => sum + (s.acquisition_cost || 0), 0);
  
  // Storage metrics
  const storageUtilization = calculateStorageUtilization(specimens);
  const specimensWithoutStorage = specimens.filter(s => !s.storage_location_id).length;
  
  // Tag metrics
  const totalTags = specimens.reduce((sum, s) => sum + s.tag_ids.length, 0);
  const avgTags = totalSpecimens > 0 ? totalTags / totalSpecimens : 0;
  const specimensWithoutTags = specimens.filter(s => s.tag_ids.length === 0).length;
  const specimensInCollections = specimens.filter(s => s.collection_group_ids.length > 0).length;
  const specimensInMultiple = specimens.filter(s => s.collection_group_ids.length > 1).length;
  
  // Activity metrics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  const addedLast30 = specimens.filter(s => new Date(s.created_at) >= thirtyDaysAgo).length;
  const addedLast90 = specimens.filter(s => new Date(s.created_at) >= ninetyDaysAgo).length;
  
  // Growth rate (monthly)
  const growthRate = addedLast30 > 0 ? (addedLast30 / Math.max(totalSpecimens - addedLast30, 1)) * 100 : 0;
  
  // Special flags
  const favorites = specimens.filter(s => s.is_favorite).length;
  const forSale = specimens.filter(s => s.is_for_sale).length;
  const forTrade = specimens.filter(s => s.is_for_trade).length;
  const onDisplay = specimens.filter(s => s.is_on_display).length;
  const inStudio = specimens.filter(s => s.state === 'IN_STUDIO').length;
  
  const calculationTime = Date.now() - startTime;
  
  return {
    total_specimens: totalSpecimens,
    total_storage_locations: 0, // Calculated separately
    total_tags: 0, // Calculated separately
    total_collection_groups: 0, // Calculated separately
    
    specimens_by_state: specimensByState,
    specimens_by_condition: specimensByCondition,
    
    unique_materials: Object.keys(materialCounts).length,
    top_materials: topMaterials,
    material_distribution: materialDistribution,
    
    acquisition_methods: acquisitionMethods,
    specimens_by_year: specimensByYear,
    
    total_weight_grams: totalWeight,
    average_weight_grams: avgWeight,
    weight_distribution: weightDistribution,
    
    total_estimated_value: totalValue,
    average_estimated_value: avgValue,
    value_distribution: valueDistribution,
    total_acquisition_cost: totalCost,
    
    storage_utilization: storageUtilization,
    specimens_without_storage: specimensWithoutStorage,
    
    average_tags_per_specimen: avgTags,
    specimens_without_tags: specimensWithoutTags,
    specimens_in_collections: specimensInCollections,
    specimens_in_multiple_collections: specimensInMultiple,
    
    specimens_added_last_30_days: addedLast30,
    specimens_added_last_90_days: addedLast90,
    growth_rate_monthly: growthRate,
    
    favorite_specimens: favorites,
    specimens_for_sale: forSale,
    specimens_for_trade: forTrade,
    specimens_on_display: onDisplay,
    specimens_in_studio: inStudio,
    
    cache_status: CacheStatus.FRESH,
    calculated_at: new Date(),
    calculation_time_ms: calculationTime,
  };
}

/**
 * Calculate storage utilization
 */
function calculateStorageUtilization(specimens: any[]): StorageUtilization {
  // This would typically query storage_locations table
  // For now, return placeholder
  return {
    total_locations: 0,
    locations_with_capacity: 0,
    total_used: specimens.filter(s => s.storage_location_id).length,
    locations_full: 0,
    locations_nearly_full: 0,
    locations_available: 0,
  };
}

/**
 * Create histogram from values
 */
function createHistogram(values: number[], type: 'weight' | 'value'): HistogramBin[] {
  if (values.length === 0) return [];
  
  // Create bins based on type
  let bins: HistogramBin[];
  
  if (type === 'weight') {
    bins = [
      { min: 0, max: 10, count: 0, label: '0-10g' },
      { min: 10, max: 50, count: 0, label: '10-50g' },
      { min: 50, max: 100, count: 0, label: '50-100g' },
      { min: 100, max: 500, count: 0, label: '100-500g' },
      { min: 500, max: 1000, count: 0, label: '500g-1kg' },
      { min: 1000, max: Infinity, count: 0, label: '>1kg' },
    ];
  } else {
    bins = [
      { min: 0, max: 10, count: 0, label: '$0-$10' },
      { min: 10, max: 50, count: 0, label: '$10-$50' },
      { min: 50, max: 100, count: 0, label: '$50-$100' },
      { min: 100, max: 500, count: 0, label: '$100-$500' },
      { min: 500, max: 1000, count: 0, label: '$500-$1000' },
      { min: 1000, max: Infinity, count: 0, label: '>$1000' },
    ];
  }
  
  // Count values in each bin
  for (const value of values) {
    const bin = bins.find(b => value >= b.min && value < b.max);
    if (bin) bin.count++;
  }
  
  return bins;
}

/**
 * Calculate material diversity index (Shannon)
 */
export function calculateMaterialDiversity(materialCounts: Record<string, number>): number {
  const total = Object.values(materialCounts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  
  let diversity = 0;
  for (const count of Object.values(materialCounts)) {
    if (count > 0) {
      const proportion = count / total;
      diversity -= proportion * Math.log(proportion);
    }
  }
  
  return diversity;
}

/**
 * Calculate collection completeness score
 */
export function calculateCompletenessScore(specimens: any[]): number {
  if (specimens.length === 0) return 0;
  
  let score = 0;
  const maxScore = specimens.length * 5; // 5 points per specimen
  
  for (const specimen of specimens) {
    if (specimen.title) score += 1;
    if (specimen.description) score += 1;
    if (specimen.photo_paths.length > 0) score += 1;
    if (specimen.weight_grams) score += 1;
    if (specimen.dimensions_mm) score += 1;
  }
  
  return (score / maxScore) * 100;
}

/**
 * Calculate condition quality score
 */
export function calculateConditionQualityScore(specimensByCondition: Record<string, number>): number {
  const weights = {
    EXCELLENT: 10,
    VERY_GOOD: 8,
    GOOD: 6,
    FAIR: 4,
    POOR: 2,
    DAMAGED: 1,
  };
  
  let totalScore = 0;
  let totalCount = 0;
  
  for (const [condition, count] of Object.entries(specimensByCondition)) {
    const weight = weights[condition as keyof typeof weights] || 0;
    totalScore += weight * count;
    totalCount += count;
  }
  
  return totalCount > 0 ? totalScore / totalCount : 0;
}

/**
 * Generate cache key for analytics
 */
export function generateCacheKey(level: AnalyticsLevel, entityId?: string): string {
  return entityId ? `${level}:${entityId}` : level;
}

/**
 * Check if cache is fresh
 */
export function isCacheFresh(cache: AnalyticsCache): boolean {
  return cache.status === CacheStatus.FRESH && new Date() < cache.expires_at;
}

/**
 * Calculate cache TTL based on level
 */
export function calculateCacheTTL(level: AnalyticsLevel): number {
  const ttls = {
    [AnalyticsLevel.USER]: 300,                    // 5 minutes
    [AnalyticsLevel.STORAGE_LOCATION]: 600,        // 10 minutes
    [AnalyticsLevel.TAG]: 600,                     // 10 minutes
    [AnalyticsLevel.COLLECTION_GROUP]: 600,        // 10 minutes
    [AnalyticsLevel.MATERIAL]: 900,                // 15 minutes
    [AnalyticsLevel.TIME_PERIOD]: 86400,           // 24 hours
  };
  
  return ttls[level];
}

/**
 * Invalidate dependent caches
 */
export function getInvalidationDependencies(
  _eventType: string,
  entityType: string,
  entityId: string
): { levels: AnalyticsLevel[]; entities: string[] } {
  // Specimen changes affect many analytics
  if (entityType === 'specimen') {
    return {
      levels: [
        AnalyticsLevel.USER,
        AnalyticsLevel.STORAGE_LOCATION,
        AnalyticsLevel.TAG,
        AnalyticsLevel.COLLECTION_GROUP,
        AnalyticsLevel.MATERIAL,
      ],
      entities: [entityId],
    };
  }
  
  // Storage location changes
  if (entityType === 'storage_location') {
    return {
      levels: [AnalyticsLevel.USER, AnalyticsLevel.STORAGE_LOCATION],
      entities: [entityId],
    };
  }
  
  // Tag changes
  if (entityType === 'tag') {
    return {
      levels: [AnalyticsLevel.USER, AnalyticsLevel.TAG],
      entities: [entityId],
    };
  }
  
  // Collection group changes
  if (entityType === 'collection_group') {
    return {
      levels: [AnalyticsLevel.USER, AnalyticsLevel.COLLECTION_GROUP],
      entities: [entityId],
    };
  }
  
  return { levels: [], entities: [] };
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Default histogram bins for weight
 */
export const DEFAULT_WEIGHT_BINS = [
  { min: 0, max: 10, label: '0-10g' },
  { min: 10, max: 50, label: '10-50g' },
  { min: 50, max: 100, label: '50-100g' },
  { min: 100, max: 500, label: '100-500g' },
  { min: 500, max: 1000, label: '500g-1kg' },
  { min: 1000, max: Infinity, label: '>1kg' },
];

/**
 * Default histogram bins for value
 */
export const DEFAULT_VALUE_BINS = [
  { min: 0, max: 10, label: '$0-$10' },
  { min: 10, max: 50, label: '$10-$50' },
  { min: 50, max: 100, label: '$50-$100' },
  { min: 100, max: 500, label: '$100-$500' },
  { min: 500, max: 1000, label: '$500-$1000' },
  { min: 1000, max: Infinity, label: '>$1000' },
];

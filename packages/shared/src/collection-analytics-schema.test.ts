/**
 * Collection Analytics Schema Tests
 * 
 * Comprehensive tests for analytics aggregation, caching, and metrics
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  AnalyticsLevel,
  TimePeriodGranularity,
  CacheStatus,
  
  // Types
  UserAnalytics,
  StorageLocationAnalytics,
  TagAnalytics,
  CollectionGroupAnalytics,
  MaterialAnalytics,
  TimePeriodAnalytics,
  AnalyticsCache,
  MaterialCount,
  HistogramBin,
  
  // Functions
  calculateUserAnalytics,
  calculateMaterialDiversity,
  calculateCompletenessScore,
  calculateConditionQualityScore,
  generateCacheKey,
  isCacheFresh,
  calculateCacheTTL,
  getInvalidationDependencies,
  
  // Schemas
  UserAnalyticsSchema,
  MaterialCountSchema,
  HistogramBinSchema,
  StorageUtilizationSchema,
  
  // Constants
  DEFAULT_WEIGHT_BINS,
  DEFAULT_VALUE_BINS,
} from './collection-analytics-schema';

// =====================================================
// TEST DATA FACTORIES
// =====================================================

function createMockSpecimen(overrides: any = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    user_id: overrides.user_id || crypto.randomUUID(),
    specimen_number: overrides.specimen_number || 'QZ-2024-001',
    state: overrides.state || 'STORED',
    condition: overrides.condition || 'GOOD',
    material_id: overrides.material_id || 'quartz-id',
    material_name: overrides.material_name || 'Quartz',
    acquisition_method: overrides.acquisition_method || 'FIELD_COLLECTED',
    acquisition_date: overrides.acquisition_date || new Date('2024-06-15'),
    weight_grams: overrides.weight_grams || 50,
    estimated_value: overrides.estimated_value || 25,
    acquisition_cost: overrides.acquisition_cost || 0,
    storage_location_id: overrides.storage_location_id || null,
    tag_ids: overrides.tag_ids || [],
    collection_group_ids: overrides.collection_group_ids || [],
    is_favorite: overrides.is_favorite || false,
    is_for_sale: overrides.is_for_sale || false,
    is_for_trade: overrides.is_for_trade || false,
    is_on_display: overrides.is_on_display || false,
    title: overrides.title || null,
    description: overrides.description || null,
    photo_paths: overrides.photo_paths || [],
    dimensions_mm: overrides.dimensions_mm || null,
    created_at: overrides.created_at || new Date('2024-06-15'),
    ...overrides,
  };
}

function createMockAnalyticsCache(overrides: Partial<AnalyticsCache> = {}): AnalyticsCache {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    cache_key: 'USER',
    level: AnalyticsLevel.USER,
    entity_id: undefined,
    data: {},
    status: CacheStatus.FRESH,
    ttl_seconds: 300,
    expires_at: new Date(Date.now() + 300000),
    calculation_time_ms: 100,
    data_size_bytes: 1024,
    dependencies: [],
    created_at: new Date(),
    updated_at: new Date(),
    accessed_at: new Date(),
    access_count: 1,
    ...overrides,
  };
}

// =====================================================
// USER ANALYTICS TESTS
// =====================================================

describe('User Analytics', () => {
  it('should calculate total specimens', () => {
    const specimens = [
      createMockSpecimen(),
      createMockSpecimen(),
      createMockSpecimen(),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.total_specimens).toBe(3);
  });
  
  it('should calculate specimens by state', () => {
    const specimens = [
      createMockSpecimen({ state: 'STORED' }),
      createMockSpecimen({ state: 'STORED' }),
      createMockSpecimen({ state: 'ON_DISPLAY' }),
      createMockSpecimen({ state: 'IN_STUDIO' }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_by_state).toEqual({
      STORED: 2,
      ON_DISPLAY: 1,
      IN_STUDIO: 1,
    });
  });
  
  it('should calculate specimens by condition', () => {
    const specimens = [
      createMockSpecimen({ condition: 'EXCELLENT' }),
      createMockSpecimen({ condition: 'EXCELLENT' }),
      createMockSpecimen({ condition: 'GOOD' }),
      createMockSpecimen({ condition: 'FAIR' }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_by_condition).toEqual({
      EXCELLENT: 2,
      GOOD: 1,
      FAIR: 1,
    });
  });
  
  it('should calculate material distribution', () => {
    const specimens = [
      createMockSpecimen({ material_id: 'quartz-id', material_name: 'Quartz', weight_grams: 50, estimated_value: 25 }),
      createMockSpecimen({ material_id: 'quartz-id', material_name: 'Quartz', weight_grams: 30, estimated_value: 15 }),
      createMockSpecimen({ material_id: 'amethyst-id', material_name: 'Amethyst', weight_grams: 100, estimated_value: 150 }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.unique_materials).toBe(2);
    expect(analytics.material_distribution).toEqual({
      'quartz-id': 2,
      'amethyst-id': 1,
    });
    
    // Check top materials
    expect(analytics.top_materials).toHaveLength(2);
    expect(analytics.top_materials[0].material_name).toBe('Quartz');
    expect(analytics.top_materials[0].count).toBe(2);
    expect(analytics.top_materials[0].percentage).toBeCloseTo(66.67, 1);
    expect(analytics.top_materials[0].total_weight_grams).toBe(80);
    expect(analytics.top_materials[0].total_value).toBe(40);
  });
  
  it('should limit top materials to 10', () => {
    const specimens = [];
    for (let i = 0; i < 15; i++) {
      specimens.push(createMockSpecimen({
        material_id: `material-${i}`,
        material_name: `Material ${i}`,
      }));
    }
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.top_materials).toHaveLength(10);
  });
  
  it('should calculate acquisition methods', () => {
    const specimens = [
      createMockSpecimen({ acquisition_method: 'FIELD_COLLECTED' }),
      createMockSpecimen({ acquisition_method: 'FIELD_COLLECTED' }),
      createMockSpecimen({ acquisition_method: 'PURCHASED' }),
      createMockSpecimen({ acquisition_method: 'TRADED' }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.acquisition_methods).toEqual({
      FIELD_COLLECTED: 2,
      PURCHASED: 1,
      TRADED: 1,
    });
  });
  
  it('should calculate specimens by year', () => {
    const specimens = [
      createMockSpecimen({ acquisition_date: new Date('2023-05-10') }),
      createMockSpecimen({ acquisition_date: new Date('2024-03-20') }),
      createMockSpecimen({ acquisition_date: new Date('2024-08-15') }),
      createMockSpecimen({ acquisition_date: new Date('2025-01-05') }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_by_year).toEqual({
      '2023': 1,
      '2024': 2,
      '2025': 1,
    });
  });
  
  it('should calculate weight metrics', () => {
    const specimens = [
      createMockSpecimen({ weight_grams: 10 }),
      createMockSpecimen({ weight_grams: 50 }),
      createMockSpecimen({ weight_grams: 100 }),
      createMockSpecimen({ weight_grams: null }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.total_weight_grams).toBe(160);
    expect(analytics.average_weight_grams).toBeCloseTo(53.33, 1);
    expect(analytics.weight_distribution).toBeDefined();
    expect(analytics.weight_distribution.length).toBeGreaterThan(0);
  });
  
  it('should create weight histogram', () => {
    const specimens = [
      createMockSpecimen({ weight_grams: 5 }),
      createMockSpecimen({ weight_grams: 25 }),
      createMockSpecimen({ weight_grams: 75 }),
      createMockSpecimen({ weight_grams: 250 }),
      createMockSpecimen({ weight_grams: 750 }),
      createMockSpecimen({ weight_grams: 1500 }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    const histogram = analytics.weight_distribution;
    
    expect(histogram.find(b => b.label === '0-10g')?.count).toBe(1);
    expect(histogram.find(b => b.label === '10-50g')?.count).toBe(1);
    expect(histogram.find(b => b.label === '50-100g')?.count).toBe(1);
    expect(histogram.find(b => b.label === '100-500g')?.count).toBe(1);
    expect(histogram.find(b => b.label === '500g-1kg')?.count).toBe(1);
    expect(histogram.find(b => b.label === '>1kg')?.count).toBe(1);
  });
  
  it('should calculate value metrics', () => {
    const specimens = [
      createMockSpecimen({ estimated_value: 10 }),
      createMockSpecimen({ estimated_value: 50 }),
      createMockSpecimen({ estimated_value: 200 }),
      createMockSpecimen({ estimated_value: null }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.total_estimated_value).toBe(260);
    expect(analytics.average_estimated_value).toBeCloseTo(86.67, 1);
    expect(analytics.value_distribution).toBeDefined();
  });
  
  it('should create value histogram', () => {
    const specimens = [
      createMockSpecimen({ estimated_value: 5 }),
      createMockSpecimen({ estimated_value: 25 }),
      createMockSpecimen({ estimated_value: 75 }),
      createMockSpecimen({ estimated_value: 250 }),
      createMockSpecimen({ estimated_value: 750 }),
      createMockSpecimen({ estimated_value: 1500 }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    const histogram = analytics.value_distribution;
    
    expect(histogram.find(b => b.label === '$0-$10')?.count).toBe(1);
    expect(histogram.find(b => b.label === '$10-$50')?.count).toBe(1);
    expect(histogram.find(b => b.label === '$50-$100')?.count).toBe(1);
    expect(histogram.find(b => b.label === '$100-$500')?.count).toBe(1);
    expect(histogram.find(b => b.label === '$500-$1000')?.count).toBe(1);
    expect(histogram.find(b => b.label === '>$1000')?.count).toBe(1);
  });
  
  it('should calculate acquisition cost', () => {
    const specimens = [
      createMockSpecimen({ acquisition_cost: 0 }),
      createMockSpecimen({ acquisition_cost: 50 }),
      createMockSpecimen({ acquisition_cost: 100 }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.total_acquisition_cost).toBe(150);
  });
  
  it('should count specimens without storage', () => {
    const specimens = [
      createMockSpecimen({ storage_location_id: 'storage-1' }),
      createMockSpecimen({ storage_location_id: null }),
      createMockSpecimen({ storage_location_id: null }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_without_storage).toBe(2);
  });
  
  it('should calculate tag metrics', () => {
    const specimens = [
      createMockSpecimen({ tag_ids: ['tag-1', 'tag-2'] }),
      createMockSpecimen({ tag_ids: ['tag-1'] }),
      createMockSpecimen({ tag_ids: [] }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.average_tags_per_specimen).toBeCloseTo(1, 0);
    expect(analytics.specimens_without_tags).toBe(1);
  });
  
  it('should calculate collection metrics', () => {
    const specimens = [
      createMockSpecimen({ collection_group_ids: ['group-1'] }),
      createMockSpecimen({ collection_group_ids: ['group-1', 'group-2'] }),
      createMockSpecimen({ collection_group_ids: [] }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_in_collections).toBe(2);
    expect(analytics.specimens_in_multiple_collections).toBe(1);
  });
  
  it('should calculate activity metrics', () => {
    const now = new Date();
    const specimens = [
      createMockSpecimen({ created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }), // 10 days ago
      createMockSpecimen({ created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) }), // 20 days ago
      createMockSpecimen({ created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }), // 60 days ago
      createMockSpecimen({ created_at: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) }), // 100 days ago
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.specimens_added_last_30_days).toBe(2);
    expect(analytics.specimens_added_last_90_days).toBe(3);
    expect(analytics.growth_rate_monthly).toBeGreaterThan(0);
  });
  
  it('should count special flags', () => {
    const specimens = [
      createMockSpecimen({ is_favorite: true }),
      createMockSpecimen({ is_for_sale: true }),
      createMockSpecimen({ is_for_trade: true }),
      createMockSpecimen({ is_on_display: true }),
      createMockSpecimen({ state: 'IN_STUDIO' }),
    ];
    
    const analytics = calculateUserAnalytics(specimens);
    expect(analytics.favorite_specimens).toBe(1);
    expect(analytics.specimens_for_sale).toBe(1);
    expect(analytics.specimens_for_trade).toBe(1);
    expect(analytics.specimens_on_display).toBe(1);
    expect(analytics.specimens_in_studio).toBe(1);
  });
  
  it('should set cache metadata', () => {
    const specimens = [createMockSpecimen()];
    const analytics = calculateUserAnalytics(specimens);
    
    expect(analytics.cache_status).toBe(CacheStatus.FRESH);
    expect(analytics.calculated_at).toBeInstanceOf(Date);
    expect(analytics.calculation_time_ms).toBeGreaterThan(0);
  });
});

// =====================================================
// MATERIAL DIVERSITY TESTS
// =====================================================

describe('Material Diversity', () => {
  it('should calculate Shannon diversity index', () => {
    const materialCounts = {
      'quartz': 10,
      'amethyst': 5,
      'calcite': 3,
      'fluorite': 2,
    };
    
    const diversity = calculateMaterialDiversity(materialCounts);
    expect(diversity).toBeGreaterThan(0);
    expect(diversity).toBeLessThan(2); // Max diversity for 4 species is ln(4) ≈ 1.39
  });
  
  it('should return 0 for single material', () => {
    const materialCounts = { 'quartz': 100 };
    const diversity = calculateMaterialDiversity(materialCounts);
    expect(diversity).toBe(0);
  });
  
  it('should return 0 for empty collection', () => {
    const materialCounts = {};
    const diversity = calculateMaterialDiversity(materialCounts);
    expect(diversity).toBe(0);
  });
  
  it('should increase with more even distribution', () => {
    const uneven = { 'a': 90, 'b': 5, 'c': 5 };
    const even = { 'a': 33, 'b': 33, 'c': 34 };
    
    const unevenDiversity = calculateMaterialDiversity(uneven);
    const evenDiversity = calculateMaterialDiversity(even);
    
    expect(evenDiversity).toBeGreaterThan(unevenDiversity);
  });
});

// =====================================================
// COMPLETENESS SCORE TESTS
// =====================================================

describe('Completeness Score', () => {
  it('should return 100 for fully documented specimens', () => {
    const specimens = [
      createMockSpecimen({
        title: 'Nice Quartz',
        description: 'Clear quartz crystal',
        photo_paths: ['photo1.jpg'],
        weight_grams: 50,
        dimensions_mm: '30x20x15',
      }),
    ];
    
    const score = calculateCompletenessScore(specimens);
    expect(score).toBe(100);
  });
  
  it('should return 0 for empty specimens', () => {
    const specimens = [
      createMockSpecimen({
        title: null,
        description: null,
        photo_paths: [],
        weight_grams: null,
        dimensions_mm: null,
      }),
    ];
    
    const score = calculateCompletenessScore(specimens);
    expect(score).toBe(0);
  });
  
  it('should calculate partial scores', () => {
    const specimens = [
      createMockSpecimen({
        title: 'Quartz',
        description: null,
        photo_paths: ['photo1.jpg'],
        weight_grams: null,
        dimensions_mm: null,
      }),
    ];
    
    const score = calculateCompletenessScore(specimens);
    expect(score).toBe(40); // 2 out of 5 fields = 40%
  });
  
  it('should average across multiple specimens', () => {
    const specimens = [
      createMockSpecimen({
        title: 'Quartz',
        description: 'Nice',
        photo_paths: ['photo1.jpg'],
        weight_grams: 50,
        dimensions_mm: '30x20x15',
      }),
      createMockSpecimen({
        title: null,
        description: null,
        photo_paths: [],
        weight_grams: null,
        dimensions_mm: null,
      }),
    ];
    
    const score = calculateCompletenessScore(specimens);
    expect(score).toBe(50); // (100% + 0%) / 2 = 50%
  });
  
  it('should return 0 for empty collection', () => {
    const score = calculateCompletenessScore([]);
    expect(score).toBe(0);
  });
});

// =====================================================
// CONDITION QUALITY SCORE TESTS
// =====================================================

describe('Condition Quality Score', () => {
  it('should calculate weighted average', () => {
    const specimensByCondition = {
      EXCELLENT: 2,  // 10 points each
      GOOD: 3,       // 6 points each
    };
    
    const score = calculateConditionQualityScore(specimensByCondition);
    // (2*10 + 3*6) / 5 = 38/5 = 7.6
    expect(score).toBeCloseTo(7.6, 1);
  });
  
  it('should return 10 for all excellent', () => {
    const specimensByCondition = { EXCELLENT: 5 };
    const score = calculateConditionQualityScore(specimensByCondition);
    expect(score).toBe(10);
  });
  
  it('should return low score for damaged specimens', () => {
    const specimensByCondition = { DAMAGED: 5 };
    const score = calculateConditionQualityScore(specimensByCondition);
    expect(score).toBe(1);
  });
  
  it('should return 0 for empty collection', () => {
    const specimensByCondition = {};
    const score = calculateConditionQualityScore(specimensByCondition);
    expect(score).toBe(0);
  });
});

// =====================================================
// CACHE KEY TESTS
// =====================================================

describe('Cache Key Generation', () => {
  it('should generate key for user level', () => {
    const key = generateCacheKey(AnalyticsLevel.USER);
    expect(key).toBe('USER');
  });
  
  it('should generate key with entity ID', () => {
    const key = generateCacheKey(AnalyticsLevel.STORAGE_LOCATION, 'storage-123');
    expect(key).toBe('STORAGE_LOCATION:storage-123');
  });
  
  it('should generate key for tag', () => {
    const key = generateCacheKey(AnalyticsLevel.TAG, 'tag-456');
    expect(key).toBe('TAG:tag-456');
  });
  
  it('should generate key for collection group', () => {
    const key = generateCacheKey(AnalyticsLevel.COLLECTION_GROUP, 'group-789');
    expect(key).toBe('COLLECTION_GROUP:group-789');
  });
});

// =====================================================
// CACHE FRESHNESS TESTS
// =====================================================

describe('Cache Freshness', () => {
  it('should be fresh when status is FRESH and not expired', () => {
    const cache = createMockAnalyticsCache({
      status: CacheStatus.FRESH,
      expires_at: new Date(Date.now() + 60000), // 1 minute in future
    });
    
    expect(isCacheFresh(cache)).toBe(true);
  });
  
  it('should be stale when status is STALE', () => {
    const cache = createMockAnalyticsCache({
      status: CacheStatus.STALE,
      expires_at: new Date(Date.now() + 60000),
    });
    
    expect(isCacheFresh(cache)).toBe(false);
  });
  
  it('should be stale when expired', () => {
    const cache = createMockAnalyticsCache({
      status: CacheStatus.FRESH,
      expires_at: new Date(Date.now() - 60000), // 1 minute in past
    });
    
    expect(isCacheFresh(cache)).toBe(false);
  });
  
  it('should be stale when calculating', () => {
    const cache = createMockAnalyticsCache({
      status: CacheStatus.CALCULATING,
      expires_at: new Date(Date.now() + 60000),
    });
    
    expect(isCacheFresh(cache)).toBe(false);
  });
  
  it('should be stale when error', () => {
    const cache = createMockAnalyticsCache({
      status: CacheStatus.ERROR,
      expires_at: new Date(Date.now() + 60000),
    });
    
    expect(isCacheFresh(cache)).toBe(false);
  });
});

// =====================================================
// CACHE TTL TESTS
// =====================================================

describe('Cache TTL Calculation', () => {
  it('should return 5 minutes for user level', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.USER);
    expect(ttl).toBe(300);
  });
  
  it('should return 10 minutes for storage location', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.STORAGE_LOCATION);
    expect(ttl).toBe(600);
  });
  
  it('should return 10 minutes for tag', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.TAG);
    expect(ttl).toBe(600);
  });
  
  it('should return 10 minutes for collection group', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.COLLECTION_GROUP);
    expect(ttl).toBe(600);
  });
  
  it('should return 15 minutes for material', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.MATERIAL);
    expect(ttl).toBe(900);
  });
  
  it('should return 24 hours for time period', () => {
    const ttl = calculateCacheTTL(AnalyticsLevel.TIME_PERIOD);
    expect(ttl).toBe(86400);
  });
});

// =====================================================
// CACHE INVALIDATION TESTS
// =====================================================

describe('Cache Invalidation Dependencies', () => {
  it('should invalidate multiple levels for specimen changes', () => {
    const deps = getInvalidationDependencies('specimen.created', 'specimen', 'specimen-123');
    
    expect(deps.levels).toContain(AnalyticsLevel.USER);
    expect(deps.levels).toContain(AnalyticsLevel.STORAGE_LOCATION);
    expect(deps.levels).toContain(AnalyticsLevel.TAG);
    expect(deps.levels).toContain(AnalyticsLevel.COLLECTION_GROUP);
    expect(deps.levels).toContain(AnalyticsLevel.MATERIAL);
    expect(deps.entities).toContain('specimen-123');
  });
  
  it('should invalidate storage location analytics', () => {
    const deps = getInvalidationDependencies('storage_location.updated', 'storage_location', 'storage-123');
    
    expect(deps.levels).toContain(AnalyticsLevel.USER);
    expect(deps.levels).toContain(AnalyticsLevel.STORAGE_LOCATION);
    expect(deps.entities).toContain('storage-123');
  });
  
  it('should invalidate tag analytics', () => {
    const deps = getInvalidationDependencies('tag.created', 'tag', 'tag-123');
    
    expect(deps.levels).toContain(AnalyticsLevel.USER);
    expect(deps.levels).toContain(AnalyticsLevel.TAG);
    expect(deps.entities).toContain('tag-123');
  });
  
  it('should invalidate collection group analytics', () => {
    const deps = getInvalidationDependencies('collection_group.updated', 'collection_group', 'group-123');
    
    expect(deps.levels).toContain(AnalyticsLevel.USER);
    expect(deps.levels).toContain(AnalyticsLevel.COLLECTION_GROUP);
    expect(deps.entities).toContain('group-123');
  });
  
  it('should return empty for unknown entity type', () => {
    const deps = getInvalidationDependencies('unknown.event', 'unknown', 'unknown-123');
    
    expect(deps.levels).toHaveLength(0);
    expect(deps.entities).toHaveLength(0);
  });
});

// =====================================================
// ZOD VALIDATION TESTS
// =====================================================

describe('Zod Schema Validation', () => {
  describe('MaterialCountSchema', () => {
    it('should validate valid material count', () => {
      const validMaterial: any = {
        material_id: 'quartz-id',
        material_name: 'Quartz',
        count: 10,
        percentage: 50.5,
        total_weight_grams: 500,
        total_value: 250,
      };
      
      expect(() => MaterialCountSchema.parse(validMaterial)).not.toThrow();
    });
    
    it('should reject negative count', () => {
      const invalidMaterial = {
        material_id: 'quartz-id',
        material_name: 'Quartz',
        count: -5,
        percentage: 50,
      };
      
      expect(() => MaterialCountSchema.parse(invalidMaterial)).toThrow();
    });
    
    it('should reject percentage > 100', () => {
      const invalidMaterial = {
        material_id: 'quartz-id',
        material_name: 'Quartz',
        count: 10,
        percentage: 150,
      };
      
      expect(() => MaterialCountSchema.parse(invalidMaterial)).toThrow();
    });
  });
  
  describe('HistogramBinSchema', () => {
    it('should validate valid histogram bin', () => {
      const validBin: any = {
        min: 0,
        max: 10,
        count: 5,
        label: '0-10g',
      };
      
      expect(() => HistogramBinSchema.parse(validBin)).not.toThrow();
    });
    
    it('should reject negative count', () => {
      const invalidBin = {
        min: 0,
        max: 10,
        count: -1,
        label: '0-10g',
      };
      
      expect(() => HistogramBinSchema.parse(invalidBin)).toThrow();
    });
  });
  
  describe('StorageUtilizationSchema', () => {
    it('should validate valid storage utilization', () => {
      const validUtilization: any = {
        total_locations: 10,
        locations_with_capacity: 8,
        total_capacity: 1000,
        total_used: 750,
        overall_utilization_percentage: 75,
        locations_full: 2,
        locations_nearly_full: 3,
        locations_available: 5,
      };
      
      expect(() => StorageUtilizationSchema.parse(validUtilization)).not.toThrow();
    });
    
    it('should allow optional fields', () => {
      const minimalUtilization: any = {
        total_locations: 10,
        locations_with_capacity: 8,
        total_used: 750,
        locations_full: 2,
        locations_nearly_full: 3,
        locations_available: 5,
      };
      
      expect(() => StorageUtilizationSchema.parse(minimalUtilization)).not.toThrow();
    });
  });
  
  describe('UserAnalyticsSchema', () => {
    it('should validate complete user analytics', () => {
      const validAnalytics: any = {
        id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        total_specimens: 100,
        total_storage_locations: 10,
        total_tags: 20,
        total_collection_groups: 5,
        specimens_by_state: { STORED: 80, ON_DISPLAY: 20 },
        specimens_by_condition: { EXCELLENT: 50, GOOD: 50 },
        unique_materials: 15,
        top_materials: [],
        material_distribution: { 'quartz': 50 },
        acquisition_methods: { FIELD_COLLECTED: 100 },
        specimens_by_year: { '2024': 100 },
        total_weight_grams: 5000,
        average_weight_grams: 50,
        weight_distribution: [],
        total_estimated_value: 10000,
        average_estimated_value: 100,
        value_distribution: [],
        total_acquisition_cost: 2000,
        storage_utilization: {
          total_locations: 10,
          locations_with_capacity: 8,
          total_used: 80,
          locations_full: 0,
          locations_nearly_full: 2,
          locations_available: 8,
        },
        specimens_without_storage: 20,
        average_tags_per_specimen: 2.5,
        specimens_without_tags: 10,
        specimens_in_collections: 80,
        specimens_in_multiple_collections: 20,
        specimens_added_last_30_days: 10,
        specimens_added_last_90_days: 30,
        growth_rate_monthly: 5.5,
        favorite_specimens: 15,
        specimens_for_sale: 5,
        specimens_for_trade: 3,
        specimens_on_display: 20,
        specimens_in_studio: 2,
        cache_status: CacheStatus.FRESH,
        calculated_at: new Date(),
        calculation_time_ms: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      expect(() => UserAnalyticsSchema.parse(validAnalytics)).not.toThrow();
    });
  });
});

// =====================================================
// CONSTANTS TESTS
// =====================================================

describe('Default Constants', () => {
  it('should define weight bins', () => {
    expect(DEFAULT_WEIGHT_BINS).toHaveLength(6);
    expect(DEFAULT_WEIGHT_BINS[0].label).toBe('0-10g');
    expect(DEFAULT_WEIGHT_BINS[5].label).toBe('>1kg');
  });
  
  it('should define value bins', () => {
    expect(DEFAULT_VALUE_BINS).toHaveLength(6);
    expect(DEFAULT_VALUE_BINS[0].label).toBe('$0-$10');
    expect(DEFAULT_VALUE_BINS[5].label).toBe('>$1000');
  });
  
  it('should have ascending min values in weight bins', () => {
    for (let i = 0; i < DEFAULT_WEIGHT_BINS.length - 1; i++) {
      expect(DEFAULT_WEIGHT_BINS[i].min).toBeLessThan(DEFAULT_WEIGHT_BINS[i].max);
      expect(DEFAULT_WEIGHT_BINS[i].max).toBeLessThanOrEqual(DEFAULT_WEIGHT_BINS[i + 1].min);
    }
  });
  
  it('should have ascending min values in value bins', () => {
    for (let i = 0; i < DEFAULT_VALUE_BINS.length - 1; i++) {
      expect(DEFAULT_VALUE_BINS[i].min).toBeLessThan(DEFAULT_VALUE_BINS[i].max);
      expect(DEFAULT_VALUE_BINS[i].max).toBeLessThanOrEqual(DEFAULT_VALUE_BINS[i + 1].min);
    }
  });
});

-- =====================================================
-- COLLECTION ANALYTICS MIGRATION
-- 
-- Analytics system with:
-- - Materialized views for fast analytics queries
-- - Analytics cache table for offline operation
-- - Event tracking for incremental updates
-- - Triggers for automatic cache invalidation
-- - RLS policies for security
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE analytics_level AS ENUM (
  'USER',
  'STORAGE_LOCATION',
  'TAG',
  'COLLECTION_GROUP',
  'MATERIAL',
  'TIME_PERIOD'
);

CREATE TYPE time_period_granularity AS ENUM (
  'DAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR'
);

CREATE TYPE cache_status AS ENUM (
  'FRESH',
  'STALE',
  'CALCULATING',
  'ERROR'
);

-- =====================================================
-- ANALYTICS CACHE TABLE
-- =====================================================

CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cache identification
  cache_key TEXT NOT NULL,
  level analytics_level NOT NULL,
  entity_id UUID,
  
  -- Cached data (JSONB for flexible storage)
  data JSONB NOT NULL,
  
  -- Cache control
  status cache_status NOT NULL DEFAULT 'FRESH',
  ttl_seconds INTEGER NOT NULL DEFAULT 300,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  calculation_time_ms INTEGER NOT NULL DEFAULT 0,
  data_size_bytes INTEGER NOT NULL DEFAULT 0,
  dependencies TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 0,
  
  -- Constraints
  UNIQUE(user_id, cache_key)
);

-- =====================================================
-- ANALYTICS UPDATE EVENTS TABLE
-- =====================================================

CREATE TABLE analytics_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Affected analytics
  affected_levels analytics_level[] NOT NULL DEFAULT '{}',
  affected_entities TEXT[] NOT NULL DEFAULT '{}',
  
  -- Processing status
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MATERIALIZED VIEW: USER ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW user_analytics_mv AS
WITH specimen_counts AS (
  SELECT
    user_id,
    COUNT(*) as total_specimens,
    COUNT(*) FILTER (WHERE state = 'STORED') as specimens_stored,
    COUNT(*) FILTER (WHERE state = 'ON_DISPLAY') as specimens_on_display,
    COUNT(*) FILTER (WHERE state = 'IN_STUDIO') as specimens_in_studio,
    COUNT(*) FILTER (WHERE condition = 'EXCELLENT') as specimens_excellent,
    COUNT(*) FILTER (WHERE condition = 'VERY_GOOD') as specimens_very_good,
    COUNT(*) FILTER (WHERE condition = 'GOOD') as specimens_good,
    COUNT(*) FILTER (WHERE condition = 'FAIR') as specimens_fair,
    COUNT(*) FILTER (WHERE condition = 'POOR') as specimens_poor,
    COUNT(*) FILTER (WHERE condition = 'DAMAGED') as specimens_damaged,
    COUNT(*) FILTER (WHERE acquisition_method = 'FIELD_COLLECTED') as specimens_field_collected,
    COUNT(*) FILTER (WHERE acquisition_method = 'PURCHASED') as specimens_purchased,
    COUNT(*) FILTER (WHERE acquisition_method = 'TRADED') as specimens_traded,
    COUNT(*) FILTER (WHERE acquisition_method = 'GIFTED') as specimens_gifted,
    COUNT(*) FILTER (WHERE storage_location_id IS NULL) as specimens_without_storage,
    COUNT(*) FILTER (WHERE is_favorite = TRUE) as favorite_specimens,
    COUNT(*) FILTER (WHERE is_for_sale = TRUE) as specimens_for_sale,
    COUNT(*) FILTER (WHERE is_for_trade = TRUE) as specimens_for_trade,
    COUNT(*) FILTER (WHERE is_on_display = TRUE) as specimens_on_display_flag,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as specimens_added_last_30_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as specimens_added_last_90_days,
    SUM(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as total_weight_grams,
    AVG(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as average_weight_grams,
    SUM(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as total_estimated_value,
    AVG(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as average_estimated_value,
    SUM(acquisition_cost) FILTER (WHERE acquisition_cost IS NOT NULL) as total_acquisition_cost,
    COUNT(DISTINCT material_id) as unique_materials
  FROM specimens
  GROUP BY user_id
),
material_counts AS (
  SELECT
    user_id,
    material_id,
    material_name,
    COUNT(*) as count,
    SUM(weight_grams) as total_weight,
    SUM(estimated_value) as total_value
  FROM specimens
  GROUP BY user_id, material_id, material_name
),
top_materials AS (
  SELECT
    user_id,
    jsonb_agg(
      jsonb_build_object(
        'material_id', material_id,
        'material_name', material_name,
        'count', count,
        'percentage', ROUND((count::numeric / SUM(count) OVER (PARTITION BY user_id) * 100)::numeric, 2),
        'total_weight_grams', COALESCE(total_weight, 0),
        'total_value', COALESCE(total_value, 0)
      )
      ORDER BY count DESC
      LIMIT 10
    ) as top_materials
  FROM material_counts
  GROUP BY user_id
),
storage_counts AS (
  SELECT
    user_id,
    COUNT(*) as total_storage_locations,
    COUNT(*) FILTER (WHERE capacity IS NOT NULL) as locations_with_capacity,
    SUM(capacity) FILTER (WHERE capacity IS NOT NULL) as total_capacity,
    SUM(current_count) as total_used,
    COUNT(*) FILTER (WHERE capacity IS NOT NULL AND current_count >= capacity) as locations_full,
    COUNT(*) FILTER (WHERE capacity IS NOT NULL AND current_count::numeric / capacity::numeric >= 0.9) as locations_nearly_full
  FROM storage_locations
  GROUP BY user_id
),
tag_stats AS (
  SELECT
    s.user_id,
    COUNT(DISTINCT t.tag_id) as total_tags,
    AVG(array_length(ARRAY(SELECT tag_id FROM specimen_tags WHERE specimen_id = s.id), 1)) as avg_tags_per_specimen,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM specimen_tags WHERE specimen_id = s.id)) as specimens_without_tags
  FROM specimens s
  LEFT JOIN specimen_tags t ON s.id = t.specimen_id
  GROUP BY s.user_id
),
collection_stats AS (
  SELECT
    s.user_id,
    COUNT(DISTINCT cg.collection_group_id) as total_collection_groups,
    COUNT(DISTINCT cgs.specimen_id) FILTER (WHERE cgs.specimen_id IS NOT NULL) as specimens_in_collections,
    COUNT(DISTINCT cgs.specimen_id) FILTER (
      WHERE (SELECT COUNT(*) FROM collection_group_specimens WHERE specimen_id = cgs.specimen_id) > 1
    ) as specimens_in_multiple_collections
  FROM specimens s
  LEFT JOIN collection_group_specimens cgs ON s.id = cgs.specimen_id
  LEFT JOIN collection_groups cg ON cgs.collection_group_id = cg.id
  GROUP BY s.user_id
)
SELECT
  gen_random_uuid() as id,
  sc.user_id,
  sc.total_specimens,
  COALESCE(stc.total_storage_locations, 0) as total_storage_locations,
  COALESCE(ts.total_tags, 0) as total_tags,
  COALESCE(cs.total_collection_groups, 0) as total_collection_groups,
  
  -- State distribution
  jsonb_build_object(
    'STORED', COALESCE(sc.specimens_stored, 0),
    'ON_DISPLAY', COALESCE(sc.specimens_on_display, 0),
    'IN_STUDIO', COALESCE(sc.specimens_in_studio, 0)
  ) as specimens_by_state,
  
  -- Condition distribution
  jsonb_build_object(
    'EXCELLENT', COALESCE(sc.specimens_excellent, 0),
    'VERY_GOOD', COALESCE(sc.specimens_very_good, 0),
    'GOOD', COALESCE(sc.specimens_good, 0),
    'FAIR', COALESCE(sc.specimens_fair, 0),
    'POOR', COALESCE(sc.specimens_poor, 0),
    'DAMAGED', COALESCE(sc.specimens_damaged, 0)
  ) as specimens_by_condition,
  
  -- Materials
  sc.unique_materials,
  COALESCE(tm.top_materials, '[]'::jsonb) as top_materials,
  
  -- Acquisition
  jsonb_build_object(
    'FIELD_COLLECTED', COALESCE(sc.specimens_field_collected, 0),
    'PURCHASED', COALESCE(sc.specimens_purchased, 0),
    'TRADED', COALESCE(sc.specimens_traded, 0),
    'GIFTED', COALESCE(sc.specimens_gifted, 0)
  ) as acquisition_methods,
  
  -- Metrics
  COALESCE(sc.total_weight_grams, 0) as total_weight_grams,
  COALESCE(sc.average_weight_grams, 0) as average_weight_grams,
  COALESCE(sc.total_estimated_value, 0) as total_estimated_value,
  COALESCE(sc.average_estimated_value, 0) as average_estimated_value,
  COALESCE(sc.total_acquisition_cost, 0) as total_acquisition_cost,
  
  -- Storage
  COALESCE(sc.specimens_without_storage, 0) as specimens_without_storage,
  COALESCE(stc.total_capacity, 0) as storage_total_capacity,
  COALESCE(stc.total_used, 0) as storage_total_used,
  COALESCE(stc.locations_full, 0) as storage_locations_full,
  COALESCE(stc.locations_nearly_full, 0) as storage_locations_nearly_full,
  
  -- Organization
  COALESCE(ts.avg_tags_per_specimen, 0) as average_tags_per_specimen,
  COALESCE(ts.specimens_without_tags, 0) as specimens_without_tags,
  COALESCE(cs.specimens_in_collections, 0) as specimens_in_collections,
  COALESCE(cs.specimens_in_multiple_collections, 0) as specimens_in_multiple_collections,
  
  -- Activity
  COALESCE(sc.specimens_added_last_30_days, 0) as specimens_added_last_30_days,
  COALESCE(sc.specimens_added_last_90_days, 0) as specimens_added_last_90_days,
  
  -- Special flags
  COALESCE(sc.favorite_specimens, 0) as favorite_specimens,
  COALESCE(sc.specimens_for_sale, 0) as specimens_for_sale,
  COALESCE(sc.specimens_for_trade, 0) as specimens_for_trade,
  COALESCE(sc.specimens_on_display_flag, 0) as specimens_on_display,
  COALESCE(sc.specimens_in_studio, 0) as specimens_in_studio,
  
  -- Metadata
  NOW() as calculated_at
FROM specimen_counts sc
LEFT JOIN top_materials tm ON sc.user_id = tm.user_id
LEFT JOIN storage_counts stc ON sc.user_id = stc.user_id
LEFT JOIN tag_stats ts ON sc.user_id = ts.user_id
LEFT JOIN collection_stats cs ON sc.user_id = cs.user_id;

-- =====================================================
-- MATERIALIZED VIEW: STORAGE LOCATION ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW storage_location_analytics_mv AS
WITH specimen_stats AS (
  SELECT
    storage_location_id,
    COUNT(*) as specimen_count,
    COUNT(DISTINCT material_id) as unique_materials,
    SUM(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as total_weight,
    AVG(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as avg_weight,
    SUM(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as total_value,
    AVG(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as avg_value,
    COUNT(*) FILTER (WHERE is_favorite = TRUE) as favorite_count,
    COUNT(*) FILTER (WHERE is_for_sale = TRUE) as for_sale_count,
    jsonb_object_agg(
      condition,
      COUNT(*)
    ) FILTER (WHERE condition IS NOT NULL) as condition_distribution
  FROM specimens
  WHERE storage_location_id IS NOT NULL
  GROUP BY storage_location_id
),
material_list AS (
  SELECT
    storage_location_id,
    jsonb_agg(
      jsonb_build_object(
        'material_id', material_id,
        'material_name', material_name,
        'count', count
      )
      ORDER BY count DESC
      LIMIT 10
    ) as top_materials
  FROM (
    SELECT
      storage_location_id,
      material_id,
      material_name,
      COUNT(*) as count
    FROM specimens
    WHERE storage_location_id IS NOT NULL
    GROUP BY storage_location_id, material_id, material_name
  ) sub
  GROUP BY storage_location_id
)
SELECT
  gen_random_uuid() as id,
  sl.id as storage_location_id,
  sl.user_id,
  sl.name as location_name,
  sl.location_type,
  sl.code as location_code,
  sl.capacity,
  sl.current_count,
  CASE
    WHEN sl.capacity IS NOT NULL THEN ROUND((sl.current_count::numeric / sl.capacity::numeric * 100)::numeric, 2)
    ELSE NULL
  END as utilization_percentage,
  CASE
    WHEN sl.capacity IS NOT NULL THEN sl.capacity - sl.current_count
    ELSE NULL
  END as available_capacity,
  CASE
    WHEN sl.capacity IS NOT NULL THEN sl.current_count >= sl.capacity
    ELSE FALSE
  END as is_at_capacity,
  CASE
    WHEN sl.capacity IS NOT NULL THEN (sl.current_count::numeric / sl.capacity::numeric) >= 0.9
    ELSE FALSE
  END as is_nearly_full,
  COALESCE(ml.top_materials, '[]'::jsonb) as materials_stored,
  COALESCE(ss.unique_materials, 0) as unique_materials,
  COALESCE(ss.condition_distribution, '{}'::jsonb) as specimens_by_condition,
  COALESCE(ss.total_weight, 0) as total_weight_grams,
  COALESCE(ss.total_value, 0) as total_estimated_value,
  COALESCE(ss.avg_weight, 0) as average_weight_grams,
  COALESCE(ss.avg_value, 0) as average_estimated_value,
  COALESCE(ss.favorite_count, 0) as favorite_specimens,
  COALESCE(ss.for_sale_count, 0) as specimens_for_sale,
  (SELECT COUNT(*) FROM storage_locations WHERE parent_location_id = sl.id) as child_location_count,
  NOW() as calculated_at
FROM storage_locations sl
LEFT JOIN specimen_stats ss ON sl.id = ss.storage_location_id
LEFT JOIN material_list ml ON sl.id = ml.storage_location_id;

-- =====================================================
-- MATERIALIZED VIEW: TAG ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW tag_analytics_mv AS
WITH specimen_stats AS (
  SELECT
    st.tag_id,
    COUNT(DISTINCT s.id) as specimen_count,
    COUNT(DISTINCT s.material_id) as unique_materials,
    SUM(s.weight_grams) FILTER (WHERE s.weight_grams IS NOT NULL) as total_weight,
    AVG(s.weight_grams) FILTER (WHERE s.weight_grams IS NOT NULL) as avg_weight,
    SUM(s.estimated_value) FILTER (WHERE s.estimated_value IS NOT NULL) as total_value,
    AVG(s.estimated_value) FILTER (WHERE s.estimated_value IS NOT NULL) as avg_value,
    jsonb_object_agg(
      s.condition,
      COUNT(*)
    ) FILTER (WHERE s.condition IS NOT NULL) as condition_distribution,
    jsonb_object_agg(
      s.state,
      COUNT(*)
    ) FILTER (WHERE s.state IS NOT NULL) as state_distribution,
    COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '30 days') as added_last_30_days
  FROM specimen_tags st
  JOIN specimens s ON st.specimen_id = s.id
  GROUP BY st.tag_id
),
material_list AS (
  SELECT
    st.tag_id,
    jsonb_agg(
      jsonb_build_object(
        'material_id', s.material_id,
        'material_name', s.material_name,
        'count', count
      )
      ORDER BY count DESC
      LIMIT 10
    ) as top_materials
  FROM (
    SELECT
      st.tag_id,
      s.material_id,
      s.material_name,
      COUNT(*) as count
    FROM specimen_tags st
    JOIN specimens s ON st.specimen_id = s.id
    GROUP BY st.tag_id, s.material_id, s.material_name
  ) sub
  GROUP BY tag_id
),
tag_cooccurrence AS (
  SELECT
    st1.tag_id as tag_id,
    jsonb_agg(
      jsonb_build_object(
        'tag_id', st2.tag_id,
        'tag_name', t2.name,
        'cooccurrence_count', count
      )
      ORDER BY count DESC
      LIMIT 5
    ) as frequently_combined_tags
  FROM (
    SELECT
      st1.tag_id,
      st2.tag_id as other_tag_id,
      COUNT(DISTINCT st1.specimen_id) as count
    FROM specimen_tags st1
    JOIN specimen_tags st2 ON st1.specimen_id = st2.specimen_id AND st1.tag_id != st2.tag_id
    GROUP BY st1.tag_id, st2.tag_id
  ) sub
  JOIN specimen_tags st1 ON sub.tag_id = st1.tag_id
  JOIN specimen_tags st2 ON sub.other_tag_id = st2.tag_id
  JOIN tags t2 ON st2.tag_id = t2.id
  GROUP BY st1.tag_id
)
SELECT
  gen_random_uuid() as id,
  t.id as tag_id,
  t.user_id,
  t.name as tag_name,
  t.tag_type,
  t.specimen_count,
  COALESCE(ml.top_materials, '[]'::jsonb) as materials_tagged,
  COALESCE(ss.unique_materials, 0) as unique_materials,
  COALESCE(ss.condition_distribution, '{}'::jsonb) as specimens_by_condition,
  COALESCE(ss.state_distribution, '{}'::jsonb) as specimens_by_state,
  COALESCE(ss.total_weight, 0) as total_weight_grams,
  COALESCE(ss.total_value, 0) as total_estimated_value,
  COALESCE(ss.avg_weight, 0) as average_weight_grams,
  COALESCE(ss.avg_value, 0) as average_estimated_value,
  COALESCE(tc.frequently_combined_tags, '[]'::jsonb) as frequently_combined_tags,
  COALESCE(ss.added_last_30_days, 0) as specimens_added_last_30_days,
  NOW() as calculated_at
FROM tags t
LEFT JOIN specimen_stats ss ON t.id = ss.tag_id
LEFT JOIN material_list ml ON t.id = ml.tag_id
LEFT JOIN tag_cooccurrence tc ON t.id = tc.tag_id;

-- =====================================================
-- MATERIALIZED VIEW: COLLECTION GROUP ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW collection_group_analytics_mv AS
WITH specimen_stats AS (
  SELECT
    cgs.collection_group_id,
    COUNT(DISTINCT s.id) as specimen_count,
    COUNT(DISTINCT s.material_id) as unique_materials,
    SUM(s.weight_grams) FILTER (WHERE s.weight_grams IS NOT NULL) as total_weight,
    AVG(s.weight_grams) FILTER (WHERE s.weight_grams IS NOT NULL) as avg_weight,
    SUM(s.estimated_value) FILTER (WHERE s.estimated_value IS NOT NULL) as total_value,
    AVG(s.estimated_value) FILTER (WHERE s.estimated_value IS NOT NULL) as avg_value,
    jsonb_object_agg(
      s.condition,
      COUNT(*)
    ) FILTER (WHERE s.condition IS NOT NULL) as condition_distribution,
    jsonb_object_agg(
      s.state,
      COUNT(*)
    ) FILTER (WHERE s.state IS NOT NULL) as state_distribution,
    jsonb_object_agg(
      s.acquisition_method,
      COUNT(*)
    ) FILTER (WHERE s.acquisition_method IS NOT NULL) as acquisition_methods,
    MIN(s.acquisition_date) as earliest_acquisition,
    MAX(s.acquisition_date) as latest_acquisition,
    COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '30 days') as added_last_30_days,
    COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '90 days') as added_last_90_days,
    COUNT(*) FILTER (WHERE s.title IS NOT NULL) as specimens_with_title,
    COUNT(*) FILTER (WHERE s.description IS NOT NULL) as specimens_with_description,
    COUNT(*) FILTER (WHERE array_length(s.photo_paths, 1) > 0) as specimens_with_photos,
    AVG(array_length(s.photo_paths, 1)) as avg_photos_per_specimen,
    COUNT(*) FILTER (WHERE storage_location_id IS NULL) as specimens_without_storage
  FROM collection_group_specimens cgs
  JOIN specimens s ON cgs.specimen_id = s.id
  GROUP BY cgs.collection_group_id
),
material_list AS (
  SELECT
    cgs.collection_group_id,
    jsonb_agg(
      jsonb_build_object(
        'material_id', s.material_id,
        'material_name', s.material_name,
        'count', count
      )
      ORDER BY count DESC
    ) as materials_in_collection
  FROM (
    SELECT
      cgs.collection_group_id,
      s.material_id,
      s.material_name,
      COUNT(*) as count
    FROM collection_group_specimens cgs
    JOIN specimens s ON cgs.specimen_id = s.id
    GROUP BY cgs.collection_group_id, s.material_id, s.material_name
  ) sub
  GROUP BY collection_group_id
),
storage_distribution AS (
  SELECT
    cgs.collection_group_id,
    jsonb_agg(
      jsonb_build_object(
        'storage_location_id', sl.id,
        'location_name', sl.name,
        'location_code', sl.code,
        'count', count
      )
      ORDER BY count DESC
      LIMIT 10
    ) as storage_locations
  FROM (
    SELECT
      cgs.collection_group_id,
      s.storage_location_id,
      COUNT(*) as count
    FROM collection_group_specimens cgs
    JOIN specimens s ON cgs.specimen_id = s.id
    WHERE s.storage_location_id IS NOT NULL
    GROUP BY cgs.collection_group_id, s.storage_location_id
  ) sub
  JOIN storage_locations sl ON sub.storage_location_id = sl.id
  GROUP BY collection_group_id
)
SELECT
  gen_random_uuid() as id,
  cg.id as collection_group_id,
  cg.user_id,
  cg.name as group_name,
  cg.group_type,
  cg.is_public,
  cg.specimen_count,
  COALESCE(ml.materials_in_collection, '[]'::jsonb) as materials_in_collection,
  COALESCE(ss.unique_materials, 0) as unique_materials,
  COALESCE(ss.condition_distribution, '{}'::jsonb) as specimens_by_condition,
  COALESCE(ss.state_distribution, '{}'::jsonb) as specimens_by_state,
  COALESCE(ss.total_weight, 0) as total_weight_grams,
  COALESCE(ss.total_value, 0) as total_estimated_value,
  COALESCE(ss.avg_weight, 0) as average_weight_grams,
  COALESCE(ss.avg_value, 0) as average_estimated_value,
  COALESCE(ss.acquisition_methods, '{}'::jsonb) as acquisition_methods,
  jsonb_build_object(
    'earliest', ss.earliest_acquisition,
    'latest', ss.latest_acquisition
  ) as acquisition_date_range,
  COALESCE(sd.storage_locations, '[]'::jsonb) as storage_locations,
  COALESCE(ss.specimens_without_storage, 0) as specimens_without_storage,
  COALESCE(ss.added_last_30_days, 0) as specimens_added_last_30_days,
  COALESCE(ss.added_last_90_days, 0) as specimens_added_last_90_days,
  COALESCE(ss.specimens_with_title, 0) as specimens_with_title,
  COALESCE(ss.specimens_with_description, 0) as specimens_with_description,
  COALESCE(ss.specimens_with_photos, 0) as specimens_with_photos,
  COALESCE(ss.avg_photos_per_specimen, 0) as average_photos_per_specimen,
  NOW() as calculated_at
FROM collection_groups cg
LEFT JOIN specimen_stats ss ON cg.id = ss.collection_group_id
LEFT JOIN material_list ml ON cg.id = ml.collection_group_id
LEFT JOIN storage_distribution sd ON cg.id = sd.collection_group_id;

-- =====================================================
-- MATERIALIZED VIEW: MATERIAL ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW material_analytics_mv AS
WITH specimen_stats AS (
  SELECT
    material_id,
    material_name,
    user_id,
    COUNT(*) as specimen_count,
    COUNT(DISTINCT variety) as unique_varieties,
    SUM(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as total_weight,
    AVG(weight_grams) FILTER (WHERE weight_grams IS NOT NULL) as avg_weight,
    SUM(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as total_value,
    AVG(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as avg_value,
    jsonb_object_agg(
      condition,
      COUNT(*)
    ) FILTER (WHERE condition IS NOT NULL) as condition_distribution,
    jsonb_object_agg(
      state,
      COUNT(*)
    ) FILTER (WHERE state IS NOT NULL) as state_distribution,
    jsonb_object_agg(
      acquisition_method,
      COUNT(*)
    ) FILTER (WHERE acquisition_method IS NOT NULL) as acquisition_methods,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as added_last_30_days,
    MIN(acquisition_date) as first_specimen_date,
    MAX(acquisition_date) as latest_specimen_date
  FROM specimens
  GROUP BY material_id, material_name, user_id
)
SELECT
  gen_random_uuid() as id,
  material_id,
  user_id,
  material_name,
  specimen_count,
  unique_varieties,
  condition_distribution as specimens_by_condition,
  state_distribution as specimens_by_state,
  total_weight as total_weight_grams,
  total_value as total_estimated_value,
  avg_weight as average_weight_grams,
  avg_value as average_estimated_value,
  acquisition_methods,
  added_last_30_days as specimens_added_last_30_days,
  first_specimen_date,
  latest_specimen_date,
  NOW() as calculated_at
FROM specimen_stats;

-- =====================================================
-- INDEXES
-- =====================================================

-- Analytics cache indexes
CREATE INDEX idx_analytics_cache_user_id ON analytics_cache(user_id);
CREATE INDEX idx_analytics_cache_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_level ON analytics_cache(level);
CREATE INDEX idx_analytics_cache_entity_id ON analytics_cache(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_analytics_cache_status ON analytics_cache(status);
CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_accessed_at ON analytics_cache(accessed_at);

-- Analytics update events indexes
CREATE INDEX idx_analytics_update_events_user_id ON analytics_update_events(user_id);
CREATE INDEX idx_analytics_update_events_entity_type ON analytics_update_events(entity_type);
CREATE INDEX idx_analytics_update_events_entity_id ON analytics_update_events(entity_id);
CREATE INDEX idx_analytics_update_events_processed ON analytics_update_events(processed) WHERE NOT processed;
CREATE INDEX idx_analytics_update_events_created_at ON analytics_update_events(created_at);

-- Materialized view indexes
CREATE UNIQUE INDEX idx_user_analytics_mv_user_id ON user_analytics_mv(user_id);
CREATE UNIQUE INDEX idx_storage_location_analytics_mv_location_id ON storage_location_analytics_mv(storage_location_id);
CREATE INDEX idx_storage_location_analytics_mv_user_id ON storage_location_analytics_mv(user_id);
CREATE UNIQUE INDEX idx_tag_analytics_mv_tag_id ON tag_analytics_mv(tag_id);
CREATE INDEX idx_tag_analytics_mv_user_id ON tag_analytics_mv(user_id);
CREATE UNIQUE INDEX idx_collection_group_analytics_mv_group_id ON collection_group_analytics_mv(collection_group_id);
CREATE INDEX idx_collection_group_analytics_mv_user_id ON collection_group_analytics_mv(user_id);
CREATE UNIQUE INDEX idx_material_analytics_mv_material_user ON material_analytics_mv(material_id, user_id);
CREATE INDEX idx_material_analytics_mv_user_id ON material_analytics_mv(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps for analytics_cache
CREATE TRIGGER update_analytics_cache_updated_at
  BEFORE UPDATE ON analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update accessed_at when cache is read
CREATE OR REPLACE FUNCTION update_cache_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_cache_accessed_at
  BEFORE UPDATE OF data ON analytics_cache
  FOR EACH ROW
  WHEN (OLD.data IS DISTINCT FROM NEW.data)
  EXECUTE FUNCTION update_cache_accessed_at();

-- Create analytics update event on specimen changes
CREATE OR REPLACE FUNCTION create_analytics_update_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_update_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    affected_levels,
    affected_entities
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    ARRAY['USER', 'STORAGE_LOCATION', 'TAG', 'COLLECTION_GROUP', 'MATERIAL']::analytics_level[],
    ARRAY[COALESCE(NEW.id::TEXT, OLD.id::TEXT)]
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on specimens table
CREATE TRIGGER create_analytics_update_event_specimens
  AFTER INSERT OR UPDATE OR DELETE ON specimens
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on storage_locations table
CREATE TRIGGER create_analytics_update_event_storage
  AFTER INSERT OR UPDATE OR DELETE ON storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on tags table
CREATE TRIGGER create_analytics_update_event_tags
  AFTER INSERT OR UPDATE OR DELETE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on collection_groups table
CREATE TRIGGER create_analytics_update_event_groups
  AFTER INSERT OR UPDATE OR DELETE ON collection_groups
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY storage_location_analytics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY tag_analytics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY collection_group_analytics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY material_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_update_events ENABLE ROW LEVEL SECURITY;

-- Analytics cache policies
CREATE POLICY "Users can view own analytics cache"
  ON analytics_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics cache"
  ON analytics_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics cache"
  ON analytics_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics cache"
  ON analytics_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Analytics update events policies
CREATE POLICY "Users can view own analytics events"
  ON analytics_update_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events"
  ON analytics_update_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics events"
  ON analytics_update_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user analytics (from materialized view or cache)
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analytics JSONB;
  v_cache_record RECORD;
BEGIN
  -- Check cache first
  SELECT * INTO v_cache_record
  FROM analytics_cache
  WHERE user_id = p_user_id
    AND level = 'USER'
    AND status = 'FRESH'
    AND expires_at > NOW();
  
  IF FOUND THEN
    RETURN v_cache_record.data;
  END IF;
  
  -- Get from materialized view
  SELECT row_to_json(ua.*)::jsonb INTO v_analytics
  FROM user_analytics_mv ua
  WHERE user_id = p_user_id;
  
  -- Cache result
  IF v_analytics IS NOT NULL THEN
    INSERT INTO analytics_cache (
      user_id,
      cache_key,
      level,
      data,
      status,
      ttl_seconds,
      expires_at,
      calculation_time_ms,
      data_size_bytes
    ) VALUES (
      p_user_id,
      'USER',
      'USER',
      v_analytics,
      'FRESH',
      300,
      NOW() + INTERVAL '5 minutes',
      0,
      length(v_analytics::text)
    )
    ON CONFLICT (user_id, cache_key) DO UPDATE
    SET data = EXCLUDED.data,
        status = 'FRESH',
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
  END IF;
  
  RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invalidate analytics cache
CREATE OR REPLACE FUNCTION invalidate_analytics_cache(
  p_user_id UUID,
  p_level analytics_level,
  p_entity_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE analytics_cache
  SET status = 'STALE',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND level = p_level
    AND (p_entity_id IS NULL OR entity_id = p_entity_id);
END;
$$ LANGUAGE plpgsql;

-- Process analytics update events
CREATE OR REPLACE FUNCTION process_analytics_update_events()
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  FOR v_event IN
    SELECT *
    FROM analytics_update_events
    WHERE NOT processed
    ORDER BY created_at
    LIMIT 100
  LOOP
    -- Invalidate caches for affected levels
    FOREACH v_level IN ARRAY v_event.affected_levels
    LOOP
      PERFORM invalidate_analytics_cache(
        v_event.user_id,
        v_level
      );
    END LOOP;
    
    -- Mark event as processed
    UPDATE analytics_update_events
    SET processed = TRUE,
        processed_at = NOW()
    WHERE id = v_event.id;
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

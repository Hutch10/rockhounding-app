/**
 * Telemetry Types and Interfaces
 * 
 * Complete telemetry data model for tracking:
 * - Performance metrics
 * - Sync timings
 * - Cache hit/miss ratios
 * - Background job durations
 * - User interaction signals
 */

import { z } from 'zod';

// ============================================================================
// Event Categories
// ============================================================================

export const TelemetryEventCategory = z.enum([
  'performance',
  'sync',
  'cache',
  'background_job',
  'user_interaction',
  'error',
  'network',
  'database',
]);

export type TelemetryEventCategory = z.infer<typeof TelemetryEventCategory>;

// ============================================================================
// Event Severity
// ============================================================================

export const EventSeverity = z.enum([
  'debug',
  'info',
  'warning',
  'error',
  'critical',
]);

export type EventSeverity = z.infer<typeof EventSeverity>;

// ============================================================================
// Base Telemetry Event
// ============================================================================

export const BaseTelemetryEventSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  session_id: z.string().uuid(),
  category: TelemetryEventCategory,
  event_name: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
  severity: EventSeverity,
  
  // Device context
  device_type: z.enum(['mobile', 'tablet', 'desktop']).nullable(),
  platform: z.string().max(50).nullable(),
  browser: z.string().max(50).nullable(),
  viewport_width: z.number().int().positive().nullable(),
  viewport_height: z.number().int().positive().nullable(),
  
  // Network context
  connection_type: z.string().max(20).nullable(),
  is_online: z.boolean(),
  
  // App context
  app_version: z.string().max(20).nullable(),
  page_url: z.string().max(500).nullable(),
  
  // Custom metadata
  metadata: z.record(z.unknown()).nullable(),
});

export type BaseTelemetryEvent = z.infer<typeof BaseTelemetryEventSchema>;

// ============================================================================
// Performance Metrics
// ============================================================================

export const PerformanceMetricSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('performance'),
  
  // Core Web Vitals
  lcp: z.number().nullable(), // Largest Contentful Paint (ms)
  fid: z.number().nullable(), // First Input Delay (ms)
  cls: z.number().nullable(), // Cumulative Layout Shift (score)
  
  // Additional metrics
  ttfb: z.number().nullable(), // Time to First Byte (ms)
  fcp: z.number().nullable(),  // First Contentful Paint (ms)
  tti: z.number().nullable(),  // Time to Interactive (ms)
  
  // Custom timings
  component_render_time: z.number().nullable(),
  api_response_time: z.number().nullable(),
  query_execution_time: z.number().nullable(),
  
  // Memory
  memory_used_mb: z.number().nullable(),
  memory_limit_mb: z.number().nullable(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

// ============================================================================
// Sync Events
// ============================================================================

export const SyncEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('sync'),
  
  // Sync details
  sync_type: z.enum(['full', 'incremental', 'conflict_resolution', 'forced']),
  sync_direction: z.enum(['upload', 'download', 'bidirectional']),
  
  // Timing
  sync_start: z.string().datetime(),
  sync_end: z.string().datetime(),
  sync_duration_ms: z.number().int().nonnegative(),
  
  // Volume
  records_synced: z.number().int().nonnegative(),
  bytes_transferred: z.number().int().nonnegative(),
  
  // Status
  sync_status: z.enum(['success', 'partial', 'failed']),
  conflicts_detected: z.number().int().nonnegative(),
  conflicts_resolved: z.number().int().nonnegative(),
  
  // Error details
  error_message: z.string().max(500).nullable(),
  error_code: z.string().max(50).nullable(),
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

// ============================================================================
// Cache Events
// ============================================================================

export const CacheEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('cache'),
  
  // Cache operation
  operation: z.enum(['hit', 'miss', 'write', 'invalidate', 'evict']),
  cache_key: z.string().max(200),
  cache_level: z.enum([
    'user',
    'storage-location',
    'tag',
    'collection-group',
    'material',
    'time-period',
    'other',
  ]),
  
  // Timing
  lookup_time_ms: z.number().nonnegative().nullable(),
  write_time_ms: z.number().nonnegative().nullable(),
  
  // Size
  entry_size_bytes: z.number().int().nonnegative().nullable(),
  
  // Cache state
  cache_size_entries: z.number().int().nonnegative().nullable(),
  cache_size_bytes: z.number().int().nonnegative().nullable(),
  eviction_count: z.number().int().nonnegative().nullable(),
});

export type CacheEvent = z.infer<typeof CacheEventSchema>;

// ============================================================================
// Background Job Events
// ============================================================================

export const BackgroundJobEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('background_job'),
  
  // Job details
  job_type: z.enum([
    'analytics_refresh',
    'cache_warmup',
    'data_export',
    'image_processing',
    'notification_delivery',
    'scheduled_backup',
    'other',
  ]),
  job_id: z.string().uuid(),
  
  // Timing
  job_start: z.string().datetime(),
  job_end: z.string().datetime(),
  job_duration_ms: z.number().int().nonnegative(),
  
  // Status
  job_status: z.enum(['started', 'completed', 'failed', 'cancelled', 'timeout']),
  
  // Volume
  items_processed: z.number().int().nonnegative().nullable(),
  items_failed: z.number().int().nonnegative().nullable(),
  
  // Resource usage
  cpu_time_ms: z.number().int().nonnegative().nullable(),
  memory_peak_mb: z.number().nullable(),
  
  // Error details
  error_message: z.string().max(500).nullable(),
  error_stack: z.string().max(2000).nullable(),
});

export type BackgroundJobEvent = z.infer<typeof BackgroundJobEventSchema>;

// ============================================================================
// User Interaction Events
// ============================================================================

export const UserInteractionEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('user_interaction'),
  
  // Interaction details
  interaction_type: z.enum([
    'click',
    'scroll',
    'input',
    'submit',
    'navigation',
    'search',
    'filter',
    'sort',
    'export',
    'share',
  ]),
  
  // Target
  element_id: z.string().max(100).nullable(),
  element_type: z.string().max(50).nullable(),
  element_text: z.string().max(200).nullable(),
  
  // Context
  feature_name: z.string().max(100).nullable(),
  screen_name: z.string().max(100).nullable(),
  
  // Timing
  interaction_duration_ms: z.number().int().nonnegative().nullable(),
  
  // Position
  x_position: z.number().int().nullable(),
  y_position: z.number().int().nullable(),
});

export type UserInteractionEvent = z.infer<typeof UserInteractionEventSchema>;

// ============================================================================
// Error Events
// ============================================================================

export const ErrorEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('error'),
  
  // Error details
  error_type: z.enum([
    'javascript_error',
    'network_error',
    'api_error',
    'validation_error',
    'auth_error',
    'database_error',
    'unknown_error',
  ]),
  error_message: z.string().max(1000),
  error_stack: z.string().max(5000).nullable(),
  
  // Context
  component_name: z.string().max(100).nullable(),
  function_name: z.string().max(100).nullable(),
  file_path: z.string().max(500).nullable(),
  line_number: z.number().int().positive().nullable(),
  column_number: z.number().int().positive().nullable(),
  
  // HTTP context (for API errors)
  http_status: z.number().int().nullable(),
  http_method: z.string().max(10).nullable(),
  endpoint: z.string().max(200).nullable(),
  
  // User impact
  is_recoverable: z.boolean(),
  user_notified: z.boolean(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

// ============================================================================
// Network Events
// ============================================================================

export const NetworkEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('network'),
  
  // Request details
  request_id: z.string().uuid().nullable(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  endpoint: z.string().max(200),
  
  // Timing
  request_start: z.string().datetime(),
  request_end: z.string().datetime(),
  duration_ms: z.number().int().nonnegative(),
  
  // Response
  status_code: z.number().int(),
  response_size_bytes: z.number().int().nonnegative().nullable(),
  
  // Status
  is_success: z.boolean(),
  is_cached: z.boolean(),
  retry_count: z.number().int().nonnegative(),
});

export type NetworkEvent = z.infer<typeof NetworkEventSchema>;

// ============================================================================
// Database Events
// ============================================================================

export const DatabaseEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('database'),
  
  // Query details
  query_type: z.enum(['select', 'insert', 'update', 'delete', 'rpc']),
  table_name: z.string().max(100).nullable(),
  rpc_name: z.string().max(100).nullable(),
  
  // Timing
  query_start: z.string().datetime(),
  query_end: z.string().datetime(),
  execution_time_ms: z.number().int().nonnegative(),
  
  // Volume
  rows_affected: z.number().int().nonnegative().nullable(),
  rows_returned: z.number().int().nonnegative().nullable(),
  
  // Status
  is_success: z.boolean(),
  error_code: z.string().max(50).nullable(),
  
  // Query plan (for slow queries)
  query_plan: z.string().max(2000).nullable(),
});

export type DatabaseEvent = z.infer<typeof DatabaseEventSchema>;

// ============================================================================
// Telemetry Event Union
// ============================================================================

export const TelemetryEventSchema = z.discriminatedUnion('category', [
  PerformanceMetricSchema,
  SyncEventSchema,
  CacheEventSchema,
  BackgroundJobEventSchema,
  UserInteractionEventSchema,
  ErrorEventSchema,
  NetworkEventSchema,
  DatabaseEventSchema,
]);

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

// ============================================================================
// Telemetry Batch
// ============================================================================

export const TelemetryBatchSchema = z.object({
  batch_id: z.string().uuid(),
  events: z.array(TelemetryEventSchema).min(1).max(100),
  batch_timestamp: z.string().datetime(),
  client_timestamp: z.string().datetime(),
  compressed: z.boolean().default(false),
});

export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;

// ============================================================================
// Aggregated Metrics
// ============================================================================

export const AggregatedMetricsSchema = z.object({
  metric_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  category: TelemetryEventCategory,
  event_name: z.string(),
  
  // Time window
  window_start: z.string().datetime(),
  window_end: z.string().datetime(),
  window_size_minutes: z.number().int().positive(),
  
  // Statistics
  event_count: z.number().int().nonnegative(),
  
  // Performance stats (when applicable)
  avg_duration_ms: z.number().nullable(),
  min_duration_ms: z.number().nullable(),
  max_duration_ms: z.number().nullable(),
  p50_duration_ms: z.number().nullable(),
  p95_duration_ms: z.number().nullable(),
  p99_duration_ms: z.number().nullable(),
  
  // Error stats
  error_count: z.number().int().nonnegative(),
  error_rate: z.number().min(0).max(1),
  
  // Cache stats
  cache_hit_count: z.number().int().nonnegative().nullable(),
  cache_miss_count: z.number().int().nonnegative().nullable(),
  cache_hit_rate: z.number().min(0).max(1).nullable(),
  
  // Metadata
  created_at: z.string().datetime(),
});

export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;

// ============================================================================
// Telemetry Config
// ============================================================================

export const TelemetryConfigSchema = z.object({
  // Sampling
  sampling_rate: z.number().min(0).max(1).default(1.0),
  performance_sampling_rate: z.number().min(0).max(1).default(0.1),
  
  // Batching
  batch_size: z.number().int().positive().default(50),
  batch_timeout_ms: z.number().int().positive().default(5000),
  
  // Buffering
  max_buffer_size: z.number().int().positive().default(1000),
  offline_buffer_ttl_ms: z.number().int().positive().default(86400000), // 24 hours
  
  // Filtering
  enabled_categories: z.array(TelemetryEventCategory).default([
    'performance',
    'sync',
    'cache',
    'background_job',
    'user_interaction',
    'error',
    'network',
    'database',
  ]),
  
  // Privacy
  anonymize_user_data: z.boolean().default(false),
  include_device_info: z.boolean().default(true),
  include_network_info: z.boolean().default(true),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;

// ============================================================================
// Client-side Aggregation
// ============================================================================

export interface TelemetryAggregator {
  recordEvent(event: TelemetryEvent): void;
  flush(): Promise<void>;
  getBufferedEvents(): TelemetryEvent[];
  clearBuffer(): void;
  getMetrics(): {
    bufferedCount: number;
    sentCount: number;
    errorCount: number;
    lastFlush: Date | null;
  };
}

// ============================================================================
// Telemetry Query Filters
// ============================================================================

export const TelemetryQueryFiltersSchema = z.object({
  user_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  category: TelemetryEventCategory.optional(),
  event_name: z.string().optional(),
  severity: EventSeverity.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type TelemetryQueryFilters = z.infer<typeof TelemetryQueryFiltersSchema>;

// ============================================================================
// Telemetry Summary
// ============================================================================

export const TelemetrySummarySchema = z.object({
  total_events: z.number().int().nonnegative(),
  events_by_category: z.record(TelemetryEventCategory, z.number().int().nonnegative()),
  events_by_severity: z.record(EventSeverity, z.number().int().nonnegative()),
  
  // Performance summary
  avg_page_load_time_ms: z.number().nullable(),
  avg_api_response_time_ms: z.number().nullable(),
  
  // Cache summary
  cache_hit_rate: z.number().min(0).max(1).nullable(),
  
  // Sync summary
  total_sync_events: z.number().int().nonnegative(),
  avg_sync_duration_ms: z.number().nullable(),
  sync_success_rate: z.number().min(0).max(1).nullable(),
  
  // Error summary
  total_errors: z.number().int().nonnegative(),
  error_rate: z.number().min(0).max(1),
  top_errors: z.array(z.object({
    error_message: z.string(),
    count: z.number().int().nonnegative(),
  })).max(10),
  
  // Time range
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
});

export type TelemetrySummary = z.infer<typeof TelemetrySummarySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

export function createEventId(): string {
  return crypto.randomUUID();
}

export function createSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('telemetry_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('telemetry_session_id', sessionId);
    }
    return sessionId;
  }
  return crypto.randomUUID();
}

export function getDeviceContext() {
  if (typeof window === 'undefined') {
    return {
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
    };
  }

  const width = window.innerWidth;
  const device_type = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  return {
    device_type,
    platform: navigator.platform || null,
    browser: navigator.userAgent || null,
    viewport_width: width,
    viewport_height: window.innerHeight,
  };
}

export function getNetworkContext() {
  if (typeof navigator === 'undefined') {
    return {
      connection_type: null,
      is_online: true,
    };
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    connection_type: connection?.effectiveType || null,
    is_online: navigator.onLine,
  };
}

export function shouldSampleEvent(category: TelemetryEventCategory, config: TelemetryConfig): boolean {
  if (!config.enabled_categories.includes(category)) {
    return false;
  }

  const rate = category === 'performance' ? config.performance_sampling_rate : config.sampling_rate;
  return Math.random() < rate;
}

/**
 * HutchStack Core telemetry event union + batch contract (Phase 1).
 */
import { z } from 'zod';

import { BaseTelemetryEventSchema } from './contract';

export const PerformanceMetricSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('performance'),
  lcp: z.number().nullable(),
  fid: z.number().nullable(),
  cls: z.number().nullable(),
  ttfb: z.number().nullable(),
  fcp: z.number().nullable(),
  tti: z.number().nullable(),
  component_render_time: z.number().nullable(),
  api_response_time: z.number().nullable(),
  query_execution_time: z.number().nullable(),
  memory_used_mb: z.number().nullable(),
  memory_limit_mb: z.number().nullable(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

export const SyncEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('sync'),
  sync_type: z.enum(['full', 'incremental', 'conflict_resolution', 'forced']),
  sync_direction: z.enum(['upload', 'download', 'bidirectional']),
  sync_start: z.string().datetime(),
  sync_end: z.string().datetime(),
  sync_duration_ms: z.number().int().nonnegative(),
  records_synced: z.number().int().nonnegative(),
  bytes_transferred: z.number().int().nonnegative(),
  sync_status: z.enum(['success', 'partial', 'failed']),
  conflicts_detected: z.number().int().nonnegative(),
  conflicts_resolved: z.number().int().nonnegative(),
  error_message: z.string().max(500).nullable(),
  error_code: z.string().max(50).nullable(),
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

export const CacheEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('cache'),
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
  lookup_time_ms: z.number().nonnegative().nullable(),
  write_time_ms: z.number().nonnegative().nullable(),
  entry_size_bytes: z.number().int().nonnegative().nullable(),
  cache_size_entries: z.number().int().nonnegative().nullable(),
  cache_size_bytes: z.number().int().nonnegative().nullable(),
  eviction_count: z.number().int().nonnegative().nullable(),
});

export type CacheEvent = z.infer<typeof CacheEventSchema>;

export const BackgroundJobEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('background_job'),
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
  job_start: z.string().datetime(),
  job_end: z.string().datetime(),
  job_duration_ms: z.number().int().nonnegative(),
  job_status: z.enum(['started', 'completed', 'failed', 'cancelled', 'timeout']),
  items_processed: z.number().int().nonnegative().nullable(),
  items_failed: z.number().int().nonnegative().nullable(),
  cpu_time_ms: z.number().int().nonnegative().nullable(),
  memory_peak_mb: z.number().nullable(),
  error_message: z.string().max(500).nullable(),
  error_stack: z.string().max(2000).nullable(),
});

export type BackgroundJobEvent = z.infer<typeof BackgroundJobEventSchema>;

export const UserInteractionEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('user_interaction'),
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
  element_id: z.string().max(100).nullable(),
  element_type: z.string().max(50).nullable(),
  element_text: z.string().max(200).nullable(),
  feature_name: z.string().max(100).nullable(),
  screen_name: z.string().max(100).nullable(),
  interaction_duration_ms: z.number().int().nonnegative().nullable(),
  x_position: z.number().int().nullable(),
  y_position: z.number().int().nullable(),
});

export type UserInteractionEvent = z.infer<typeof UserInteractionEventSchema>;

export const ErrorEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('error'),
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
  component_name: z.string().max(100).nullable(),
  function_name: z.string().max(100).nullable(),
  file_path: z.string().max(500).nullable(),
  line_number: z.number().int().positive().nullable(),
  column_number: z.number().int().positive().nullable(),
  http_status: z.number().int().nullable(),
  http_method: z.string().max(10).nullable(),
  endpoint: z.string().max(200).nullable(),
  is_recoverable: z.boolean(),
  user_notified: z.boolean(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export const NetworkEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('network'),
  request_id: z.string().uuid().nullable(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  endpoint: z.string().max(200),
  request_start: z.string().datetime(),
  request_end: z.string().datetime(),
  duration_ms: z.number().int().nonnegative(),
  status_code: z.number().int(),
  response_size_bytes: z.number().int().nonnegative().nullable(),
  is_success: z.boolean(),
  is_cached: z.boolean(),
  retry_count: z.number().int().nonnegative(),
});

export type NetworkEvent = z.infer<typeof NetworkEventSchema>;

export const DatabaseEventSchema = BaseTelemetryEventSchema.extend({
  category: z.literal('database'),
  query_type: z.enum(['select', 'insert', 'update', 'delete', 'rpc']),
  table_name: z.string().max(100).nullable(),
  rpc_name: z.string().max(100).nullable(),
  query_start: z.string().datetime(),
  query_end: z.string().datetime(),
  execution_time_ms: z.number().int().nonnegative(),
  rows_affected: z.number().int().nonnegative().nullable(),
  rows_returned: z.number().int().nonnegative().nullable(),
  is_success: z.boolean(),
  error_code: z.string().max(50).nullable(),
  query_plan: z.string().max(2000).nullable(),
});

export type DatabaseEvent = z.infer<typeof DatabaseEventSchema>;

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

export const TelemetryBatchSchema = z.object({
  batch_id: z.string().uuid(),
  events: z.array(TelemetryEventSchema).min(1).max(100),
  batch_timestamp: z.string().datetime(),
  client_timestamp: z.string().datetime(),
  compressed: z.boolean().default(false),
});

export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;

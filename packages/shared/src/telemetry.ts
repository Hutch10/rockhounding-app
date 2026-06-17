/**
 * Telemetry Types and Interfaces
 *
 * Contract schemas: @hutchstack/core-telemetry (Phase 1 shim).
 * Aggregated metrics, config, and helpers remain in Rockhound shared.
 */

import {
  TelemetryEventCategory,
  EventSeverity,
  BaseTelemetryEventSchema,
  PerformanceMetricSchema,
  SyncEventSchema,
  CacheEventSchema,
  BackgroundJobEventSchema,
  UserInteractionEventSchema,
  ErrorEventSchema,
  NetworkEventSchema,
  DatabaseEventSchema,
  TelemetryEventSchema,
  TelemetryBatchSchema,
  FIELD_OPS_EVENT_CATALOG,
  type BaseTelemetryEvent,
  type PerformanceMetric,
  type SyncEvent,
  type CacheEvent,
  type BackgroundJobEvent,
  type UserInteractionEvent,
  type ErrorEvent,
  type NetworkEvent,
  type DatabaseEvent,
  type TelemetryEvent,
  type TelemetryBatch,
} from '@hutchstack/core-telemetry';
import { z } from 'zod';

export {
  TelemetryEventCategory,
  EventSeverity,
  BaseTelemetryEventSchema,
  PerformanceMetricSchema,
  SyncEventSchema,
  CacheEventSchema,
  BackgroundJobEventSchema,
  UserInteractionEventSchema,
  ErrorEventSchema,
  NetworkEventSchema,
  DatabaseEventSchema,
  TelemetryEventSchema,
  TelemetryBatchSchema,
  FIELD_OPS_EVENT_CATALOG,
  type BaseTelemetryEvent,
  type PerformanceMetric,
  type SyncEvent,
  type CacheEvent,
  type BackgroundJobEvent,
  type UserInteractionEvent,
  type ErrorEvent,
  type NetworkEvent,
  type DatabaseEvent,
  type TelemetryEvent,
  type TelemetryBatch,
};

// ============================================================================
// Aggregated Metrics
// ============================================================================

export const AggregatedMetricsSchema = z.object({
  metric_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  category: TelemetryEventCategory,
  event_name: z.string(),
  window_start: z.string().datetime(),
  window_end: z.string().datetime(),
  window_size_minutes: z.number().int().positive(),
  event_count: z.number().int().nonnegative(),
  avg_duration_ms: z.number().nullable(),
  min_duration_ms: z.number().nullable(),
  max_duration_ms: z.number().nullable(),
  p50_duration_ms: z.number().nullable(),
  p95_duration_ms: z.number().nullable(),
  p99_duration_ms: z.number().nullable(),
  error_count: z.number().int().nonnegative(),
  error_rate: z.number().min(0).max(1),
  cache_hit_count: z.number().int().nonnegative().nullable(),
  cache_miss_count: z.number().int().nonnegative().nullable(),
  cache_hit_rate: z.number().min(0).max(1).nullable(),
  created_at: z.string().datetime(),
});

export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;

// ============================================================================
// Telemetry Config
// ============================================================================

export const TelemetryConfigSchema = z.object({
  sampling_rate: z.number().min(0).max(1).default(1.0),
  performance_sampling_rate: z.number().min(0).max(1).default(0.1),
  batch_size: z.number().int().positive().default(50),
  batch_timeout_ms: z.number().int().positive().default(5000),
  max_buffer_size: z.number().int().positive().default(1000),
  offline_buffer_ttl_ms: z.number().int().positive().default(86400000),
  enabled_categories: z
    .array(TelemetryEventCategory)
    .default([
      'performance',
      'sync',
      'cache',
      'background_job',
      'user_interaction',
      'error',
      'network',
      'database',
    ]),
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
  avg_page_load_time_ms: z.number().nullable(),
  avg_api_response_time_ms: z.number().nullable(),
  cache_hit_rate: z.number().min(0).max(1).nullable(),
  total_sync_events: z.number().int().nonnegative(),
  avg_sync_duration_ms: z.number().nullable(),
  sync_success_rate: z.number().min(0).max(1).nullable(),
  total_errors: z.number().int().nonnegative(),
  error_rate: z.number().min(0).max(1),
  top_errors: z
    .array(
      z.object({
        error_message: z.string(),
        count: z.number().int().nonnegative(),
      })
    )
    .max(10),
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
    if (sessionId === null || sessionId === '') {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('telemetry_session_id', sessionId);
    }
    return sessionId;
  }
  return crypto.randomUUID();
}

export function getDeviceContext(): {
  device_type: 'mobile' | 'tablet' | 'desktop' | null;
  platform: string | null;
  browser: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
} {
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
    platform: navigator.platform !== '' ? navigator.platform : null,
    browser: navigator.userAgent !== '' ? navigator.userAgent : null,
    viewport_width: width,
    viewport_height: window.innerHeight,
  };
}

export function getNetworkContext(): {
  connection_type: string | null;
  is_online: boolean;
} {
  if (typeof navigator === 'undefined') {
    return {
      connection_type: null,
      is_online: true,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
    mozConnection?: { effectiveType?: string };
    webkitConnection?: { effectiveType?: string };
  };
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;

  return {
    connection_type: connection?.effectiveType ?? null,
    is_online: navigator.onLine,
  };
}

export function shouldSampleEvent(
  category: z.infer<typeof TelemetryEventCategory>,
  config: TelemetryConfig
): boolean {
  if (!config.enabled_categories.includes(category)) {
    return false;
  }

  const rate = category === 'performance' ? config.performance_sampling_rate : config.sampling_rate;
  return Math.random() < rate;
}

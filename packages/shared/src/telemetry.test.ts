/**
 * Telemetry System - Type Safety Tests
 * 
 * Verifies that all telemetry types are properly exported and type-safe
 */

import { describe, it, expect } from 'vitest';
import {
  // Event Categories
  TelemetryEventCategory,
  EventSeverity,
  
  // Event Types
  BaseTelemetryEvent,
  PerformanceMetric,
  SyncEvent,
  CacheEvent,
  BackgroundJobEvent,
  UserInteractionEvent,
  ErrorEvent,
  NetworkEvent,
  DatabaseEvent,
  TelemetryEvent,
  
  // Batch Types
  TelemetryBatch,
  AggregatedMetrics,
  TelemetrySummary,
  
  // Config Types
  TelemetryConfig,
  TelemetryQueryFilters,
  
  // Schemas
  TelemetryEventSchema,
  TelemetryBatchSchema,
  PerformanceMetricSchema,
  SyncEventSchema,
  CacheEventSchema,
  
  // Helper Functions
  createEventId,
  createSessionId,
  getDeviceContext,
  getNetworkContext,
  shouldSampleEvent,
} from '@rockhounding/shared';

describe('Telemetry Type Exports', () => {
  it('should export all event category enums', () => {
    expect(TelemetryEventCategory.enum.performance).toBe('performance');
    expect(TelemetryEventCategory.enum.sync).toBe('sync');
    expect(TelemetryEventCategory.enum.cache).toBe('cache');
    expect(TelemetryEventCategory.enum.background_job).toBe('background_job');
    expect(TelemetryEventCategory.enum.user_interaction).toBe('user_interaction');
    expect(TelemetryEventCategory.enum.error).toBe('error');
    expect(TelemetryEventCategory.enum.network).toBe('network');
    expect(TelemetryEventCategory.enum.database).toBe('database');
  });

  it('should export event severity enums', () => {
    expect(EventSeverity.enum.debug).toBe('debug');
    expect(EventSeverity.enum.info).toBe('info');
    expect(EventSeverity.enum.warning).toBe('warning');
    expect(EventSeverity.enum.error).toBe('error');
    expect(EventSeverity.enum.critical).toBe('critical');
  });

  it('should validate performance metric schema', () => {
    const validMetric: PerformanceMetric = {
      event_id: 'test-id',
      user_id: 'user-123',
      session_id: 'session-123',
      category: 'performance',
      event_name: 'page_load',
      timestamp: new Date().toISOString(),
      severity: 'info',
      device_type: 'desktop',
      platform: 'Windows',
      browser: 'Chrome',
      viewport_width: 1920,
      viewport_height: 1080,
      connection_type: '4g',
      is_online: true,
      app_version: '1.0.0',
      page_url: 'https://example.com',
      metadata: null,
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      ttfb: 500,
      fcp: 1500,
      tti: 3000,
      component_render_time: 50,
      api_response_time: 200,
      query_execution_time: 100,
      memory_used_mb: 128,
      memory_limit_mb: 512,
    };

    const result = PerformanceMetricSchema.safeParse(validMetric);
    expect(result.success).toBe(true);
  });

  it('should validate sync event schema', () => {
    const validSync: SyncEvent = {
      event_id: 'test-id',
      user_id: 'user-123',
      session_id: 'session-123',
      category: 'sync',
      event_name: 'data_sync',
      timestamp: new Date().toISOString(),
      severity: 'info',
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
      connection_type: null,
      is_online: true,
      app_version: null,
      page_url: null,
      metadata: null,
      sync_type: 'incremental',
      sync_direction: 'bidirectional',
      sync_start: new Date().toISOString(),
      sync_end: new Date().toISOString(),
      sync_duration_ms: 1000,
      records_synced: 100,
      bytes_transferred: 50000,
      sync_status: 'success',
      conflicts_detected: 0,
      conflicts_resolved: 0,
      error_message: null,
      error_code: null,
    };

    const result = SyncEventSchema.safeParse(validSync);
    expect(result.success).toBe(true);
  });

  it('should validate cache event schema', () => {
    const validCache: CacheEvent = {
      event_id: 'test-id',
      user_id: 'user-123',
      session_id: 'session-123',
      category: 'cache',
      event_name: 'cache_lookup',
      timestamp: new Date().toISOString(),
      severity: 'debug',
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
      connection_type: null,
      is_online: true,
      app_version: null,
      page_url: null,
      metadata: null,
      operation: 'hit',
      cache_key: 'user:123:analytics',
      cache_level: 'user',
      lookup_time_ms: 10,
      write_time_ms: null,
      entry_size_bytes: 4096,
      cache_size_entries: 100,
      cache_size_bytes: 409600,
      eviction_count: 0,
    };

    const result = CacheEventSchema.safeParse(validCache);
    expect(result.success).toBe(true);
  });

  it('should validate telemetry batch schema', () => {
    const validBatch: TelemetryBatch = {
      batch_id: 'batch-123',
      events: [
        {
          event_id: 'event-1',
          user_id: 'user-123',
          session_id: 'session-123',
          category: 'performance',
          event_name: 'test',
          timestamp: new Date().toISOString(),
          severity: 'info',
          device_type: null,
          platform: null,
          browser: null,
          viewport_width: null,
          viewport_height: null,
          connection_type: null,
          is_online: true,
          app_version: null,
          page_url: null,
          metadata: null,
          lcp: 2500,
          fid: null,
          cls: null,
          ttfb: null,
          fcp: null,
          tti: null,
          component_render_time: null,
          api_response_time: null,
          query_execution_time: null,
          memory_used_mb: null,
          memory_limit_mb: null,
        },
      ],
      batch_timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString(),
      compressed: false,
    };

    const result = TelemetryBatchSchema.safeParse(validBatch);
    expect(result.success).toBe(true);
  });

  it('should generate unique event IDs', () => {
    const id1 = createEventId();
    const id2 = createEventId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should get device context', () => {
    const context = getDeviceContext();
    
    // Should return object with expected keys
    expect(context).toHaveProperty('device_type');
    expect(context).toHaveProperty('platform');
    expect(context).toHaveProperty('browser');
    expect(context).toHaveProperty('viewport_width');
    expect(context).toHaveProperty('viewport_height');
  });

  it('should get network context', () => {
    const context = getNetworkContext();
    
    expect(context).toHaveProperty('connection_type');
    expect(context).toHaveProperty('is_online');
    expect(typeof context.is_online).toBe('boolean');
  });

  it('should apply sampling correctly', () => {
    const config: TelemetryConfig = {
      sampling_rate: 1.0,
      performance_sampling_rate: 0.1,
      batch_size: 50,
      batch_timeout_ms: 5000,
      max_buffer_size: 1000,
      offline_buffer_ttl_ms: 86400000,
      enabled_categories: ['performance', 'error'],
      anonymize_user_data: false,
      include_device_info: true,
      include_network_info: true,
    };

    // Performance should use performance_sampling_rate
    const shouldSamplePerf = shouldSampleEvent('performance', config);
    expect(typeof shouldSamplePerf).toBe('boolean');

    // Other categories should use sampling_rate
    const shouldSampleError = shouldSampleEvent('error', config);
    expect(typeof shouldSampleError).toBe('boolean');

    // Disabled category should never sample
    const shouldSampleSync = shouldSampleEvent('sync', config);
    expect(shouldSampleSync).toBe(false);
  });

  it('should reject invalid events', () => {
    const invalidEvent = {
      event_id: 'invalid',
      category: 'performance',
      event_name: 'test',
      // Missing required fields
    };

    const result = TelemetryEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject invalid batch size', () => {
    const invalidBatch = {
      batch_id: 'batch-123',
      events: [], // Empty array (min 1)
      batch_timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString(),
      compressed: false,
    };

    const result = TelemetryBatchSchema.safeParse(invalidBatch);
    expect(result.success).toBe(false);
  });

  it('should enforce max batch size', () => {
    const events = Array(101).fill({
      event_id: 'event-1',
      user_id: 'user-123',
      session_id: 'session-123',
      category: 'performance',
      event_name: 'test',
      timestamp: new Date().toISOString(),
      severity: 'info',
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
      connection_type: null,
      is_online: true,
      app_version: null,
      page_url: null,
      metadata: null,
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
      fcp: null,
      tti: null,
      component_render_time: null,
      api_response_time: null,
      query_execution_time: null,
      memory_used_mb: null,
      memory_limit_mb: null,
    });

    const oversizedBatch = {
      batch_id: 'batch-123',
      events,
      batch_timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString(),
      compressed: false,
    };

    const result = TelemetryBatchSchema.safeParse(oversizedBatch);
    expect(result.success).toBe(false);
  });
});

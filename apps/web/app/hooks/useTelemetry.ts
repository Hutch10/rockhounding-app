/**
 * Telemetry React Hooks
 * 
 * React hooks for capturing telemetry events and querying telemetry data
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTelemetry } from '@/lib/telemetry/aggregator';
import {
  TelemetryEvent,
  PerformanceMetric,
  SyncEvent,
  CacheEvent,
  BackgroundJobEvent,
  UserInteractionEvent,
  ErrorEvent,
  NetworkEvent,
  DatabaseEvent,
  TelemetrySummary,
  TelemetryQueryFilters,
  AggregatedMetrics,
} from '@rockhounding/shared';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Query Keys
// ============================================================================

export const telemetryKeys = {
  all: ['telemetry'] as const,
  summary: (filters?: TelemetryQueryFilters) => 
    [...telemetryKeys.all, 'summary', filters] as const,
  events: (filters?: TelemetryQueryFilters) => 
    [...telemetryKeys.all, 'events', filters] as const,
  aggregated: (filters?: TelemetryQueryFilters) => 
    [...telemetryKeys.all, 'aggregated', filters] as const,
  performanceTrends: (userId: string, days: number) => 
    [...telemetryKeys.all, 'performance-trends', userId, days] as const,
  errorSummary: (userId: string, days: number) => 
    [...telemetryKeys.all, 'error-summary', userId, days] as const,
};

// ============================================================================
// Event Capture Hooks
// ============================================================================

/**
 * Hook to record telemetry events
 */
export function useTelemetry() {
  const telemetry = getTelemetry();

  const recordEvent = useCallback((event: Omit<TelemetryEvent, 'event_id' | 'session_id' | 'timestamp'>) => {
    telemetry.recordEvent(event as any);
  }, [telemetry]);

  const recordPerformance = useCallback((metric: Omit<PerformanceMetric, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...metric,
      category: 'performance' as const,
      severity: 'info' as const,
    } as any);
  }, [telemetry]);

  const recordSync = useCallback((event: Omit<SyncEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'sync' as const,
      severity: event.sync_status === 'failed' ? 'error' : 'info',
    } as any);
  }, [telemetry]);

  const recordCache = useCallback((event: Omit<CacheEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'cache' as const,
      severity: 'debug' as const,
    } as any);
  }, [telemetry]);

  const recordBackgroundJob = useCallback((event: Omit<BackgroundJobEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'background_job' as const,
      severity: event.job_status === 'failed' ? 'error' : 'info',
    } as any);
  }, [telemetry]);

  const recordUserInteraction = useCallback((event: Omit<UserInteractionEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'user_interaction' as const,
      severity: 'info' as const,
    } as any);
  }, [telemetry]);

  const recordError = useCallback((event: Omit<ErrorEvent, 'event_id' | 'session_id' | 'timestamp' | 'category'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'error' as const,
    } as any);
  }, [telemetry]);

  const recordNetwork = useCallback((event: Omit<NetworkEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'network' as const,
      severity: event.is_success ? 'info' : 'warning',
    } as any);
  }, [telemetry]);

  const recordDatabase = useCallback((event: Omit<DatabaseEvent, 'event_id' | 'session_id' | 'timestamp' | 'category' | 'severity'>) => {
    telemetry.recordEvent({
      ...event,
      category: 'database' as const,
      severity: event.is_success ? 'debug' : 'error',
    } as any);
  }, [telemetry]);

  const flush = useCallback(() => {
    return telemetry.flush();
  }, [telemetry]);

  const getMetrics = useCallback(() => {
    return telemetry.getMetrics();
  }, [telemetry]);

  return {
    recordEvent,
    recordPerformance,
    recordSync,
    recordCache,
    recordBackgroundJob,
    recordUserInteraction,
    recordError,
    recordNetwork,
    recordDatabase,
    flush,
    getMetrics,
  };
}

/**
 * Hook to automatically track component render performance
 */
export function usePerformanceTracking(componentName: string) {
  const { recordPerformance } = useTelemetry();
  const renderStartRef = useRef<number>();

  useEffect(() => {
    renderStartRef.current = performance.now();

    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        
        recordPerformance({
          event_name: 'component_render',
          user_id: null,
          component_render_time: renderTime,
          lcp: null,
          fid: null,
          cls: null,
          ttfb: null,
          fcp: null,
          tti: null,
          api_response_time: null,
          query_execution_time: null,
          memory_used_mb: null,
          memory_limit_mb: null,
          device_type: null,
          platform: null,
          browser: null,
          viewport_width: null,
          viewport_height: null,
          connection_type: null,
          is_online: true,
          app_version: null,
          page_url: null,
          metadata: { component_name: componentName },
        });
      }
    };
  }, [componentName, recordPerformance]);
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking() {
  const { recordUserInteraction } = useTelemetry();

  const trackClick = useCallback((elementId: string, elementType: string, featureName?: string) => {
    recordUserInteraction({
      event_name: 'button_click',
      user_id: null,
      interaction_type: 'click',
      element_id: elementId,
      element_type: elementType,
      element_text: null,
      feature_name: featureName || null,
      screen_name: null,
      interaction_duration_ms: null,
      x_position: null,
      y_position: null,
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
    });
  }, [recordUserInteraction]);

  const trackNavigation = useCallback((screenName: string, fromScreen?: string) => {
    recordUserInteraction({
      event_name: 'navigation',
      user_id: null,
      interaction_type: 'navigation',
      element_id: null,
      element_type: null,
      element_text: null,
      feature_name: null,
      screen_name: screenName,
      interaction_duration_ms: null,
      x_position: null,
      y_position: null,
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
      connection_type: null,
      is_online: true,
      app_version: null,
      page_url: null,
      metadata: fromScreen ? { from_screen: fromScreen } : null,
    });
  }, [recordUserInteraction]);

  return { trackClick, trackNavigation };
}

/**
 * Hook to track errors with React Error Boundary
 */
export function useErrorTracking() {
  const { recordError } = useTelemetry();

  const trackError = useCallback((
    error: Error,
    errorInfo?: {
      componentStack?: string;
      componentName?: string;
    }
  ) => {
    recordError({
      event_name: 'react_error',
      user_id: null,
      severity: 'error',
      error_type: 'javascript_error',
      error_message: error.message,
      error_stack: error.stack || null,
      component_name: errorInfo?.componentName || null,
      function_name: null,
      file_path: null,
      line_number: null,
      column_number: null,
      http_status: null,
      http_method: null,
      endpoint: null,
      is_recoverable: true,
      user_notified: false,
      device_type: null,
      platform: null,
      browser: null,
      viewport_width: null,
      viewport_height: null,
      connection_type: null,
      is_online: true,
      app_version: null,
      page_url: null,
      metadata: errorInfo?.componentStack ? { component_stack: errorInfo.componentStack } : null,
    });
  }, [recordError]);

  return { trackError };
}

// ============================================================================
// Telemetry Query Hooks
// ============================================================================

/**
 * Hook to fetch telemetry summary
 */
export function useTelemetrySummary(userId: string, days: number = 7) {
  const supabase = createClient();

  return useQuery({
    queryKey: telemetryKeys.summary({ 
      user_id: userId, 
      start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      limit: 1000,
      offset: 0,
    } as any),
    queryFn: async (): Promise<TelemetrySummary> => {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.rpc('get_telemetry_summary', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return {
          total_events: 0,
          events_by_category: {} as any,
          events_by_severity: {} as any,
          avg_page_load_time_ms: null,
          avg_api_response_time_ms: null,
          cache_hit_rate: null,
          total_sync_events: 0,
          avg_sync_duration_ms: null,
          sync_success_rate: null,
          total_errors: 0,
          error_rate: 0,
          top_errors: [],
          period_start: startDate,
          period_end: endDate,
        };
      }

      const summary = data[0];
      return {
        total_events: Number(summary.total_events) || 0,
        events_by_category: {} as any, // Would need additional query
        events_by_severity: {} as any, // Would need additional query
        avg_page_load_time_ms: summary.avg_performance_score,
        avg_api_response_time_ms: null,
        cache_hit_rate: summary.cache_hit_rate ? summary.cache_hit_rate / 100 : null,
        total_sync_events: 0,
        avg_sync_duration_ms: null,
        sync_success_rate: null,
        total_errors: Number(summary.total_errors) || 0,
        error_rate: summary.error_rate ? summary.error_rate / 100 : 0,
        top_errors: summary.top_errors || [],
        period_start: startDate,
        period_end: endDate,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch performance trends
 */
export function usePerformanceTrends(userId: string, days: number = 7) {
  const supabase = createClient();

  return useQuery({
    queryKey: telemetryKeys.performanceTrends(userId, days),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_performance_trends', {
        p_user_id: userId,
        p_days: days,
      });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch recent errors
 */
export function useRecentErrors(userId: string, limit: number = 10) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...telemetryKeys.errorSummary(userId, 1), limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telemetry_errors')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to refresh materialized views
 */
export function useRefreshTelemetryViews() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_telemetry_materialized_views');
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all telemetry queries
      queryClient.invalidateQueries({ queryKey: telemetryKeys.all });
    },
  });
}

// ============================================================================
// Web Vitals Hook
// ============================================================================

/**
 * Hook to track Core Web Vitals automatically
 */
export function useWebVitals() {
  const { recordPerformance } = useTelemetry();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      recordPerformance({
        event_name: 'web_vitals_lcp',
        user_id: null,
        lcp: lastEntry.renderTime || lastEntry.loadTime,
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
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // Track FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        recordPerformance({
          event_name: 'web_vitals_fid',
          user_id: null,
          lcp: null,
          fid: entry.processingStart - entry.startTime,
          cls: null,
          ttfb: null,
          fcp: null,
          tti: null,
          component_render_time: null,
          api_response_time: null,
          query_execution_time: null,
          memory_used_mb: null,
          memory_limit_mb: null,
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
        });
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Track CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }

    // Report CLS on page hide
    const reportCLS = () => {
      recordPerformance({
        event_name: 'web_vitals_cls',
        user_id: null,
        lcp: null,
        fid: null,
        cls: clsValue,
        ttfb: null,
        fcp: null,
        tti: null,
        component_render_time: null,
        api_response_time: null,
        query_execution_time: null,
        memory_used_mb: null,
        memory_limit_mb: null,
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
      });
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [recordPerformance]);
}

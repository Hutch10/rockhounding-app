/**
 * Telemetry API - Batch Ingestion Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelemetryBatchSchema } from '@rockhounding/shared';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate batch
    const validationResult = TelemetryBatchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid telemetry batch', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const batch = validationResult.data;
    const supabase = createClient();

    // Transform events for database insertion
    const dbEvents = batch.events.map((event) => {
      const { category } = event;
      
      // Extract event-specific data based on category
      let eventData: Record<string, any> = {};
      
      switch (category) {
        case 'performance':
          eventData = {
            lcp: (event as any).lcp,
            fid: (event as any).fid,
            cls: (event as any).cls,
            ttfb: (event as any).ttfb,
            fcp: (event as any).fcp,
            tti: (event as any).tti,
            component_render_time: (event as any).component_render_time,
            api_response_time: (event as any).api_response_time,
            query_execution_time: (event as any).query_execution_time,
            memory_used_mb: (event as any).memory_used_mb,
            memory_limit_mb: (event as any).memory_limit_mb,
          };
          break;
        
        case 'sync':
          eventData = {
            sync_type: (event as any).sync_type,
            sync_direction: (event as any).sync_direction,
            sync_start: (event as any).sync_start,
            sync_end: (event as any).sync_end,
            sync_duration_ms: (event as any).sync_duration_ms,
            records_synced: (event as any).records_synced,
            bytes_transferred: (event as any).bytes_transferred,
            sync_status: (event as any).sync_status,
            conflicts_detected: (event as any).conflicts_detected,
            conflicts_resolved: (event as any).conflicts_resolved,
            error_message: (event as any).error_message,
            error_code: (event as any).error_code,
          };
          break;
        
        case 'cache':
          eventData = {
            operation: (event as any).operation,
            cache_key: (event as any).cache_key,
            cache_level: (event as any).cache_level,
            lookup_time_ms: (event as any).lookup_time_ms,
            write_time_ms: (event as any).write_time_ms,
            entry_size_bytes: (event as any).entry_size_bytes,
            cache_size_entries: (event as any).cache_size_entries,
            cache_size_bytes: (event as any).cache_size_bytes,
            eviction_count: (event as any).eviction_count,
          };
          break;
        
        case 'background_job':
          eventData = {
            job_type: (event as any).job_type,
            job_id: (event as any).job_id,
            job_start: (event as any).job_start,
            job_end: (event as any).job_end,
            job_duration_ms: (event as any).job_duration_ms,
            job_status: (event as any).job_status,
            items_processed: (event as any).items_processed,
            items_failed: (event as any).items_failed,
            cpu_time_ms: (event as any).cpu_time_ms,
            memory_peak_mb: (event as any).memory_peak_mb,
            error_message: (event as any).error_message,
            error_stack: (event as any).error_stack,
          };
          break;
        
        case 'user_interaction':
          eventData = {
            interaction_type: (event as any).interaction_type,
            element_id: (event as any).element_id,
            element_type: (event as any).element_type,
            element_text: (event as any).element_text,
            feature_name: (event as any).feature_name,
            screen_name: (event as any).screen_name,
            interaction_duration_ms: (event as any).interaction_duration_ms,
            x_position: (event as any).x_position,
            y_position: (event as any).y_position,
          };
          break;
        
        case 'error':
          eventData = {
            error_type: (event as any).error_type,
            error_message: (event as any).error_message,
            error_stack: (event as any).error_stack,
            component_name: (event as any).component_name,
            function_name: (event as any).function_name,
            file_path: (event as any).file_path,
            line_number: (event as any).line_number,
            column_number: (event as any).column_number,
            http_status: (event as any).http_status,
            http_method: (event as any).http_method,
            endpoint: (event as any).endpoint,
            is_recoverable: (event as any).is_recoverable,
            user_notified: (event as any).user_notified,
          };
          break;
        
        case 'network':
          eventData = {
            request_id: (event as any).request_id,
            method: (event as any).method,
            endpoint: (event as any).endpoint,
            request_start: (event as any).request_start,
            request_end: (event as any).request_end,
            duration_ms: (event as any).duration_ms,
            status_code: (event as any).status_code,
            response_size_bytes: (event as any).response_size_bytes,
            is_success: (event as any).is_success,
            is_cached: (event as any).is_cached,
            retry_count: (event as any).retry_count,
          };
          break;
        
        case 'database':
          eventData = {
            query_type: (event as any).query_type,
            table_name: (event as any).table_name,
            rpc_name: (event as any).rpc_name,
            query_start: (event as any).query_start,
            query_end: (event as any).query_end,
            execution_time_ms: (event as any).execution_time_ms,
            rows_affected: (event as any).rows_affected,
            rows_returned: (event as any).rows_returned,
            is_success: (event as any).is_success,
            error_code: (event as any).error_code,
            query_plan: (event as any).query_plan,
          };
          break;
      }

      return {
        event_id: event.event_id,
        user_id: event.user_id,
        session_id: event.session_id,
        category: category,
        event_name: event.event_name,
        timestamp: event.timestamp,
        severity: event.severity,
        device_type: event.device_type,
        platform: event.platform,
        browser: event.browser,
        viewport_width: event.viewport_width,
        viewport_height: event.viewport_height,
        connection_type: event.connection_type,
        is_online: event.is_online,
        app_version: event.app_version,
        page_url: event.page_url,
        event_data: eventData,
        metadata: event.metadata,
      };
    });

    // Insert events into database (batch insert)
    const { error: insertError } = await supabase
      .from('telemetry_events')
      .insert(dbEvents);

    if (insertError) {
      console.error('Failed to insert telemetry events:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert telemetry events', details: insertError.message },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      batch_id: batch.batch_id,
      events_processed: batch.events.length,
    });
  } catch (error) {
    console.error('Telemetry ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Optional: Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

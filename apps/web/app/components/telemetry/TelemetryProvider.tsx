/**
 * Telemetry Provider
 * 
 * React context provider for initializing and managing telemetry
 */

'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initTelemetry, getTelemetry, TelemetryAggregator } from '@/lib/telemetry/aggregator';
import { TelemetryConfig } from '@rockhounding/shared';
import { useWebVitals } from '@/app/hooks/useTelemetry';

interface TelemetryContextValue {
  telemetry: TelemetryAggregator;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

interface TelemetryProviderProps {
  children: ReactNode;
  config?: Partial<TelemetryConfig>;
  userId?: string;
}

export function TelemetryProvider({ children, config, userId }: TelemetryProviderProps) {
  useEffect(() => {
    // Initialize telemetry
    const telemetry = initTelemetry(config);

    // Set user ID if provided
    if (userId) {
      telemetry.setUserId(userId);
    }

    // Cleanup on unmount
    return () => {
      telemetry.destroy();
    };
  }, [config, userId]);

  const telemetry = getTelemetry();

  // Track Web Vitals automatically
  useWebVitals();

  // Set up global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      telemetry.recordEvent({
        category: 'error',
        event_name: 'unhandled_error',
        user_id: userId || null,
        severity: 'error',
        error_type: 'javascript_error',
        error_message: event.message,
        error_stack: event.error?.stack || null,
        component_name: null,
        function_name: null,
        file_path: event.filename || null,
        line_number: event.lineno || null,
        column_number: event.colno || null,
        http_status: null,
        http_method: null,
        endpoint: null,
        is_recoverable: false,
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
        metadata: null,
      } as any);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      telemetry.recordEvent({
        category: 'error',
        event_name: 'unhandled_rejection',
        user_id: userId || null,
        severity: 'error',
        error_type: 'javascript_error',
        error_message: event.reason?.message || String(event.reason),
        error_stack: event.reason?.stack || null,
        component_name: null,
        function_name: null,
        file_path: null,
        line_number: null,
        column_number: null,
        http_status: null,
        http_method: null,
        endpoint: null,
        is_recoverable: false,
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
        metadata: null,
      } as any);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [telemetry, userId]);

  return (
    <TelemetryContext.Provider value={{ telemetry }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within TelemetryProvider');
  }
  return context;
}

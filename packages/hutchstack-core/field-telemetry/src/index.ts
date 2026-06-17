import type { TelemetryEvent } from '@hutchstack/core-telemetry';

export const PACKAGE_VERSION = '0.0.0-phase0';

export interface FieldTelemetryAggregator {
  track(eventName: string, metadata?: Record<string, unknown>): void;
  setSessionContext(sessionId: string, userId?: string | null): void;
  flush(): Promise<void>;
  getBufferDepth(): number;
}

export interface AggregationWindow {
  start: string;
  end: string;
  label: string;
}

export interface SessionMetricsRollup {
  eventName: string;
  count: number;
  p50Ms: number | null;
  p95Ms: number | null;
  window: AggregationWindow;
}

export type { MetricExtractor, CoordScrubber, SessionDefinition } from './extension-points';

export { FIELD_TELEMETRY_CATALOG_LINKS } from './catalog-links';

export type { TelemetryEvent };

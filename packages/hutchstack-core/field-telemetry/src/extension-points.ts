import type { TelemetryEvent } from '@hutchstack/core-telemetry';

export interface MetricExtractor {
  extractDurationMs(event: TelemetryEvent): number | null;
  extractNumeric(event: TelemetryEvent, key: string): number | null;
}

export interface CoordScrubber {
  scrubMetadata(metadata: Record<string, unknown>): Record<string, unknown>;
}

export interface SessionDefinition {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
}

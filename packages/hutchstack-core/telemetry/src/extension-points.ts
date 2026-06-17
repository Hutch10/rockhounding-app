import type { TelemetryBatch, TelemetryEvent } from './index';

export interface EventCatalogEntry {
  eventName: string;
  category: TelemetryEvent['category'];
  description?: string;
  metadataKeys?: string[];
}

export interface EventCatalog {
  register(entries: EventCatalogEntry[]): void;
  isAllowed(eventName: string): boolean;
  get(eventName: string): EventCatalogEntry | undefined;
}

export interface IngestTransport {
  sendBatch(batch: TelemetryBatch): Promise<{ accepted: number }>;
}

export interface PrivacyScrubber {
  scrub(event: TelemetryEvent): TelemetryEvent;
}

export interface SamplingPolicy {
  shouldSample(event: TelemetryEvent): boolean;
}

/**
 * @hutchstack/core-telemetry — Phase 1 contract extraction.
 */

import type { BaseTelemetryEvent } from './contract';

export const PACKAGE_VERSION = '0.1.0-phase1';

export {
  TelemetryEventCategory,
  EventSeverity,
  BaseTelemetryEventSchema,
  type BaseTelemetryEvent,
} from './contract';

export {
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
} from './events';

export {
  FIELD_OPS_EVENT_CATALOG,
  FIELD_TELEMETRY_ROLLUP_EVENTS,
  type FieldOpsEventCatalogEntry,
  type FieldTelemetryRollupEvent,
} from './catalog';

export type {
  EventCatalog,
  EventCatalogEntry,
  IngestTransport,
  PrivacyScrubber,
  SamplingPolicy,
} from './extension-points';

export interface TelemetryClient {
  record(partial: Omit<BaseTelemetryEvent, 'event_id' | 'timestamp'> & { event_id?: string }): void;
  flush(): Promise<void>;
  setSessionContext(sessionId: string, userId?: string | null): void;
}

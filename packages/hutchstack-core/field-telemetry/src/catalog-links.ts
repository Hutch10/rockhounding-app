/**
 * Field telemetry rollup event links (Phase 1).
 * References @hutchstack/core-telemetry field-ops catalog.
 */
import {
  FIELD_OPS_EVENT_CATALOG,
  FIELD_TELEMETRY_ROLLUP_EVENTS,
  type FieldTelemetryRollupEvent,
} from '@hutchstack/core-telemetry';

export const FIELD_TELEMETRY_CATALOG_LINKS = FIELD_TELEMETRY_ROLLUP_EVENTS.map(
  (eventName: FieldTelemetryRollupEvent) => {
    const entry = FIELD_OPS_EVENT_CATALOG.find((e) => e.eventName === eventName);
    return {
      eventName,
      category: entry?.category ?? 'sync',
      metadataKeys: entry?.metadataKeys ?? [],
    };
  }
);

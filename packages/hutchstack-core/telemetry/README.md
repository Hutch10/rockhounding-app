# @hutchstack/core-telemetry

## Responsibility

Versioned, categorized telemetry event contract for field platforms: performance, sync, cache, user_interaction, errors. Supports offline buffering and batch ingest.

**Phase 0:** Interface definitions only. Rockhound `@rockhounding/shared/telemetry` schemas remain authoritative.

## Public interfaces

| Symbol              | Description                    |
| ------------------- | ------------------------------ |
| `TelemetryCategory` | Event category enum            |
| `EventSeverity`     | Severity levels                |
| `TelemetryEvent`    | Single event shape             |
| `TelemetryBatch`    | Batch ingest payload           |
| `TelemetryClient`   | Client record/flush contract   |
| `EventCatalog`      | Allowed event names per domain |

## Dependencies

None (Phase 0). Phase 1 may add `zod` for schema re-export.

## Extension points

| Extension         | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `EventCatalog`    | Declare domain-specific `event_name` allowlist |
| `IngestTransport` | POST to `/api/telemetry/ingest` or equivalent  |
| `PrivacyScrubber` | Coordinate rounding, PII redaction             |
| `SamplingPolicy`  | Rate-limit high-volume events                  |

## Golden fixtures

- [`../fixtures/telemetry-event.golden.json`](../fixtures/telemetry-event.golden.json)

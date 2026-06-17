# @hutchstack/core-field-telemetry

## Responsibility

Client-side batching, offline buffer, periodic flush, and session-scoped aggregation (p50/p95) for field operations telemetry.

**Phase 0:** Interfaces only. Rockhound `apps/web/lib/telemetry/aggregator.ts` remains authoritative.

## Public interfaces

| Symbol                     | Description                       |
| -------------------------- | --------------------------------- |
| `FieldTelemetryAggregator` | track + flush + session context   |
| `SessionMetricsRollup`     | Server-side p50/p95 rollup result |
| `AggregationWindow`        | Time window for rollups           |

## Dependencies

| Package                      | Purpose          |
| ---------------------------- | ---------------- |
| `@hutchstack/core-telemetry` | Base event types |

## Extension points

| Extension           | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `MetricExtractor`   | Derive numeric metrics from event metadata |
| `CoordScrubber`     | Field GPS privacy before flush             |
| `SessionDefinition` | Define session boundaries                  |

## Golden fixtures

Uses shared [`../fixtures/telemetry-event.golden.json`](../fixtures/telemetry-event.golden.json).

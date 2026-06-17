# @hutchstack/core-readiness

## Responsibility

Release readiness scorecards (V1.0 / production-ready): grouped gates, percentage completion, production-ready declaration.

**Phase 0:** Interface definitions only.

## Public interfaces

| Symbol                | Description                    |
| --------------------- | ------------------------------ |
| `ReadinessScorecard`  | Full scorecard definition      |
| `ReadinessGate`       | Single gate with critical flag |
| `ReadinessCompletion` | `{ pass, partial, fail, pct }` |
| `ReadinessEvaluator`  | Compute completion             |

## Dependencies

| Package                          | Purpose            |
| -------------------------------- | ------------------ |
| `@hutchstack/core-certification` | Gate verdict types |

## Extension points

| Extension    | Purpose                       |
| ------------ | ----------------------------- |
| `GateGroup`  | reliability, field, ops, cert |
| `WaivedGate` | Approver-audited waiver       |

## Golden fixtures

- [`../fixtures/readiness-scorecard.golden.json`](../fixtures/readiness-scorecard.golden.json)

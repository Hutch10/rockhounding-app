# @hutchstack/core-ops

## Responsibility

Policy-as-code operational specs: dashboard panel definitions, SQL query templates, alert rules, and escalation metadata. No hosted UI in Core — exports configs for Sentry, Supabase, Grafana.

**Phase 0:** Interfaces and fixture YAML shapes only.

## Public interfaces

| Symbol             | Description                    |
| ------------------ | ------------------------------ |
| `DashboardSpec`    | Panel collection with queries  |
| `DashboardPanel`   | Single metric panel            |
| `AlertRule`        | Condition + severity + runbook |
| `EscalationPolicy` | On-call routing                |
| `MetricTarget`     | SLO threshold                  |

## Dependencies

| Package                      | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `@hutchstack/core-telemetry` | Event catalog references for panels |

## Extension points

| Extension        | Purpose                                |
| ---------------- | -------------------------------------- |
| `PanelRegistry`  | Domain-specific panels (D6 compliance) |
| `MetricProvider` | Pull metrics from Supabase/Sentry      |
| `AlertExporter`  | Export to Sentry/Datadog               |

## Golden fixtures

- [`../fixtures/ops-dashboard-base.golden.json`](../fixtures/ops-dashboard-base.golden.json)
- [`../fixtures/ops-alert-rule.golden.json`](../fixtures/ops-alert-rule.golden.json)

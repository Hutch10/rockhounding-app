# @hutchstack/core-ops-incident

## Responsibility

Incident lifecycle templates: acknowledge → triage → rollback decision → postmortem. Aligns with `@hutchstack/core-ops` alert severities.

**Phase 0:** Interface definitions and golden template fixtures only.

## Public interfaces

| Symbol               | Description                       |
| -------------------- | --------------------------------- |
| `IncidentTemplate`   | Severity-scoped response template |
| `IncidentRecord`     | Active incident metadata          |
| `PostmortemTemplate` | Blameless postmortem sections     |

## Dependencies

| Package                | Purpose                         |
| ---------------------- | ------------------------------- |
| `@hutchstack/core-ops` | AlertSeverity, EscalationPolicy |

## Extension points

| Extension          | Purpose                        |
| ------------------ | ------------------------------ |
| `DomainRunbook`    | Domain-specific runbook links  |
| `IncidentExporter` | Generate Markdown/Linear issue |

## Golden fixtures

- [`../fixtures/incident-template.golden.json`](../fixtures/incident-template.golden.json)

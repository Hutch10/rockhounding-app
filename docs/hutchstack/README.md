# HutchStack Field Discovery Harness

Governance, policies, and operational playbooks for Rockhound's field discovery quality layer.

## Document Index

### Governance

| Document                                                          | Purpose                           |
| ----------------------------------------------------------------- | --------------------------------- |
| [Governance Charter](./HUTCHSTACK_GOVERNANCE_CHARTER.md)          | Authority, principles, risk tiers |
| [Architecture Spec](./HUTCHSTACK_FIELD_DISCOVERY_HARNESS_SPEC.md) | Component design and API contract |
| [Data Quality Policy](./HUTCHSTACK_DATA_QUALITY_POLICY.md)        | Scoring, gates, staleness         |
| [Provenance Policy](./HUTCHSTACK_PROVENANCE_POLICY.md)            | Event chains and retention        |
| [Community Trust Policy](./HUTCHSTACK_COMMUNITY_TRUST_POLICY.md)  | Reputation, tiers, privileges     |

### Operational Playbooks

| Playbook                                                                   | Component                 |
| -------------------------------------------------------------------------- | ------------------------- |
| [Site Verification](./playbooks/SITE_VERIFICATION_PLAYBOOK.md)             | `site_verification`       |
| [Permit Validation](./playbooks/PERMIT_VALIDATION_PLAYBOOK.md)             | `permit_validation`       |
| [User Submissions](./playbooks/USER_SUBMISSIONS_PLAYBOOK.md)               | `user_submissions`        |
| [Material Identification](./playbooks/MATERIAL_IDENTIFICATION_PLAYBOOK.md) | `material_identification` |
| [Moderation Ops](./playbooks/MODERATION_OPS_PLAYBOOK.md)                   | `moderation`              |
| [Community Trust Scoring](./playbooks/COMMUNITY_TRUST_SCORING_PLAYBOOK.md) | `community_trust`         |

## Policy Version

Current: **`hutchstack-v1.1.0`** (Harness **`1.1.0`** — Tier-0 remediation)

| Sprint Doc                                                        | Purpose                        |
| ----------------------------------------------------------------- | ------------------------------ |
| [Tier-0 Remediation Plan](./HUTCHSTACK_TIER0_REMEDIATION_PLAN.md) | Implementation summary         |
| [Tier-0 Test Plan](./HUTCHSTACK_TIER0_TEST_PLAN.md)               | Automated + manual test matrix |
| [Hardening Review](./HUTCHSTACK_HARDENING_REVIEW.md)              | Pre-remediation audit          |
| [Schema Proposal](./schema/provenance_events.proposed.sql)        | Proposed ledger (not deployed) |

## Code References

- **Client-safe:** `@rockhounding/shared/hutchstack` — types, schemas, pure evaluators (no `node:crypto`)
- **Server-only:** `@rockhounding/shared/hutchstack/server` — provenance hashing, orchestrator
- Web orchestrator: `apps/web/lib/hutchstack/harness.ts` (imports server entry)
- API: `POST /api/v1/hutchstack/evaluate`

### Import rules

| Context                     | Import from                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| Client components / hooks   | `@rockhounding/shared` or `@rockhounding/shared/hutchstack`         |
| API routes / server actions | `@rockhounding/shared/hutchstack/server` for `runHarnessEvaluation` |
| Provenance display UI       | `toProvenanceMetadata`, `toProvenanceBadge` (client-safe)           |

## Rollout Status

| Phase                            | Status               |
| -------------------------------- | -------------------- |
| P0 — Docs + shared package + API | Complete             |
| Tier-0 — Hardening remediation   | Complete (no gating) |
| P1 — Staging pre-score wiring    | Planned              |
| P2 — Admin UI harness panel      | Planned              |
| P3 — Nightly trust recompute     | Planned              |

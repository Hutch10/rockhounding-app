# HutchStack Field Discovery Harness — Architecture Specification

**Version:** 1.1.0  
**Policy ID:** `hutchstack-v1.1.0`  
**Harness Version:** `1.1.0`  
**Status:** Active (Tier-0 hardened)

---

## 1. Overview

The HutchStack Field Discovery Harness is a deterministic evaluation pipeline that scores, gates, and documents field discovery artifacts before they enter Rockhound's trusted canon.

```
┌─────────────────────────────────────────────────────────────────┐
│                    HutchStack Harness Orchestrator               │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│ Site        │ Permit      │ User         │ Material             │
│ Verification│ Validation  │ Submissions  │ Identification       │
├─────────────┴─────────────┴──────────────┴──────────────────────┤
│ Moderation Gates          │ Community Trust Scoring             │
├───────────────────────────┴─────────────────────────────────────┤
│ Provenance Ledger (immutable event chain + input/output hashes) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Goals

1. **Composable** — Each component is independently testable with pure functions.
2. **Contract-locked** — Inputs/outputs validated via Zod schemas in `@rockhounding/shared`.
3. **Policy-versioned** — `HUTCHSTACK_POLICY_VERSION = 'hutchstack-v1.0.0'`.
4. **Integration-ready** — Wraps existing RPCs: `moderate_location_v2`, `rpc_check_access_v2`.
5. **Offline-capable** — Field pre-checks run without network; sync reconciles on reconnect.

---

## 3. Component Specifications

### 3.1 Site Verification

**Input:** `SiteVerificationInput` — coordinates, photos, visit count, official source flag, last verified date.  
**Output:** `SiteVerificationResult` — `verification_status`, `confidence`, `gaps[]`, `eligible_for_verified_badge`.

**Rules:**

- Verified badge requires: confidence ≥ 85 AND (official source OR ≥ 2 independent visits with GPS evidence)
- GPS accuracy ≤ 50m or penalty applied
- Stale verification (> 180 days) → `REVERIFICATION_REQUIRED`

### 3.2 Permit Validation

**Input:** `PermitValidationInput` — lat/lon, access_status from RPC, rule metadata, material restrictions.  
**Output:** `PermitValidationResult` — `permit_status`, `advisory_level`, `reason_codes[]`, `confidence_penalties`.

**Rules:**

- Fail-closed: `prohibited` cannot be downgraded without admin override
- Staleness penalties per Data Quality Policy
- Conflicting rules → stricter wins; log `ACCESS_CONFLICT`

### 3.3 User Submissions

**Input:** `UserSubmissionInput` — staging record fields, submitter trust, evidence attachments.  
**Output:** `UserSubmissionResult` — `completeness_score`, `route` (`block` | `standard` | `fast_track` | `escalate`), `flags[]`.

**Rules:**

- Completeness < 50 → `block`
- Duplicate geohash candidate → `escalate`
- Trusted+ with score ≥ 70 → `fast_track`

### 3.4 Material Identification

**Input:** `MaterialIdentificationInput` — classification confidence, validation events, expert flags.  
**Output:** `MaterialIdentificationResult` — `identification_state`, `confidence_breakdown`, `ground_truth_eligible`.

**Rules:**

- ML-only with confidence < 0.6 → `PENDING_USER_VALIDATION`
- Expert validation → boost expert weight to 0.4 in breakdown
- `REJECT_WITH_CORRECTION` → ground truth eligible

### 3.5 Moderation

**Input:** `ModerationGateInput` — staging status, kill-switch state, idempotency key, admin context.  
**Output:** `ModerationGateResult` — `ready`, `blockers[]`, `recommended_action`.

**Rules:**

- Only `PENDING` records are actionable
- Kill-switch active → `ready = false`
- Reject requires reason ≥ 10 chars (RPC enforced)

### 3.6 Community Trust Scoring

**Input:** `TrustScoringInput` — reputation, trust_level, approval stats, evidence quality.  
**Output:** `TrustScoringResult` — `trust_score`, `trust_tier`, `privileges[]`, `flags[]`.

**Rules:**

- Formula per Community Trust Policy
- Wilson lower bound for approval rate when n < 20

---

## 4. Orchestrator API

### Evaluate Request

```typescript
POST /api/v1/hutchstack/evaluate

{
  "evaluation_type": "submission" | "site" | "find" | "full",
  "policy_version": "hutchstack-v1.0.0",  // optional override check
  "site": SiteVerificationInput,
  "permit": PermitValidationInput,
  "submission": UserSubmissionInput,
  "material": MaterialIdentificationInput,
  "moderation": ModerationGateInput,
  "trust": TrustScoringInput
}
```

### Evaluate Response

```typescript
{
  "policy_version": "hutchstack-v1.0.0",
  "evaluated_at": "ISO8601",
  "overall_risk_tier": "T0" | "T1" | "T2" | "T3" | "T4",
  "overall_confidence": 0-100,
  "components": {
    "site_verification": SiteVerificationResult,
    "permit_validation": PermitValidationResult,
    "user_submission": UserSubmissionResult,
    "material_identification": MaterialIdentificationResult,
    "moderation": ModerationGateResult,
    "community_trust": TrustScoringResult
  },
  "provenance": ProvenanceRecord,
  "recommendations": string[]
}
```

---

## 5. Code Layout

```
packages/shared/src/hutchstack/
  ├── types.ts          # Input/output interfaces
  ├── schemas.ts        # Zod validators
  ├── policy.ts         # Version + weights constants
  ├── components/       # Pure evaluators
  │   ├── site-verification.ts
  │   ├── permit-validation.ts
  │   ├── user-submissions.ts
  │   ├── material-identification.ts
  │   ├── moderation.ts
  │   └── community-trust.ts
  ├── provenance.ts     # Hash + ledger builder
  ├── orchestrator.ts   # runHarnessEvaluation()
  └── index.ts

apps/web/lib/hutchstack/
  ├── harness.ts        # Server-side wrapper
  └── adapters.ts       # DB → harness input mappers

apps/web/app/api/v1/hutchstack/evaluate/route.ts
```

---

## 6. Integration Points

| Existing System             | Harness Integration                            |
| --------------------------- | ---------------------------------------------- |
| `locations_staging`         | Pre-score on insert; route to moderation queue |
| `moderate_location_v2`      | Post-moderation provenance event               |
| `rpc_check_access_v2`       | Permit validation input adapter                |
| `validation_events`         | Material identification input                  |
| `profiles.reputation_score` | Trust scoring input                            |
| `classification_results`    | Material confidence input                      |

---

## 7. Testing Strategy

- **Unit:** Each component with golden fixtures (≥ 5 cases per component)
- **Integration:** Full orchestrator paths for submission, find, site
- **Regression:** Policy version bump requires fixture re-approval
- **Determinism:** Same input hash → same output hash (CI enforced)

---

## 8. Rollout Phases

| Phase  | Scope                                            | Gate                |
| ------ | ------------------------------------------------ | ------------------- |
| **P0** | Docs + shared package + API (read-only evaluate) | Governance sign-off |
| **P1** | Wire pre-score on staging insert (server action) | 95% fixture pass    |
| **P2** | Admin UI harness panel on moderation page        | 72h staging bake    |
| **P3** | Nightly trust recompute job                      | Monthly audit clean |

---

## 9. Related Documents

- [Governance Charter](./HUTCHSTACK_GOVERNANCE_CHARTER.md)
- [Playbooks](./playbooks/)
- [Platform Architecture Overview](../Platform_Architecture_Overview.md)

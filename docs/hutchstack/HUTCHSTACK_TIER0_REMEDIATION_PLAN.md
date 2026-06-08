# HutchStack Tier-0 Remediation Plan

**Sprint:** Tier-0 Hardening  
**Date:** 2026-06-07  
**Policy Version:** `hutchstack-v1.1.0`  
**Harness Version:** `1.1.0`  
**Status:** Implemented (code + docs); schema proposed, not deployed

---

## Objective

Resolve all **NO-GO** findings from `HUTCHSTACK_HARDENING_REVIEW.md` without enabling production gating, automatic moderation, or Supabase deployment.

---

## Finding → Remediation Map

| Review Finding              | Tier-0 Remediation                                                 | Status      |
| --------------------------- | ------------------------------------------------------------------ | ----------- |
| P-1/P-2 FNV-1a vs SHA-256   | `sha256-v1` via `node:crypto` in `provenance.ts`                   | ✅          |
| P-3/P-4 Timestamp in hashes | `evaluated_at` excluded from `output_hash` / `evaluation_hash`     | ✅          |
| P-5 Canonical gaps          | `canonical-v1` spec in `canonical.ts`                              | ✅          |
| P-6 No schema version byte  | `CANONICAL_SERIALIZATION_VERSION` in preimage                      | ✅          |
| P-7 No stored inputs        | Schema **proposed** (`provenance_events.proposed.sql`)             | 📋 Proposed |
| P-8 No policy registry      | `policy-manifest.ts` + `computePolicyHash()`                       | ✅          |
| P-9 Broken parent chain     | `ProvenanceChainContext` + `buildHarnessChainFromSubmission()`     | ✅          |
| T-1 Stub trust inputs       | `trust-adapter.ts` + hardened `adapters.ts`                        | ✅          |
| T-2 No trust decay          | `TRUST_DECAY` + `computeEffectiveReputation()`                     | ✅          |
| T-4 Wilson discontinuity    | Wilson for all n < 50                                              | ✅          |
| T-6 Circular evidence       | Evidence from `avg_approved_confidence_90d` only (prior approvals) | ✅          |
| S-3 Duplicate opt-in        | `duplicate-detection.ts` + geohash prefix + haversine              | ✅          |
| L-1 No disclaimer           | `LEGAL_DISCLAIMER` on all harness responses                        | ✅          |
| L-2 Dropped source_type     | Full RPC mapping in `accessCheckToPermitInput()`                   | ✅          |
| M-3 No lab tier             | `MaterialIdentificationTier` enum                                  | ✅          |
| M-4 Direct ground truth     | `CORRECTION_PENDING`; ground truth gated                           | ✅          |

---

## 1. Provenance Hardening

### Implemented

- **Algorithm:** `sha256-v1` (64-char hex)
- **Canonical spec:** `packages/shared/src/hutchstack/canonical.ts`
- **Hash bundle:** `ProvenanceHashes` with `evaluation_hash`, `input_hash`, `output_hash`, `policy_hash`, `harness_version`
- **Replay-stable identity:** `evaluation_hash = SHA256(input_hash + output_hash + policy_hash + entity_id + versions)`
- **Observation split:** `occurred_at` stored on record, never hashed
- **Parent chains:** `chain.parent_event_id` / `root_event_id` wired via `buildHarnessChainFromSubmission()`

### Not deployed (by design)

- `provenance_events` table persistence — schema proposal only

---

## 2. Trust Adapter Hardening

### Implemented

- `buildTrustScoringInput()` — real `created_at`, 90d moderation stats
- `computeEffectiveReputation()` — exponential decay (180-day half-life)
- `computeSubmitterTrustScore()` — isolated from current submission score
- Wilson lower bound for n < 50; zero history → approval rate 0
- `stagingToHarnessRequest()` requires `moderation_history` parameter (no stubs)

### Not implemented (Tier-1)

- Sybil signal ingestion
- Trust freeze enforcement

---

## 3. Duplicate Detection

### Implemented

- Geohash prefix-7 match (aligns with DB `geohash` column)
- Haversine proximity ≤ 200m
- Name similarity ≥ 0.85
- `confidence_penalty` on `UserSubmissionResult.adjusted_confidence`
- `duplicate_detection` component in orchestrator output

---

## 4. Permit Safety

### Implemented

- `legal_disclaimer` on `HarnessEvaluationResponse` and `PermitValidationResult`
- `authority_metadata` — `authority_url`, `source_type`, `managing_agency`
- `staleness_metadata` — `days_since_verified`, `is_stale`, `stale_threshold_days`
- Blank-slate (`boundary_match: none`) elevates advisory to `caution`

---

## 5. Material Identification Safety

### Implemented

| Tier                  | Condition                     |
| --------------------- | ----------------------------- |
| `VISUAL_GUESS`        | ML-only or correction pending |
| `COMMUNITY_SUPPORTED` | User ACCEPT or consensus ≥ 3  |
| `EXPERT_REVIEWED`     | `is_expert_validation`        |
| `LAB_CONFIRMED`       | `is_lab_confirmed`            |

- Removed direct `GROUND_TRUTH` state → `CORRECTION_PENDING`
- `ground_truth_eligible` requires expert+confidence≥4 or lab confirmed
- Weakest-link confidence aggregation (not additive overflow)

---

## Schema Proposal (Not Executed)

See `docs/hutchstack/schema/provenance_events.proposed.sql`

---

## Governance Updates

| Document                                        | Changes                            |
| ----------------------------------------------- | ---------------------------------- |
| `HUTCHSTACK_PROVENANCE_POLICY.md`               | SHA-256, canonical-v1, hash bundle |
| `HUTCHSTACK_COMMUNITY_TRUST_POLICY.md`          | Trust decay formula, Wilson n<50   |
| `HUTCHSTACK_GOVERNANCE_CHARTER.md`              | Legal disclaimer requirement       |
| `HUTCHSTACK_FIELD_DISCOVERY_HARNESS_SPEC.md`    | v1.1.0 API fields                  |
| `playbooks/MATERIAL_IDENTIFICATION_PLAYBOOK.md` | Four identification tiers          |
| `playbooks/USER_SUBMISSIONS_PLAYBOOK.md`        | Automated duplicate signal         |

---

## Implementation Diff Summary

### New files

| File                                                    | Purpose                              |
| ------------------------------------------------------- | ------------------------------------ |
| `packages/shared/src/hutchstack/canonical.ts`           | Canonical serialization spec         |
| `packages/shared/src/hutchstack/policy-manifest.ts`     | Policy bundle + `policy_hash`        |
| `packages/shared/src/hutchstack/duplicate-detection.ts` | Geohash + proximity duplicate signal |
| `packages/shared/src/hutchstack/trust-adapter.ts`       | Real trust input builder             |
| `docs/hutchstack/schema/provenance_events.proposed.sql` | Proposed ledger schema               |
| `docs/hutchstack/HUTCHSTACK_TIER0_TEST_PLAN.md`         | Test plan                            |

### Modified files

| File                         | Changes                                          |
| ---------------------------- | ------------------------------------------------ |
| `provenance.ts`              | SHA-256, hash bundle, chain wiring               |
| `policy.ts`                  | v1.1.0, decay, duplicate constants, disclaimer   |
| `types.ts`                   | New tiers, hashes, metadata, chain context       |
| `orchestrator.ts`            | Disclaimer, harness_version, duplicate component |
| `community-trust.ts`         | Decay, Wilson fix                                |
| `material-identification.ts` | Four tiers, ground truth gate                    |
| `permit-validation.ts`       | Disclaimer + metadata                            |
| `user-submissions.ts`        | Duplicate integration, adjusted_confidence       |
| `adapters.ts`                | Real trust + duplicate + chain                   |
| `schemas.ts`                 | Updated Zod contracts                            |
| `hutchstack.test.ts`         | 20+ Tier-0 tests                                 |

---

## P1 Readiness After Tier-0

| P1 Mode                             | Status                                                          |
| ----------------------------------- | --------------------------------------------------------------- |
| Gating P1 (block/route enforcement) | Still **NO-GO** — requires provenance persistence + shadow bake |
| Shadow P1 (log only)                | **CONDITIONAL GO** after schema deploy + 14-day shadow          |
| Score-only P1                       | **CONDITIONAL GO** after schema deploy                          |

**This sprint explicitly stops before any P1 rollout.**

---

## Verification

```bash
pnpm --filter @rockhounding/shared run build
pnpm exec vitest run packages/shared/src/hutchstack/hutchstack.test.ts
pnpm exec vitest run apps/web/app/api/v1/hutchstack/evaluate/route.test.ts
```

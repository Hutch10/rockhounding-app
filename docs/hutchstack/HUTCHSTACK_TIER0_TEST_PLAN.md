# HutchStack Tier-0 Test Plan

**Version:** 1.0  
**Policy:** `hutchstack-v1.1.0`  
**Harness:** `1.1.0`

---

## 1. Test Scope

Validates Tier-0 remediation without production gating, migration execution, or Supabase deployment.

| Area                      | Test File            | Cases |
| ------------------------- | -------------------- | ----- |
| Canonical serialization   | `hutchstack.test.ts` | 2     |
| Provenance SHA-256        | `hutchstack.test.ts` | 4     |
| Trust adapter             | `hutchstack.test.ts` | 4     |
| Duplicate detection       | `hutchstack.test.ts` | 2     |
| Permit safety             | `hutchstack.test.ts` | 2     |
| Material tiers            | `hutchstack.test.ts` | 4     |
| User submission penalties | `hutchstack.test.ts` | 1     |
| Orchestrator              | `hutchstack.test.ts` | 2     |
| API route                 | `route.test.ts`      | 3     |

**Total automated cases:** 24

---

## 2. Provenance Tests

| ID      | Test                 | Pass Criteria                                                                      |
| ------- | -------------------- | ---------------------------------------------------------------------------------- |
| PROV-01 | Key-order invariance | Same hash for reordered nested objects                                             |
| PROV-02 | Date rejection       | Throws on `Date` objects in canonicalize                                           |
| PROV-03 | SHA-256 format       | 64-char lowercase hex                                                              |
| PROV-04 | Replay stability     | Same `input_hash`, `output_hash`, `evaluation_hash` across different `occurred_at` |
| PROV-05 | Parent chain         | `parent_event_id` equals `submission_event_id`                                     |
| PROV-06 | Policy hash          | `policy_hash` matches `computePolicyHash()`                                        |

---

## 3. Trust Adapter Tests

| ID       | Test                  | Pass Criteria                                      |
| -------- | --------------------- | -------------------------------------------------- |
| TRUST-01 | Real account age      | `account_age_days` from `created_at`               |
| TRUST-02 | Real moderation stats | `approvals_90d` / `rejections_90d` passed through  |
| TRUST-03 | Decay                 | `effective_reputation` < raw after 365d inactivity |
| TRUST-04 | Zero history          | New contributor `trust_score` < 0.5                |
| TRUST-05 | No self-reinforcement | `computeSubmitterTrustScore` uses history only     |

---

## 4. Duplicate Detection Tests

| ID     | Test                 | Pass Criteria                                |
| ------ | -------------------- | -------------------------------------------- |
| DUP-01 | Geohash prefix match | Flags `GEOHASH_PREFIX_MATCH`                 |
| DUP-02 | Proximity            | `is_duplicate_candidate` within 200m         |
| DUP-03 | Confidence penalty   | `adjusted_confidence` < `completeness_score` |
| DUP-04 | Escalate route       | Duplicate triggers `escalate`                |

---

## 5. Permit Safety Tests

| ID      | Test               | Pass Criteria                                 |
| ------- | ------------------ | --------------------------------------------- |
| PERM-01 | Disclaimer present | `legal_disclaimer === LEGAL_DISCLAIMER`       |
| PERM-02 | Authority metadata | URL + agency preserved                        |
| PERM-03 | Staleness metadata | `is_stale` false for fresh rules              |
| PERM-04 | Blank slate        | `advisory_level === caution` when no boundary |

---

## 6. Material Identification Tests

| ID     | Test                   | Pass Criteria                                 |
| ------ | ---------------------- | --------------------------------------------- |
| MAT-01 | VISUAL_GUESS           | ML-only → tier + no ground truth              |
| MAT-02 | No direct ground truth | Correction → `CORRECTION_PENDING`             |
| MAT-03 | Expert gate            | Ground truth requires expert + confidence ≥ 4 |
| MAT-04 | LAB_CONFIRMED          | `is_lab_confirmed` → tier + ground truth      |

---

## 7. API Contract Tests

| ID     | Test         | Pass Criteria                                |
| ------ | ------------ | -------------------------------------------- |
| API-01 | Valid POST   | 200 + `hashes.evaluation_hash` length 64     |
| API-02 | Invalid POST | 400                                          |
| API-03 | GET metadata | Returns `policy_version` + `harness_version` |

---

## 8. Manual Verification (Pre-Shadow P1)

| Step | Action                                                    | Owner         |
| ---- | --------------------------------------------------------- | ------------- |
| 1    | Deploy `provenance_events` schema to staging              | Platform      |
| 2    | Run 50 golden fixture evaluations                         | QA            |
| 3    | Verify replay: re-hash stored inputs → match `input_hash` | Platform      |
| 4    | Compare harness routes vs moderator decisions (14 days)   | Community Ops |

---

## 9. Regression Gate

Tier-0 PR merge requires:

```bash
pnpm --filter @rockhounding/shared run build   # exit 0
pnpm exec vitest run packages/shared/src/hutchstack/hutchstack.test.ts
pnpm exec vitest run apps/web/app/api/v1/hutchstack/evaluate/route.test.ts
```

All cases must pass. Policy version bump requires golden fixture re-approval.

---

## 10. Out of Scope (This Sprint)

- Integration tests against live Supabase
- Trust freeze enforcement tests
- Production staging insert wiring
- Migration execution

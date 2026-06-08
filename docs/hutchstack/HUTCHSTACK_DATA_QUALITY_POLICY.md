# HutchStack Data Quality Policy

**Version:** 1.0  
**Policy ID:** `hutchstack-dq-v1`  
**Applies to:** Locations, staging submissions, finds, access rules, material classifications.

---

## 1. Quality Objectives

Rockhound field discovery data must be:

- **Accurate** — Coordinates, site names, and material IDs reflect field reality within stated confidence bounds.
- **Complete** — Required provenance fields populated before promotion to canon.
- **Fresh** — Access and seasonal data re-verified on schedule.
- **Consistent** — Enum values, confidence scales, and status transitions follow locked contracts.
- **Traceable** — Every quality score links to evidence and evaluator version.

---

## 2. Required Fields by Entity

### Public Location (canon)

| Field                    | Required | Quality Rule                                          |
| ------------------------ | -------- | ----------------------------------------------------- |
| `name`                   | Yes      | 3–120 chars; no placeholder tokens                    |
| `latitude` / `longitude` | Yes      | Valid WGS84; accuracy metadata when available         |
| `access_status`          | Yes      | From `rpc_check_access_v2` or verified override       |
| `source_tier`            | Yes      | Locked enum                                           |
| `confidence_score`       | Yes      | 0–100; computed by harness                            |
| `is_verified`            | Yes      | Only true after Site Verification playbook completion |
| `legal_tag` / provenance | Yes      | Maps to access_status with documented transform       |

### Staging Submission

| Field                                      | Required | Quality Rule            |
| ------------------------------------------ | -------- | ----------------------- |
| All location core fields                   | Yes      | Same as canon           |
| `submitted_by`                             | Yes      | Authenticated user      |
| `submission_confidence`                    | Yes      | Harness pre-score 0–100 |
| `moderation_status`                        | Yes      | Starts `PENDING`        |
| `verification_date` OR `RESEARCH_REQUIRED` | Yes      | Per staging constraint  |

### Find / Material Record

| Field                                     | Required | Quality Rule                       |
| ----------------------------------------- | -------- | ---------------------------------- |
| `material_name` or `material_taxonomy_id` | Yes      | At least one                       |
| `confidence_metrics`                      | Yes      | `ConfidenceBreakdown` contract     |
| `discovered_at`                           | Yes      | ISO 8601; not future-dated         |
| Location (exact or fuzzy)                 | Yes      | Fuzzy default for community shares |

---

## 3. Confidence Scoring Model

Harness computes entity confidence as a weighted blend:

| Signal                      | Weight (location) | Weight (material) |
| --------------------------- | ----------------- | ----------------- |
| Source tier authority       | 30%               | 10%               |
| Evidence corroboration      | 25%               | 35%               |
| Access/permit freshness     | 20%               | —                 |
| Contributor trust           | 15%               | 15%               |
| Machine inference agreement | 10%               | 40%               |

**Thresholds:**

- `< 40` — Block auto-promotion; require admin review
- `40–69` — Standard moderation queue
- `70–84` — Eligible for fast-track (trusted+ contributors)
- `≥ 85` — Eligible for verified badge (with permit check pass)

---

## 4. Data Quality Gates

```
[Intake] → [Harness Pre-Score] → [Staging] → [Moderation] → [Canon]
                ↓                      ↓
           [Reject early]         [Return for evidence]
```

**Gate G1 — Intake:** Schema validation, duplicate geohash check (precision 7), spam heuristics.  
**Gate G2 — Pre-Score:** Minimum completeness score ≥ 50 to enter staging.  
**Gate G3 — Moderation:** Admin action via `moderate_location_v2` RPC only.  
**Gate G4 — Canon:** Confidence ≥ 40; access_status not `prohibited` without explicit admin override + reason.

---

## 5. Duplicate & Conflict Detection

- **Geospatial:** Submissions within 200m of existing canon location → flag `DUPLICATE_CANDIDATE`.
- **Name similarity:** Levenshtein > 0.85 on normalized name + same state → flag.
- **Access conflict:** Multiple rules with severity gap ≥ 2 → `ACCESS_CONFLICT`; fail-closed to stricter rule.

---

## 6. Degradation & Staleness

| Data Type                   | Stale After        | Action                                 |
| --------------------------- | ------------------ | -------------------------------------- |
| Access rules (crowdsourced) | 90 days            | Reduce confidence −15; re-verify queue |
| Access rules (official)     | 365 days           | Flag for refresh                       |
| Site verification           | 180 days           | Remove verified badge; re-queue        |
| Material ML model           | Per model registry | Downgrade machine weight               |

---

## 7. Quality Incidents

Severity levels:

- **P0** — Wrong prohibited→allowed access displayed → immediate kill-switch review
- **P1** — Verified badge on disputed site → rollback + audit within 4h
- **P2** — Systematic duplicate promotions → pause fast-track 24h
- **P3** — Single bad rejection → log; no system pause

---

## 8. Enforcement

Violations of this policy block harness policy promotion and may trigger:

1. Contributor trust penalty (−10 to −30 reputation)
2. Submission privilege downgrade
3. Admin-only submission mode for repeat offenders

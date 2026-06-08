# Playbook: User Submissions

**Component:** `user_submissions`  
**Owner:** Community Ops  
**SLA:** Intake scoring < 5s; queue triage daily

---

## 1. Principle

**User submissions never publish directly.** All intake flows through `locations_staging` with harness pre-scoring before moderation.

---

## 2. Submission Intake Flow

```
User Form / Quick Add
    ↓
Schema Validation (Zod)
    ↓
HutchStack Pre-Score (user_submissions component)
    ↓
┌─ block ────────→ Return to user with gaps
├─ standard ─────→ locations_staging (PENDING)
├─ fast_track ───→ locations_staging (PENDING, priority flag)
└─ escalate ─────→ locations_staging (PENDING, admin alert)
    ↓
Moderation Queue (/admin/moderation)
    ↓
moderate_location_v2 RPC (APPROVE | REJECT)
```

---

## 3. Required Submission Fields

| Field           | Required    | Notes                                      |
| --------------- | ----------- | ------------------------------------------ |
| `name`          | Yes         | 3–120 characters                           |
| `lat` / `lon`   | Yes         | From GPS or map pin                        |
| `state`         | Yes         | US state code                              |
| `legal_tag`     | Yes         | User attestation; verified by permit check |
| `description`   | Recommended | Boosts completeness score                  |
| `directions`    | Recommended | Boosts completeness score                  |
| Evidence photos | Recommended | Required for fast-track                    |

---

## 4. Completeness Scoring

| Field Present                                | Points |
| -------------------------------------------- | ------ |
| Core fields (name, coords, state, legal_tag) | 40     |
| Description (≥ 50 chars)                     | 15     |
| Directions or parking info                   | 15     |
| Season/fees info                             | 10     |
| ≥ 1 evidence attachment                      | 20     |

**Minimum to enter staging:** 50 points

---

## 5. Routing Rules

| Route        | Conditions                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `block`      | Completeness < 50 OR spam flag OR prohibited without research flag       |
| `standard`   | Default path                                                             |
| `fast_track` | Completeness ≥ 70 AND trust_level ≥ 2 AND no duplicate flag              |
| `escalate`   | Duplicate candidate OR access conflict OR new account + high-risk coords |

---

## 6. Duplicate Detection (Automated — Tier-0)

On intake the harness runs `detectDuplicateSite()`:

1. Read `geohash` from staging row (DB trigger populates precision-12; harness uses prefix-7)
2. Caller supplies `nearby_sites` from geohash index query
3. Proximity ≤ 200m → `DUPLICATE_CANDIDATE` + confidence penalty
4. Geohash prefix-7 match → `GEOHASH_PREFIX_MATCH`
5. Name similarity ≥ 0.85 + proximity → `NAME_COLLISION` + escalate penalty

Penalties reduce `adjusted_confidence` and force `escalate` route. Admin resolves: merge, reject, or approve as distinct site.

---

## 7. Contributor Communication

### On Block

> "Your submission needs more detail before review. Please add: [gap list]."

### On Standard Queue

> "Thanks! Your site is in the review queue. Typical review time: 1–3 days."

### On Rejection

> Include `rejection_reason` from moderator (min 10 chars). Contributor reputation −20.

### On Approval

> Site live on map. Contributor reputation +10. Confidence boosted +10 on promotion.

---

## 8. Abuse Response

| Pattern                  | Action                       |
| ------------------------ | ---------------------------- |
| > 5 rejections in 7 days | Submission cooldown 72h      |
| Coordinated duplicates   | Trust freeze                 |
| Prohibited site spam     | −50 reputation; admin review |

---

## 9. Outputs

- `locations_staging` record with `submission_confidence`
- `harness.submission_scored` provenance event
- Routing flag in staging metadata

---

## 10. Metrics

- Intake → staging conversion rate
- Block rate with top gap reasons
- Fast-track approval vs rejection ratio
- Median time in queue

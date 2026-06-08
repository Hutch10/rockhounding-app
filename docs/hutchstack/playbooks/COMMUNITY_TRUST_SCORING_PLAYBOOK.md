# Playbook: Community Trust Scoring

**Component:** `community_trust`  
**Owner:** Community Ops  
**SLA:** Event deltas real-time; full recompute nightly

---

## 1. Purpose

Translate contributor behavior into actionable trust signals that control submission routing, evidence weight, and privileges.

---

## 2. Trust Signals

### Stored (DB)

| Signal      | Table.Column                | Updated When                 |
| ----------- | --------------------------- | ---------------------------- |
| Reputation  | `profiles.reputation_score` | Moderation RPC, admin action |
| Trust Level | `profiles.trust_level`      | Nightly tier recompute       |
| Admin Flag  | `profiles.is_admin`         | Manual assignment            |

### Computed (Harness)

| Signal               | Source                            | Updated When    |
| -------------------- | --------------------------------- | --------------- |
| Harness trust score  | Formula in Community Trust Policy | Each evaluation |
| Approval rate (90d)  | `locations_staging` history       | Nightly         |
| Evidence quality avg | Harness submission scores         | Nightly         |

---

## 3. Nightly Recompute Job

```
FOR each profile:
  1. Count approvals/rejections in 90d window
  2. Compute Wilson lower bound for approval rate
  3. Average submission completeness scores
  4. Evaluate tier requirements → set trust_level
  5. Emit trust.recomputed provenance summary (hash only)
```

### Tier Promotion Rules

| To Level    | Requirements                                                   |
| ----------- | -------------------------------------------------------------- |
| Trusted (2) | reputation ≥ 120 AND approvals ≥ 3                             |
| Expert (3)  | reputation ≥ 200 AND approvals ≥ 10 AND expert_validations ≥ 2 |
| Admin (4)   | Manual only                                                    |

### Tier Demotion Rules

| Condition                     | Action                              |
| ----------------------------- | ----------------------------------- |
| reputation < 80 after penalty | Demote to Novice                    |
| reputation < 150 with trust 3 | Demote to Trusted                   |
| Abuse confirmed               | Immediate demote to Novice + freeze |

---

## 4. Real-Time Event Deltas

Handled by existing RPCs — harness reads result:

| Event               | Delta | Handler                       |
| ------------------- | ----- | ----------------------------- |
| Submission approved | +10   | `moderate_location_v2`        |
| Submission rejected | −20   | `moderate_location_v2`        |
| Expert validation   | +5    | validation event handler (P2) |
| Spam confirmed      | −50   | Admin action                  |

---

## 5. Anti-Gaming Monitors

Daily review queue auto-populated when:

- Reputation +50 in 24h
- > 10 submissions in 24h from new account
- Approval rate Wilson bound < 0.3 with n ≥ 5
- Duplicate submission patterns from IP/device cluster

**Response:** Trust freeze → admin investigates → resolve or penalize

---

## 6. Trust-Informed Routing

Harness reads `TrustScoringResult` during submission evaluation:

| trust_score | Effect                                     |
| ----------- | ------------------------------------------ |
| < 0.3       | Block fast-track; completeness bar +10     |
| 0.3–0.6     | Standard routing only                      |
| 0.6–0.8     | Fast-track eligible if completeness ≥ 70   |
| > 0.8       | Fast-track + reduced moderation SLA target |

---

## 7. Manual Adjustments

Admin may adjust reputation when:

- Filming/education event produces burst of valid submissions
- Penalty applied in error
- Partner institution bulk import credited to liaison

**Required:** justification ≥ 20 chars, logged in admin audit, provenance `trust.manual_adjustment`

---

## 8. User Transparency

Profile page shows:

- Current trust tier badge (Novice / Trusted / Expert)
- Reputation score (numeric)
- Submission stats: approved, rejected, pending

Does not show: internal flags, Wilson bounds, anti-gaming status

---

## 9. Recovery Program

| Stage          | Duration                                       | Conditions              |
| -------------- | ---------------------------------------------- | ----------------------- |
| Probation      | 30 days                                        | After trust freeze lift |
| Standard only  | During probation                               | No fast-track           |
| Recovery bonus | On 2nd consecutive approval with evidence ≥ 80 | +5 reputation           |

---

## 10. Metrics

| Metric                      | Target                     |
| --------------------------- | -------------------------- |
| Trusted+ contributor share  | ≥ 20% of active submitters |
| False positive trust freeze | < 5% of freezes            |
| Tier promotion velocity     | Median 45 days to Trusted  |
| Gaming incident rate        | < 1% of submissions        |

---

## 11. Outputs

- `TrustScoringResult` per harness evaluation
- Updated `profiles.trust_level` nightly
- Weekly trust distribution report to Platform Steward

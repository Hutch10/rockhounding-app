# HutchStack Community Trust Policy

**Version:** 1.1  
**Policy ID:** `hutchstack-trust-v1.1`

---

## 1. Purpose

Community trust scoring determines contributor privileges, submission routing, and weight of user evidence in harness evaluations. Trust is **earned through validated behavior**, not purchased or manually inflated without audit.

---

## 2. Trust Dimensions

| Dimension               | Storage                     | Range         |
| ----------------------- | --------------------------- | ------------- |
| **Reputation Score**    | `profiles.reputation_score` | 0–∞ (floor 0) |
| **Trust Level**         | `profiles.trust_level`      | 1–4 (tier)    |
| **Harness Trust Score** | Computed per evaluation     | 0.0–1.0       |

### Trust Levels

| Level | Name    | Requirements                                                  |
| ----- | ------- | ------------------------------------------------------------- |
| 1     | Novice  | Default for new accounts                                      |
| 2     | Trusted | reputation ≥ 120 AND ≥ 3 approved submissions                 |
| 3     | Expert  | reputation ≥ 200 AND ≥ 10 approved AND ≥ 2 expert validations |
| 4     | Admin   | `is_admin = true`                                             |

---

## 3. Reputation Deltas (Locked)

| Event                                  | Delta | Source                     |
| -------------------------------------- | ----- | -------------------------- |
| Submission approved                    | +10   | `moderate_location_v2` RPC |
| Submission rejected                    | −20   | `moderate_location_v2` RPC |
| Material validation accepted (expert)  | +5    | validation_events          |
| Material validation corrected (expert) | +3    | validation_events          |
| Spam/abuse confirmed                   | −50   | Admin action               |
| False prohibited report                | −15   | Admin action               |

Reputation never drops below 0 (DB constraint enforced).

---

## 4. Harness Trust Score Formula

```
effective_reputation = reputation_score * exp(-λ * days_since_last_moderation_action)
  where λ = ln(2) / 180  (half-life = 180 days)

trust_score = clamp(
  0.15 * normalize(effective_reputation, 0, 300)
+ 0.25 * tier_weight(trust_level)
+ 0.30 * approval_rate(90d)
+ 0.20 * evidence_quality_avg(90d)   // prior APPROVED submissions ONLY
+ 0.10 * account_age_factor
, 0, 1)
```

**Tier weights:** Novice 0.2, Trusted 0.5, Expert 0.8, Admin 1.0

**Approval rate:** Wilson lower bound when total decisions < 50; zero history → 0 (not 0.5).

**Self-reinforcement prohibition:** Current submission harness output must never feed `evidence_quality_avg_90d`.

---

## 5. Privilege Matrix

| Privilege                  | Novice | Trusted           | Expert | Admin |
| -------------------------- | ------ | ----------------- | ------ | ----- |
| Submit locations           | ✓      | ✓                 | ✓      | ✓     |
| Fast-track routing         | —      | ✓ (if score ≥ 70) | ✓      | ✓     |
| Expert material validation | —      | —                 | ✓      | ✓     |
| View all staging           | —      | —                 | —      | ✓     |
| Moderate submissions       | —      | —                 | —      | ✓     |
| Override harness block     | —      | —                 | —      | ✓     |

---

## 6. Anti-Gaming Safeguards

- Approval rate uses **Wilson score lower bound** (not raw ratio) for accounts with < 20 submissions.
- Coordinated duplicate submissions from linked accounts → trust freeze pending review.
- Sudden reputation spikes (> 50 in 24h) → auto-flag for admin review.
- Self-validation loops (user validates own ML output without independent check) → machine weight only.

---

## 7. Trust Recovery

Contributors may recover from low trust through:

1. **Probation period** — 30 days; submissions routed standard only
2. **Evidence improvement** — 2 consecutive approved submissions with evidence score ≥ 80 → +5 reputation
3. **Expert sponsorship** — Expert vouches (logged); one-time +10 with admin visibility

---

## 8. Transparency

Users may view:

- Own reputation score and trust level
- Own submission history and outcomes
- Harness trust score on their pending submissions (read-only)

Users may NOT view:

- Other users' raw reputation (display badges only in v1)
- Internal anti-gaming flags

---

## 9. Review Cadence

- **Daily:** auto-flag review queue
- **Weekly:** trust distribution report
- **Monthly:** privilege matrix effectiveness review

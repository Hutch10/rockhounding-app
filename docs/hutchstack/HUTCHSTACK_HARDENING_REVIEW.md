# HutchStack Field Discovery Harness — Hardening Review

**Review Date:** 2026-06-07  
**Reviewer:** Platform Security & Trust Architecture (audit pass)  
**Scope:** `packages/shared/src/hutchstack/`, `apps/web/lib/hutchstack/`, `apps/web/app/api/v1/hutchstack/`, governance docs in `docs/hutchstack/`  
**Policy Version Under Review:** `hutchstack-v1.0.0`  
**P1 Definition:** Wire harness pre-score on `locations_staging` insert (set `submission_confidence`, routing flags, provenance event)

---

## Executive Summary

The HutchStack harness is a sound **scoring skeleton** with clear governance intent, but it is **not yet hardened for production gating**. Critical gaps exist between documented policy (SHA-256 provenance, mandatory replay chains, geohash duplicate detection, trust anti-gaming) and current implementation (ephemeral FNV-1a hashes, no persistence, stubbed adapter inputs, no automated duplicate or Sybil checks).

**Verdict: NO-GO for production-affecting P1** until Tier-0 blockers below are resolved. A **shadow-mode P1** (evaluate + log only, no staging gate changes) is acceptable as an interim step.

---

## 1. Provenance Integrity

### 1.1 Current State

| Control                 | Documented (Policy)                         | Implemented (Code)                                                       | Gap                   |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| Hash algorithm          | SHA-256 (`HUTCHSTACK_PROVENANCE_POLICY.md`) | 32-bit FNV-1a → 8-char hex (`provenance.ts`)                             | **Critical mismatch** |
| Canonical serialization | Sorted-key JSON                             | Shallow `JSON.stringify` replacer                                        | Partial               |
| Event persistence       | 7-year retention, immutable ledger          | In-memory response only; `harness.ts` comment: "persistence is Phase P1" | **Not persisted**     |
| Policy versioning       | Versioned, replayable                       | `HUTCHSTACK_POLICY_VERSION` constant; reject mismatch on request         | Adequate for v1       |
| Parent chain linking    | `parent_event_id` required in chains        | Optional param; never wired in orchestrator                              | **Chain broken**      |
| Actor attribution       | `actor_id` = real user/system               | Always `actor_id: 'system'`                                              | **No real actor**     |

### 1.2 Hashing Algorithm — Risks

**Risk P-1 (Critical): Collision-prone provenance IDs**  
`hashCanonical()` produces a 32-bit FNV-1a digest. Birthday-bound collision probability becomes non-negligible at thousands of events — unacceptable for an audit ledger advertised as reconstructable over 7 years.

**Risk P-2 (Critical): Policy–implementation divergence**  
Governance specifies SHA-256. Code uses FNV-1a. Auditors and replay tooling built to policy will not match production hashes.

**Risk P-3 (High): Provenance `id` is not input-derived**  
`id = hashCanonical({ type, entityId, at: evaluated_at })`. The timestamp makes the event ID non-reproducible across replays of the same inputs, undermining idempotent audit identity.

**Risk P-4 (High): `output_hash` is time-dependent**  
`evaluated_at` is embedded in the hashed response object. Replaying the same inputs at a different time produces a different `output_hash`, violating stated replay guarantees.

### 1.3 Canonical Serialization — Risks

**Risk P-5 (Medium): `JSON.stringify` edge cases**

- `undefined` fields silently dropped (input drift)
- Float representation (`1` vs `1.0`)
- `Date` objects if ever passed (locale/timezone)
- No Unicode NFC normalization on strings
- No explicit array ordering contract for evidence lists

**Risk P-6 (Medium): No canonical schema version byte**  
Policy changes to field names or structure will change hashes without a migration marker, complicating cross-version replay.

### 1.4 Replay Guarantees — Risks

**Risk P-7 (Critical): No stored inputs**  
Policy requires: _"replayable in staging using stored inputs + policy version."_ The API returns hashes but stores neither full request payload nor component outputs. **Replay is impossible today.**

**Risk P-8 (High): No policy artifact registry**  
`hutchstack-v1.0.0` exists as a string constant only. There is no immutable bundle of weights/thresholds keyed by version for forensic replay.

**Risk P-9 (High): Provenance chain incomplete for P1 path**  
Policy mandates `submission.created → harness.pre_scored → moderation.queued`. Only `harness.evaluated` is emitted, and only in API responses — not in DB.

### 1.5 Recommendations — Provenance

1. Replace FNV-1a with SHA-256 (Web Crypto / Node `crypto.createHash`) and document algorithm ID in each event (`hash_alg: 'sha256-v1'`).
2. Derive provenance `id` from `hash(input_hash + policy_version + entity_id + sequence)` — exclude timestamps from identity hashes.
3. Split **identity hash** (replay-stable) from **observation metadata** (`evaluated_at`, host, request_id).
4. Add `provenance_events` table (see Schema Changes) before any production gating.
5. Store full canonical input JSON (or compressed blob) for 90 days; store hash + summary for 7 years per policy.
6. Publish a `policy_manifest.json` per version containing all weights from `policy.ts` for offline replay verification.
7. Wire `parent_event_id` from `submission.created` event at intake.

---

## 2. Community Trust Scoring

### 2.1 Current State

Implementation: `community-trust.ts`  
Adapter: `stagingToHarnessRequest()` in `adapters.ts`

| Control            | Documented               | Implemented                                                                       | Gap                |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| Wilson lower bound | n < 20 submissions       | n < 20 only; raw ratio for n ≥ 20                                                 | Partial            |
| Anti-gaming flags  | Spike, velocity, freeze  | Flags emitted; **no enforcement**                                                 | **Detection only** |
| Sybil resistance   | Linked accounts, freeze  | Not implemented                                                                   | **Missing**        |
| Trust decay        | Implied by 90d windows   | No time decay on reputation                                                       | **Missing**        |
| Evidence weighting | 90d evidence quality avg | Adapter hardcodes `approvals_90d: 0`, `rejections_90d: 0`, `account_age_days: 30` | **Stubbed**        |

### 2.2 Risks

**Risk T-1 (Critical): P1 adapter fabricates trust inputs**  
`stagingToHarnessRequest()` sets `approvals_90d: 0`, `rejections_90d: 0`, `account_age_days: 30` regardless of actual profile history. This causes:

- New users treated as 30-day accounts (inflated `ageFactor`)
- Approval rate defaults to 0.5 when totalDecisions = 0 (line 53), not Wilson-bound zero-history penalty
- `submitter_trust_score` fallback `reputation_score / 300` — **reputation leakage**: cumulative score substitutes for computed harness trust

**Risk T-2 (High): Popularity leakage**  
High `reputation_score` from old approved submissions permanently elevates `submitter_trust_score` and fast-track eligibility even if recent behavior is poor. No decay function exists despite policy's 90d framing.

**Risk T-3 (High): Gaming — fast-track arbitrage**  
A user can reach `trust_level: 2` with 3 approvals (+30 reputation from 100 default... actually default is 100 in profiles migration, 0 in v1 contract — inconsistency) and immediately benefit from fast-track with fabricated adapter inputs.

**Risk T-4 (High): Wilson bound discontinuity**  
At n = 19 → Wilson; at n = 20 → raw ratio. A single additional submission can jump trust_score materially — exploitable edge.

**Risk T-5 (Medium): Sybil resistance absent**  
No device graph, IP cluster, payment identity, or phone verification. Policy references "linked accounts" and "trust freeze" but no signals feed the harness.

**Risk T-6 (Medium): Self-reinforcing evidence loop**  
Adapter sets `evidence_quality_avg_90d: staging.submission_confidence ?? 50` — using the score being computed as an input to trust scoring (circular if P1 writes submission_confidence from harness output).

**Risk T-7 (Low): Privileges returned but not enforced**  
`privileges[]` in trust result is informational; no server-side gate checks `fast_track_eligible` before routing.

### 2.3 Recommendations — Trust

1. **Block P1** until adapter loads real 90d stats from DB (`locations_staging` history, `profiles.created_at`).
2. Add reputation decay: e.g., `effective_reputation = reputation * exp(-λ * days_since_last_validated_action)`.
3. Apply Wilson lower bound for **all** n < 50; use raw ratio only above threshold.
4. Add Sybil signals table (device_id hash, IP /24 hash, submission velocity) — feed as trust penalties, not public scores.
5. Break circular dependency: evidence quality must come from **prior** submissions only, never current harness output.
6. Enforce privileges in staging insert path (server-side), not client-trusted scores.
7. Align `profiles.reputation_score` default (100 vs 0) across migrations and v1 contract — document canonical default.

---

## 3. Material Identification Safety

### 3.1 Current State

Implementation: `material-identification.ts`  
Policy weights in `policy.ts` (`MATERIAL_CONFIDENCE_WEIGHTS`) are **not used** in the component.

| Control                          | Documented                              | Implemented                                           | Gap                |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------- | ------------------ |
| Confidence tiers (< 0.6, ≥ 0.85) | Playbook gates                          | All machine > 0 → `PENDING_USER_VALIDATION` only      | Simplified         |
| Expert review boundary           | trust_level ≥ 3                         | `is_expert_validation` bool input only; no tier check | **No enforcement** |
| Lab-confirmed separation         | Not in governance                       | Not implemented                                       | **Missing tier**   |
| Correction workflow              | `REJECT_WITH_CORRECTION` → ground truth | Sets `GROUND_TRUTH` state immediately                 | **Premature**      |
| Hazardous materials              | Playbook escalation                     | Not in harness                                        | **Missing**        |

### 3.2 Risks

**Risk M-1 (High): Confidence sum can mislead**  
Weights `0.4 + 0.35 + 0.4 + 0.25` are additive before `Math.min(1, ...)`. Expert + consensus + machine can present inflated `total` that doesn't reflect weakest-link safety logic required for public material claims.

**Risk M-2 (High): ACCEPT → USER_VALIDATED without floor**  
User ACCEPT at any machine confidence (even 0.01) transitions to `USER_VALIDATED` — playbook says no public claim without user confirmation, but harness treats all ACCEPTs equally.

**Risk M-3 (High): No lab-confirmed tier**  
Field ID, expert review, and lab analysis are conflated. A specimen suitable for display ("likely quartz") vs collection catalog ("confirmed rose quartz via XRD") need separate states and UI gating.

**Risk M-4 (Medium): GROUND_TRUTH on single correction**  
`REJECT_WITH_CORRECTION` immediately sets `GROUND_TRUTH` and `ground_truth_eligible: true`. Playbook requires expert validation or high user_confidence for training set inclusion.

**Risk M-5 (Medium): No hazardous / regulated mineral pathway**  
Arsenic minerals, asbestos, uranium — no forced `REQUEST_EXPERT` or `critical` advisory regardless of ML confidence.

**Risk M-6 (Low): Expert input not bounded**  
`is_expert_validation` is caller-supplied; harness does not verify `trust_level ≥ 3` against profile.

### 3.3 Recommendations — Material

1. Add identification tiers: `FIELD_OBSERVED`, `USER_CONFIRMED`, `EXPERT_CONFIRMED`, `LAB_CONFIRMED` — map to distinct UI copy and export permissions.
2. Use weakest-link gating: public material name requires `max(machine, visual, expert) ≥ threshold` AND user action ≠ SKIP.
3. Defer `GROUND_TRUTH` until expert review OR `user_confidence ≥ 4` per playbook.
4. Add `material_hazard_class` input; force `EXPERT_REVIEW` for regulated/hazardous taxonomy nodes.
5. Apply `MATERIAL_CONFIDENCE_WEIGHTS` from policy manifest, not ad-hoc literals.
6. Reject self-validation: if `classification.user_id === validation.user_id`, zero expert/visual weight.

---

## 4. Site Verification

### 4.1 Current State

Implementation: `site-verification.ts`  
Duplicate detection: documented in playbooks; **not implemented in harness** (relies on caller passing `is_duplicate_candidate`).

| Control                              | Documented                    | Implemented                            | Gap                      |
| ------------------------------------ | ----------------------------- | -------------------------------------- | ------------------------ |
| Existence vs productivity            | Not distinguished             | Not distinguished                      | **Missing**              |
| Stale verification (180d)            | Policy + component            | Only when `last_verified_at` provided  | Conditional              |
| Duplicate detection (200m / geohash) | Playbook + DQ policy          | Flag only if passed in                 | **Not automated**        |
| Verified badge                       | Official OR 2 visits + photos | Official + 1 visit + photos sufficient | **Weaker than playbook** |

### 4.2 Risks

**Risk S-1 (High): Official source bypasses visit corroboration**  
`eligible_for_verified_badge` allows `has_official_source` with `visit_count: 1` (or potentially 0 visits if photo_count ≥ 1 — code requires photo_count >= 1 but visit_count check is bypassed for official). A stale or wrong official import could receive verified badge.

**Risk S-2 (High): Existence conflated with productivity**  
Harness scores whether a pin is documented, not whether it is a productive collecting site. No fields for `find_count`, `recent_activity`, or `productivity_tier`. Users may trust barren or dangerous coordinates.

**Risk S-3 (High): Duplicate detection is opt-in**  
`user-submissions.ts` flags `DUPLICATE_CANDIDATE` only when `is_duplicate_candidate: true`. P1 without geohash query will allow duplicate staging rows (geohash index exists in DB but harness doesn't query it).

**Risk S-4 (Medium): Stale detection silent without `last_verified_at`**  
If `last_verified_at` is null, stale path never triggers even for old canon locations. `is_verified` could remain true indefinitely.

**Risk S-5 (Medium): GPS accuracy optional**  
Missing accuracy only adds gap string; doesn't block verified badge if other criteria met.

### 4.3 Recommendations — Site

1. Separate `site_existence_confidence` and `site_productivity_confidence` — require both for T4 risk tier.
2. Tighten verified badge: official source requires `last_verified_at` within 365d AND permit check pass.
3. Implement geohash-7 + 200m proximity query in staging intake adapter (read-only in shadow P1).
4. Default `last_verified_at` staleness from `reviewed_at` or `promoted_at` when null.
5. Add `visit_count` from distinct `submitted_by` / trip linkage, not raw counter input.

---

## 5. Permit Validation

### 5.1 Current State

Implementation: `permit-validation.ts`  
Integration: `accessCheckToPermitInput()` adapter; wraps `rpc_check_access_v2` output.

| Control                | Documented                                         | Implemented                                            | Gap                               |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| Authority provenance   | `authority_url` required for restricted/prohibited | Penalty if missing                                     | Partial                           |
| Review schedules       | 90d / 365d staleness                               | Computed if `last_verified_at` + `source_type` present | Adapter often omits `source_type` |
| Jurisdiction conflicts | severity_gap ≥ 2                                   | Only if caller passes `severity_gap`                   | **Not derived**                   |
| Legal disclaimer       | Required on all user-facing outputs                | Not in harness response                                | **Missing**                       |
| Fail-closed            | prohibited, unknown, conflict                      | Implemented                                            | Adequate                          |

### 5.2 Risks

**Risk L-1 (Critical): No disclaimer in harness/API output**  
Governance Charter §8 and Permit Playbook require informational-only posture with advisory language. `HarnessEvaluationResponse` has no `disclaimer` or `legal_posture` field — downstream UI could present access status as legal permission.

**Risk L-2 (High): `source_type` dropped in adapter**  
`accessCheckToPermitInput()` does not map `source_type` from RPC response. Missing `last_verified_at` defaults to `never_verified` (+0.2 penalty), but staleness tier may be wrong without source classification.

**Risk L-3 (High): Jurisdiction conflicts depend on optional input**  
`rpc_check_access_v2` computes conflicts server-side, but adapter only checks `reason_codes.includes('access_conflict')` — does not pass `severity_gap`. Harness conflict logic may be bypassed.

**Risk L-4 (Medium): Review schedule not operationalized**  
Staleness penalties are scoring-only. No queue or cron linkage to re-verify rules. Scores degrade silently.

**Risk L-5 (Medium): `allowed` with blank_slate_exposure**  
`boundary_match: none` adds penalty but does not elevate advisory above `safe` if status is `allowed` — inconsistent fail-closed posture for unknown parcel.

### 5.3 Recommendations — Permit

1. Add mandatory `legal_disclaimer` string to every harness response touching permit validation.
2. Map full RPC payload in adapter: `source_type`, `severity_gap`, `authority_url`, `managing_agency`, `last_verified_at`.
3. Elevate advisory to `caution` minimum when `boundary_match === 'none'` regardless of status.
4. Create `access_rule_review_queue` populated by staleness evaluation (see Schema).
5. Document jurisdiction conflict resolution authority in governance (already partial; add escalation SLAs).

---

## Consolidated Risk Register

| ID  | Severity | Domain     | Summary                                    |
| --- | -------- | ---------- | ------------------------------------------ |
| P-1 | Critical | Provenance | 32-bit FNV-1a collision risk               |
| P-2 | Critical | Provenance | SHA-256 documented, FNV-1a implemented     |
| P-3 | High     | Provenance | Event ID includes timestamp                |
| P-4 | High     | Provenance | output_hash time-dependent                 |
| P-7 | Critical | Provenance | No stored inputs — replay impossible       |
| T-1 | Critical | Trust      | Adapter stubs 90d stats                    |
| T-2 | High     | Trust      | No reputation decay — popularity leakage   |
| T-4 | High     | Trust      | Wilson/raw discontinuity at n=20           |
| T-5 | Medium   | Trust      | No Sybil signals                           |
| T-6 | Medium   | Trust      | Circular evidence quality input            |
| M-1 | High     | Material   | Additive confidence masking weak signals   |
| M-3 | High     | Material   | No lab-confirmed separation                |
| S-1 | High     | Site       | Official source weakens visit requirements |
| S-2 | High     | Site       | Existence vs productivity conflated        |
| S-3 | High     | Site       | Duplicate detection not automated          |
| L-1 | Critical | Permit     | No legal disclaimer in output              |
| L-2 | High     | Permit     | source_type not mapped in adapter          |

---

## Required Schema Changes

_Documented for future implementation — **do not apply in this review pass**._

### Tier 0 (Before production P1)

```sql
-- 1. Provenance ledger
CREATE TABLE provenance_events (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  hash_alg TEXT NOT NULL DEFAULT 'sha256-v1',
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  input_snapshot JSONB,          -- 90-day retention policy
  output_summary JSONB NOT NULL,
  parent_event_id UUID REFERENCES provenance_events(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trust stats materialized view (90d rolling)
CREATE MATERIALIZED VIEW contributor_trust_stats_90d AS
  SELECT submitted_by AS user_id,
         COUNT(*) FILTER (WHERE moderation_status = 'APPROVED') AS approvals_90d,
         COUNT(*) FILTER (WHERE moderation_status = 'REJECTED') AS rejections_90d,
         AVG(submission_confidence) FILTER (WHERE moderation_status = 'APPROVED') AS evidence_quality_avg_90d
  FROM locations_staging
  WHERE submitted_at > now() - interval '90 days'
  GROUP BY submitted_by;

-- 3. Sybil / velocity signals
CREATE TABLE contributor_risk_signals (
  user_id UUID REFERENCES profiles(id),
  signal_type TEXT NOT NULL,  -- 'velocity', 'ip_cluster', 'device_cluster'
  signal_value TEXT NOT NULL,
  severity TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tier 1 (Before fast-track routing)

```sql
-- 4. Staging harness metadata
ALTER TABLE locations_staging
  ADD COLUMN harness_policy_version TEXT,
  ADD COLUMN harness_risk_tier TEXT,
  ADD COLUMN harness_route TEXT,
  ADD COLUMN harness_evaluated_at TIMESTAMPTZ,
  ADD COLUMN harness_input_hash TEXT,
  ADD COLUMN provenance_event_id UUID REFERENCES provenance_events(id);

-- 5. Site productivity (separate from existence)
ALTER TABLE locations
  ADD COLUMN productivity_tier TEXT,  -- 'unknown', 'barren', 'occasional', 'productive'
  ADD COLUMN last_field_activity_at TIMESTAMPTZ;

-- 6. Material identification tier
ALTER TABLE find_classifications
  ADD COLUMN identification_tier TEXT,  -- 'field_observed', 'user_confirmed', 'expert_confirmed', 'lab_confirmed'
  ADD COLUMN hazard_class TEXT;
```

### Tier 2 (Permit operations)

```sql
-- 7. Access rule review queue
CREATE TABLE access_rule_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_rule_id UUID REFERENCES access_rules(id),
  reason TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);
```

---

## Required Governance Changes

| Doc                                             | Change                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `HUTCHSTACK_PROVENANCE_POLICY.md`               | Amend hash spec to name allowed algorithms explicitly (`sha256-v1`); document interim FNV-1a as **non-production** if retained for dev |
| `HUTCHSTACK_PROVENANCE_POLICY.md`               | Add rule: timestamps excluded from identity hashes                                                                                     |
| `HUTCHSTACK_COMMUNITY_TRUST_POLICY.md`          | Add formal trust decay function and constants                                                                                          |
| `HUTCHSTACK_COMMUNITY_TRUST_POLICY.md`          | Add Sybil signal catalog and freeze enforcement binding                                                                                |
| `HUTCHSTACK_DATA_QUALITY_POLICY.md`             | Split site existence vs productivity scoring                                                                                           |
| `HUTCHSTACK_GOVERNANCE_CHARTER.md`              | Add mandatory `legal_disclaimer` requirement for all permit-touching endpoints                                                         |
| `playbooks/MATERIAL_IDENTIFICATION_PLAYBOOK.md` | Add `LAB_CONFIRMED` tier and hazard-class escalation table                                                                             |
| `playbooks/USER_SUBMISSIONS_PLAYBOOK.md`        | Mark geohash duplicate check as **blocking** for P1, not optional                                                                      |
| `HUTCHSTACK_FIELD_DISCOVERY_HARNESS_SPEC.md`    | Add shadow-mode vs gating-mode P1 distinction                                                                                          |
| New: `HUTCHSTACK_POLICY_MANIFEST.json`          | Machine-readable policy bundle per version                                                                                             |

---

## P1 Go / No-Go Decision

### P1 Scope Reminder

Wire harness pre-score on `locations_staging` insert:

- Set `submission_confidence`
- Potentially block or route (`block` / `fast_track` / `escalate`)
- Emit provenance event

### Decision Matrix

| P1 Mode                                                                                   | Go?                | Rationale                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Gating P1** — block/redirect staging based on harness route                             | **NO-GO**          | T-1 stubbed trust inputs, S-3 no duplicate automation, T-6 circular evidence risk, P-7 no provenance persistence, L-1 no disclaimer |
| **Shadow P1** — evaluate + log to `provenance_events` only; do not change staging outcome | **CONDITIONAL GO** | Acceptable if Tier-0 schema + SHA-256 + real trust adapter loaded; no routing enforcement                                           |
| **Score-only P1** — write `submission_confidence` only; always insert staging             | **CONDITIONAL GO** | Requires provenance persistence + fix adapter stubs + geohash duplicate flag (read-only query); still no `block` route              |

### Official Recommendation

## **NO-GO for production-gating P1**

### Prerequisites for Conditional GO (score-only or shadow)

| #   | Prerequisite                                                                  | Tier |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1   | `provenance_events` table + SHA-256 hashing                                   | P0   |
| 2   | Fix `stagingToHarnessRequest()` to load real profile age + 90d approval stats | P0   |
| 3   | Geohash proximity duplicate check on intake (flag only)                       | P0   |
| 4   | Add `legal_disclaimer` to harness response schema                             | P0   |
| 5   | Break evidence circularity (prior submissions only)                           | P0   |
| 6   | Policy manifest + replay fixture suite (≥ 30 golden cases)                    | P1   |
| 7   | Trust decay + Sybil signal schema                                             | P1   |
| 8   | Material tier separation + hazard class                                       | P2   |

### Suggested Sequencing

```
[Now]        Hardening review complete (this document)
[Next]       P0 schema + hash + adapter fixes (no production behavior change)
[Then]       Shadow P1 for 14 days — compare harness routes vs moderator outcomes
[Then]       Score-only P1 — write submission_confidence + provenance
[Finally]    Gating P1 — enforce block/escalate with kill-switch
```

---

## Appendix: Code References

| Finding                    | Location                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| FNV-1a hash                | `packages/shared/src/hutchstack/provenance.ts:25-32`                                   |
| Timestamp in provenance id | `packages/shared/src/hutchstack/provenance.ts:44`                                      |
| Stubbed trust adapter      | `apps/web/lib/hutchstack/adapters.ts:54-60`                                            |
| Wilson discontinuity       | `packages/shared/src/hutchstack/components/community-trust.ts:48-53`                   |
| Official visit bypass      | `packages/shared/src/hutchstack/components/site-verification.ts:63-66`                 |
| Duplicate flag opt-in      | `packages/shared/src/hutchstack/components/user-submissions.ts:34-42`                  |
| Material weights unused    | `packages/shared/src/hutchstack/policy.ts:53-58` vs `material-identification.ts:50-52` |
| No persistence comment     | `apps/web/lib/hutchstack/harness.ts:9`                                                 |

---

**Review Status:** Complete  
**Next Action:** Address Tier-0 prerequisites before any P1 implementation work begins.

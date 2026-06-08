# HutchStack Field Discovery Harness — Governance Charter

**Version:** 1.0  
**Effective:** 2026-06-07  
**Owner:** Rockhound Platform (Founder / Platform Steward)  
**Scope:** Site verification, permit validation, user submissions, material identification, moderation, and community trust scoring.

---

## 1. Purpose

The HutchStack Field Discovery Harness is Rockhound's deterministic quality-and-trust layer for field discovery data. It governs how site information, legal access signals, user evidence, and material identifications move from raw capture to community-trusted canon.

This charter establishes authority, accountability, and non-negotiable rules before any harness code ships or operates in production.

---

## 2. Strategic Alignment

| Rockhound Objective | HutchStack Responsibility                                        |
| ------------------- | ---------------------------------------------------------------- |
| Data quality        | Score, gate, and surface confidence for every discovery artifact |
| Site verification   | Require corroborating evidence before `is_verified = true`       |
| Evidence validation | Enforce multi-signal checks on user-contributed proof            |
| Provenance          | Produce auditable chains from capture → validation → publication |
| Community trust     | Tie contributor privileges to measurable trust behavior          |

HutchStack does **not** replace human moderation for community submissions. It **accelerates, scores, and audits** moderation decisions.

---

## 3. Governance Principles

1. **Determinism** — Same inputs + same policy version → same harness output. No hidden randomness.
2. **Fail-closed on legal risk** — Ambiguous permit/access signals default to caution or restricted, never silent allow.
3. **Staging before canon** — User submissions never publish directly to public `locations` (Build Document Rule #6).
4. **Provenance by default** — Every harness evaluation emits a ledger entry with actor, inputs hash, policy version, and outcome.
5. **Human override with audit** — Admins may override harness recommendations; overrides require reason and are logged.
6. **Policy versioning** — Harness policy changes are versioned, dated, and backward-replayable for audits.
7. **Offline-safe evaluation** — Field-side pre-checks run locally; authoritative checks reconcile on sync.

---

## 4. Authority Matrix

| Decision                                   | Authority                             | Escalation                                        |
| ------------------------------------------ | ------------------------------------- | ------------------------------------------------- |
| Harness policy version promotion           | Platform Steward                      | Document in changelog + 24h staging bake          |
| Site verification approval (official tier) | Admin Moderator                       | Second admin for disputed sites                   |
| Permit rule dispute resolution             | Access Intelligence Steward           | Legal counsel for prohibited/restricted conflicts |
| User submission fast-track                 | Harness auto-route + Admin spot-check | Escalate if trust < Trusted tier                  |
| Material ID expert validation              | Expert-tier contributor or Admin      | Community appeal queue                            |
| Trust score manual adjustment              | Admin only                            | Requires 20+ char justification                   |
| Kill-switch (`moderation_v2_enabled`)      | Platform Steward                      | Immediate incident comms                          |

---

## 5. Harness Component Ownership

| Component               | Primary Owner       | SLA                                     |
| ----------------------- | ------------------- | --------------------------------------- |
| Site Verification       | Moderation Ops      | PENDING review within 72h               |
| Permit Validation       | Access Intelligence | Real-time API; rule refresh weekly      |
| User Submissions        | Community Ops       | Intake scoring < 5s; queue triage daily |
| Material Identification | AI/Data Steward     | Validation feedback loop weekly         |
| Moderation              | Admin Moderator     | Atomic RPC; idempotent commits          |
| Community Trust Scoring | Community Ops       | Nightly recompute + event deltas        |

---

## 6. Data Classification

| Class             | Examples                                    | Harness Treatment                              |
| ----------------- | ------------------------------------------- | ---------------------------------------------- |
| **Canon**         | Approved `locations`, verified access rules | Highest confidence; provenance required        |
| **Staging**       | `locations_staging`, pending finds          | Scored; blocked from public map                |
| **Evidence**      | Photos, GPS traces, permit URLs             | Immutable after capture; hash-linked           |
| **Inference**     | ML classification, fuzzy geohash            | Labeled as machine inference; never sole proof |
| **Trust signals** | `reputation_score`, `trust_level`           | Derived; recomputed from auditable events      |

---

## 7. Risk Tiers & Publication Gates

| Tier                | Criteria                                                              | Publication                              |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| **T0 — Block**      | Prohibited access unresolved; missing coordinates; spam pattern       | Reject or hold                           |
| **T1 — Caution**    | Restricted/caution access; stale permit data; single-source community | Publish with warnings; no verified badge |
| **T2 — Standard**   | Complete submission; trusted contributor; access check passed         | Staging → moderation queue               |
| **T3 — Fast-track** | Expert contributor; multi-evidence; official source alignment         | Expedited moderation with spot audit     |
| **T4 — Verified**   | Official source OR admin verification + fresh permit check            | `is_verified = true`; confidence boost   |

---

## 8. Compliance & Legal Posture

- HutchStack provides **informational access guidance**, not legal advice.
- All harness responses include mandatory `legal_disclaimer` (see `LEGAL_DISCLAIMER` in policy).
- All user-facing permit outputs include: `authority_url`, `last_verified_at`, `authority_metadata`, `staleness_metadata`, and advisory language.
- Exact coordinates for sensitive sites may be fuzzed per location policy.
- Rejected submissions retain audit records per retention policy (minimum 12 months).

---

## 9. Change Management

1. Propose policy change in `docs/hutchstack/CHANGELOG.md`
2. Run harness regression suite against golden fixtures
3. Staging bake (minimum 24h for scoring threshold changes)
4. Promote policy version; emit `harness.policy.promoted` event
5. Update affected playbooks within 48h

---

## 10. Metrics & Review Cadence

**Weekly:** submission acceptance rate, false-positive rejections, access conflict rate, trust score distribution.  
**Monthly:** provenance completeness audit, moderation SLA, expert validation accuracy.  
**Quarterly:** full harness policy review aligned with Operating Plan Q2/Q3 trust objectives.

---

## 11. Related Documents

- [Field Discovery Harness Spec](./HUTCHSTACK_FIELD_DISCOVERY_HARNESS_SPEC.md)
- [Data Quality Policy](./HUTCHSTACK_DATA_QUALITY_POLICY.md)
- [Provenance Policy](./HUTCHSTACK_PROVENANCE_POLICY.md)
- [Community Trust Policy](./HUTCHSTACK_COMMUNITY_TRUST_POLICY.md)
- [Playbooks](./playbooks/)

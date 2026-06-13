# Sprint 4 — Closed Beta (Weeks 7–8)

**Milestone:** M3 — Closed Beta  
**Goal:** Field Mode hardening + E2E + 5-tester cohort  
**Exit:** META-003 closed beta certification (Gate G2)  
**Prerequisite:** Sprint 3 META-001A **PASS** — commit `7d9a807`

**Planning artifacts:**

- [`sprint-04-certification-gates.md`](../sprint-04-certification-gates.md)
- [`closed-beta-readiness-checklist.md`](../closed-beta-readiness-checklist.md)
- [`../../qa/beta-cohort-plan-5-testers.md`](../../qa/beta-cohort-plan-5-testers.md)
- [`../../qa/beta-success-metrics.md`](../../qa/beta-success-metrics.md)

---

## Sprint 4 Objectives (No Major New Features)

1. **Field Mode hardening** — full-screen field UX shell (FE-010)
2. **Playwright E2E** — offline sync journey (TEST-007)
3. **Beta cohort readiness** — 5 testers onboarded (META-002)
4. **Issue collection workflow** — triage + P0 path
5. **Offline operational validation** — device playbook + CI simulation
6. **Known-risk review** — KR-001 offline prohibited logging

---

## Execution Order

| #   | ID         | Title                       | Status   | Notes                                            |
| --- | ---------- | --------------------------- | -------- | ------------------------------------------------ |
| 1   | FE-010     | Field Mode shell            | pending  | 1-tap enter; GPS strip; Quick Log FAB            |
| 2   | TEST-009   | Field test playbook         | partial  | `docs/qa/FIELD_TEST_PLAYBOOK.md` exists — refine |
| 3   | TEST-007   | Playwright E2E offline sync | pending  | login → map → log → offline → sync               |
| 4   | FE-009     | Collection My Finds polish  | pending  | Show synced finds; optional pending badge        |
| 5   | DEPLOY-004 | Sentry release tracking     | pending  | CB-O1, CB-O2                                     |
| 6   | FE-022     | Offline fallback polish     | pending  | `/offline` UX                                    |
| 7   | API-005    | GET /api/v1/me              | pending  | ProfileV1                                        |
| 8   | FE-023     | Profile page                | pending  | Display name, logout                             |
| 9   | META-002   | Beta cohort onboarding      | pending  | 5 testers                                        |
| 10  | —          | Bug bash buffer (20%)       | reserved | P1 from cohort                                   |
| 11  | META-003   | Closed beta certification   | pending  | Gate G2                                          |

**Deferred (not Sprint 4):** geohash prohibited cache, media upload, trip planning, community submissions.

---

## Week Plan

### Week 7 — Build & Automate

| Day   | Focus                | Deliverable                              |
| ----- | -------------------- | ---------------------------------------- |
| D1–D2 | FE-010 shell         | Field Mode route, FAB, GPS indicator     |
| D3    | TEST-007 scaffold    | Playwright project + offline mock        |
| D4    | TEST-007 scenarios   | Airplane + reconnect + prohibited online |
| D5    | DEPLOY-004 + preview | Sentry release tag on preview deploy     |

### Week 8 — Cohort & Certify

| Day   | Focus                 | Deliverable                          |
| ----- | --------------------- | ------------------------------------ |
| D1    | META-002 kickoff      | 5 invites + playbook + KR-001 notice |
| D2–D4 | Cohort field sessions | Issue triage daily                   |
| D5    | Bug bash + META-003   | Cert packet, retro                   |

---

## Critical Path

```
FE-010 → TEST-007 → META-002 (parallel after D3) → META-003
```

---

## Known-Risk Sprint 4 Actions (KR-001)

| Action                                           | Owner       | Sprint 4  |
| ------------------------------------------------ | ----------- | --------- |
| Document offline prohibited behavior in playbook | QA          | Required  |
| E2E: prohibited blocks Quick Log **online**      | QA          | Required  |
| Spike: cache last access check by geohash        | Engineering | Optional  |
| Post-sync moderation queue                       | —           | Sprint 5+ |

---

## Certification Gates

See [`sprint-04-certification-gates.md`](../sprint-04-certification-gates.md).

**META-003 requires:** 100% of `certification-closed-beta.md` sections 1, 2, 3, 6.

---

## Success Metrics

See [`../../qa/beta-success-metrics.md`](../../qa/beta-success-metrics.md).

---

## Sprint Review Demo

1. Enter Field Mode in 1 tap → Quick Log FAB → offline log → reconnect → collection
2. Playwright CI green on offline sync
3. Show 5-tester feedback summary + sync ≥95%

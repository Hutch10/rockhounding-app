# Sprint 4 — Closed Beta (Weeks 7–8)

**Milestone:** M3 — Closed Beta  
**Goal:** Field Mode hardening + E2E + 5-tester cohort  
**Exit:** META-003 closed beta certification (Gate G2)  
**Prerequisite:** Sprint 3 META-001A **PASS** — commit `7d9a807`  
**Release commit (tag intent):** `c8ca2b9` (2026-06-18)  
**Engineering verdict (2026-06-18):** **GATES PASS WITH DEPLOY HOTFIX / PREVIEW PARTIAL / META-003 NOT PASS**

**Planning artifacts:**

- [`sprint-04-certification-gates.md`](../sprint-04-certification-gates.md)
- [`closed-beta-readiness-checklist.md`](../closed-beta-readiness-checklist.md)
- [`certification-closed-beta.md`](../certification-closed-beta.md)
- [`certification-sprint-04-field-mode.md`](../certification-sprint-04-field-mode.md)
- [`sprint-04-preview-deployment.md`](../sprint-04-preview-deployment.md)
- [`../../qa/beta-cohort-plan-5-testers.md`](../../qa/beta-cohort-plan-5-testers.md)
- [`../../qa/beta-cohort-roster.md`](../../qa/beta-cohort-roster.md)

---

## Sprint 4 Objectives (No Major New Features)

1. **Field Mode hardening** — full-screen field UX shell (FE-010) ✅
2. **Playwright E2E** — offline sync journey (TEST-007) ✅
3. **Beta cohort readiness** — 5 testers onboarded (META-002) ⏳
4. **Issue collection workflow** — triage + P0 path ✅ (template ready)
5. **Offline operational validation** — device playbook + CI simulation ⏳
6. **Known-risk review** — KR-001 offline prohibited logging ✅

---

## Execution Order

| #   | ID         | Title                       | Status       | Notes                                    |
| --- | ---------- | --------------------------- | ------------ | ---------------------------------------- |
| 1   | FE-010     | Field Mode shell            | **done**     | E2E CB-F1–F5 PASS                        |
| 2   | TEST-009   | Field test playbook         | **done**     | KR-001 notice added                      |
| 3   | TEST-007   | Playwright E2E offline sync | **done**     | 6/6 PASS                                 |
| 4   | FE-009     | Collection My Finds polish  | **done**     | `/finds` ledger                          |
| 5   | DEPLOY-004 | Sentry release tracking     | **done**     | env-gated; DSN on preview pending        |
| 6   | FE-022     | Offline fallback polish     | **done**     | `/offline` queue UI                      |
| 7   | API-005    | GET /api/v1/me              | **done**     | ProfileV1 + tests                        |
| 8   | FE-023     | Profile page                | **done**     | `/profile`                               |
| 9   | META-002   | Beta cohort onboarding      | **blocked**  | preview URL ready; protection + env gaps |
| 10  | —          | Bug bash buffer (20%)       | reserved     | P1 from cohort                           |
| 11  | META-003   | Closed beta certification   | **not pass** | see META-003-preview-readiness-report.md |

---

## Critical Path

```
FE-010 ✅ → TEST-007 ✅ → META-002 ⏳ → META-003 (engineering ✅ / cohort ⏳)
```

---

## Preview deployment

See [`sprint-04-preview-deployment.md`](../sprint-04-preview-deployment.md) and [`META-003-preview-readiness-report.md`](../META-003-preview-readiness-report.md).

**Ready preview (2026-06-18):** https://rockhound-468m6ceye-hutchs-projects-ef99514e.vercel.app (`rockhound-web`)

**Remaining blockers:**

1. `rockhounding-web` Root Directory → `apps/web` (dashboard)
2. Deploy-gate hotfix commit (v1-contract export + TS fixes) before SHA = `c8ca2b9`
3. `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`
4. Vercel Deployment Protection (401 for cohort)
5. ≥5 playbook completions + sync evidence

**Branch pushed:** `origin/feat/sprint-4-field-mode` @ `c8ca2b9`

---

## Certification Gates

See [`sprint-04-certification-gates.md`](../sprint-04-certification-gates.md).

**META-003 full PASS requires:** 100% of `certification-closed-beta.md` sections 1, 2, 3, 6.

**Current:** Sections 1–2 PASS; section 3 PENDING; section 6 partial (CB-D2).

---

## Sprint Review Demo

1. Enter Field Mode in 1 tap → Quick Log FAB → offline log → reconnect → collection
2. Playwright CI green on offline sync (6/6)
3. _(Pending)_ 5-tester feedback summary + sync ≥95%

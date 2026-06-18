# Closed Beta Certification (META-003)

**Gate:** G2  
**Sprint:** 4  
**Prerequisite:** Sprint 3 META-001A PASS  
**Branch:** `feat/sprint-4-field-mode`  
**Release commit:** `c8ca2b9`

```
Certified by: Principal Release Engineer / Closed Beta Coordinator / QA Lead
Date: 2026-06-18
Git SHA: c8ca2b9aa3e1fa8209f3388064e225d33167e46d
Beta cohort size: 0 / 5 completions (5 identified, invites ready)
Preview URL: PARTIAL — https://rockhound-468m6ceye-hutchs-projects-ef99514e.vercel.app (Deployment Protection)
```

---

## Verdict

### **NOT PASS — PREVIEW DEPLOY BLOCKED / COHORT PENDING**

Engineering gates pass locally at `c8ca2b9`. **Full META-003 Closed Beta PASS is not claimed** because preview deployment failed, live smoke tests were not run on a Sprint 4 preview, and zero playbook completions are recorded.

---

## 1. Field Mode

| ID    | Criterion                                    | Pass                                   |
| ----- | -------------------------------------------- | -------------------------------------- |
| CB-F1 | Field Mode enters in 1 tap from Home         | [x] E2E (1 flaky retry in CI parallel) |
| CB-F2 | GPS accuracy indicator visible               | [x] E2E                                |
| CB-F3 | Quick Log FAB reachable one-handed (390×844) | [x] E2E                                |
| CB-F4 | Nearest site card shows when GPS granted     | [x] E2E                                |
| CB-F5 | Touch targets ≥44px on primary actions       | [x] E2E                                |

**Section 1:** **PASS (engineering)**

---

## 2. End-to-End Flows

| ID    | Criterion                                          | Pass                             |
| ----- | -------------------------------------------------- | -------------------------------- |
| CB-E1 | TEST-007 Playwright E2E pass                       | [x] 6/6 (5 pass + 1 flaky CB-F1) |
| CB-E2 | Journey: login → map → site → log → offline → sync | [ ] preview smoke pending        |
| CB-E3 | Journey: prohibited site blocks collection CTA     | [x] E2E online                   |
| CB-E4 | External navigate opens maps with fuzzy coords     | [x] unit + API fuzzy_location    |

**Section 2:** **PARTIAL** — automated E2E PASS; live preview journey pending

---

## 3. Beta Cohort

| ID    | Criterion                              | Pass                       |
| ----- | -------------------------------------- | -------------------------- |
| CB-B1 | ≥5 users onboarded                     | [ ] preview blocked        |
| CB-B2 | ≥5 users completed FIELD_TEST_PLAYBOOK | [ ]                        |
| CB-B3 | Feedback template filled               | [ ]                        |
| CB-B4 | No unresolved P0 bugs                  | [x]                        |
| CB-B5 | Sync success ≥95% within 24h           | [ ] needs cohort telemetry |

**Section 3:** **PENDING**

---

## 4. Observability (DEPLOY-004)

| ID    | Criterion                                | Pass                                            |
| ----- | ---------------------------------------- | ----------------------------------------------- |
| CB-O1 | Sentry captures client errors            | [ ] `NEXT_PUBLIC_SENTRY_DSN` not set on preview |
| CB-O2 | Errors tagged with release version       | [x] code + `SENTRY_RELEASE=c8ca2b9` env intent  |
| CB-O3 | /offline fallback renders when SW active | [x] engineering                                 |

**Section 4:** **PARTIAL** — release tagging ready; live DSN pending

---

## 5. Profile & Account

| ID    | Criterion                                    | Pass                     |
| ----- | -------------------------------------------- | ------------------------ |
| CB-P1 | GET /api/v1/me returns ProfileV1             | [x] API-005 + tests      |
| CB-P2 | Profile page shows display name / reputation | [x] `/profile`           |
| CB-P3 | Logout clears session                        | [ ] cohort manual verify |

**Section 5:** **PASS (engineering)**

---

## 6. Documentation

| ID    | Criterion                             | Pass               |
| ----- | ------------------------------------- | ------------------ |
| CB-D1 | docs/qa/FIELD_TEST_PLAYBOOK.md exists | [x] + KR-001       |
| CB-D2 | Preview URL shared with beta cohort   | [ ] deploy blocked |

**Section 6:** **PARTIAL**

---

## Gate summary

| Gate               | Result                  |
| ------------------ | ----------------------- |
| G2-A TEST-007      | **PASS**                |
| G2-B FE-010        | **PASS**                |
| G2-C META-002      | **BETA COHORT PENDING** |
| G2-D META-003 full | **NOT PASS**            |

---

## Full META-003 PASS requires

1. Successful preview deploy from `c8ca2b9` + URL shared
2. Preview smoke (§ routes below) on live URL
3. `NEXT_PUBLIC_MAPBOX_TOKEN` + `NEXT_PUBLIC_SENTRY_DSN` on preview
4. ≥5 playbook completions + sync ≥95% evidence (`beta-cohort-roster.md`)

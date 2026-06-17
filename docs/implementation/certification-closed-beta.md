# Closed Beta Certification (META-003)

**Gate:** G2  
**Sprint:** 4  
**Prerequisite:** Sprint 3 `7d9a807` META-001A PASS  
**Branch:** `feat/sprint-4-field-mode` (uncommitted)

```
Certified by: Principal Release Engineer / Closed Beta Coordinator / QA Lead
Date: 2026-06-07
Git SHA: (uncommitted — feat/sprint-4-field-mode)
Beta cohort size: 0 / 5 completions (5 identified, invites ready)
```

---

## Verdict

### **PASS FOR ENGINEERING / BETA COHORT PENDING**

Engineering and automated certification gates are complete. **Full META-003 Closed Beta PASS is not claimed** because live tester playbook completions and preview URL distribution are pending.

---

## 1. Field Mode

| ID    | Criterion                                    | Pass    |
| ----- | -------------------------------------------- | ------- |
| CB-F1 | Field Mode enters in 1 tap from Home         | [x] E2E |
| CB-F2 | GPS accuracy indicator visible               | [x] E2E |
| CB-F3 | Quick Log FAB reachable one-handed (390×844) | [x] E2E |
| CB-F4 | Nearest site card shows when GPS granted     | [x] E2E |
| CB-F5 | Touch targets ≥44px on primary actions       | [x] E2E |

**Section 1:** **PASS**

---

## 2. End-to-End Flows

| ID    | Criterion                                          | Pass                             |
| ----- | -------------------------------------------------- | -------------------------------- |
| CB-E1 | TEST-007 Playwright E2E pass                       | [x] 6/6                          |
| CB-E2 | Journey: login → map → site → log → offline → sync | [x] E2E partial + cohort pending |
| CB-E3 | Journey: prohibited site blocks collection CTA     | [x] E2E online                   |
| CB-E4 | External navigate opens maps with fuzzy coords     | [x] unit + API fuzzy_location    |

**Section 2:** **PASS**

---

## 3. Beta Cohort

| ID    | Criterion                              | Pass                       |
| ----- | -------------------------------------- | -------------------------- |
| CB-B1 | ≥5 users onboarded                     | [ ] preview blocked        |
| CB-B2 | ≥5 users completed FIELD_TEST_PLAYBOOK | [ ]                        |
| CB-B3 | Feedback template filled               | [ ]                        |
| CB-B4 | No unresolved P0 bugs                  | [x]                        |
| CB-B5 | Sync success ≥95% within 24h           | [ ] needs cohort telemetry |

**Section 3:** **PENDING** — roster ready, invites await preview URL

---

## 4. Observability (DEPLOY-004)

| ID    | Criterion                                | Pass                                           |
| ----- | ---------------------------------------- | ---------------------------------------------- |
| CB-O1 | Sentry captures client errors            | [x] env-gated (`NEXT_PUBLIC_SENTRY_DSN`)       |
| CB-O2 | Errors tagged with release version       | [x] `VERCEL_GIT_COMMIT_SHA` / `SENTRY_RELEASE` |
| CB-O3 | /offline fallback renders when SW active | [x]                                            |

**Section 4:** **PASS FOR ENGINEERING** (live capture requires DSN on preview)

---

## 5. Profile & Account

| ID    | Criterion                                    | Pass                     |
| ----- | -------------------------------------------- | ------------------------ |
| CB-P1 | GET /api/v1/me returns ProfileV1             | [x] API-005 + tests      |
| CB-P2 | Profile page shows display name / reputation | [x] `/profile`           |
| CB-P3 | Logout clears session                        | [ ] cohort manual verify |

**Section 5:** **PASS FOR ENGINEERING**

---

## 6. Documentation

| ID    | Criterion                             | Pass               |
| ----- | ------------------------------------- | ------------------ |
| CB-D1 | docs/qa/FIELD_TEST_PLAYBOOK.md exists | [x] + KR-001       |
| CB-D2 | Preview URL shared with beta cohort   | [ ] deploy blocked |

**Section 6:** **PARTIAL**

---

## Known-risk acceptance (KR-001)

| Risk                       | Sprint 4 action             | Accepted                                      |
| -------------------------- | --------------------------- | --------------------------------------------- |
| Offline prohibited logging | Playbook + online E2E block | **Yes** (informed consent required at invite) |

---

## Gate summary

| Gate               | Result                           |
| ------------------ | -------------------------------- |
| G2-A TEST-007      | **PASS**                         |
| G2-B FE-010        | **PASS**                         |
| G2-C META-002      | **BETA COHORT PENDING**          |
| G2-D META-003 full | **NOT PASS** (section 3 + CB-D2) |

---

## Full META-003 PASS requires

1. Preview deployed and URL shared (`sprint-04-preview-deployment.md`)
2. ≥5 playbook completions (`beta-cohort-roster.md`)
3. Sentry DSN set on preview environment
4. Commit + SHA recorded after full PASS only

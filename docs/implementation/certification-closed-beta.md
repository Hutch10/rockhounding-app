# Closed Beta Certification (META-003)

**Gate:** G2  
**Sprint:** 4  
**Prerequisite:** Sprint 3 META-001A PASS  
**Branch:** `feat/sprint-4-field-mode`  
**Release commit:** `c8ca2b9`  
**Deploy hotfix:** `15214da`

```
Certified by: Closed Beta Certification Lead
Date: 2026-06-18
Release slice: c8ca2b9aa3e1fa8209f3388064e225d33167e46d
Deploy hotfix: 15214daf9036112acfa2aaa9b859be99c3d91ff3
Beta cohort completions: 0 / 5
Preview URL: https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app
Final report: META-003-final-certification-report.md
```

---

## Verdict

### **FAIL**

META-003 Closed Beta certification **failed** on 2026-06-18. Preview operations and five-person cohort execution were not completed. Engineering gates at `15214da` pass but do not satisfy META-003.

See [`META-003-final-certification-report.md`](META-003-final-certification-report.md) for evidence.

---

## 1. Field Mode

| ID    | Criterion                                    | Pass                  |
| ----- | -------------------------------------------- | --------------------- |
| CB-F1 | Field Mode enters in 1 tap from Home         | [x] E2E (engineering) |
| CB-F2 | GPS accuracy indicator visible               | [x] E2E               |
| CB-F3 | Quick Log FAB reachable one-handed (390×844) | [x] E2E               |
| CB-F4 | Nearest site card shows when GPS granted     | [x] E2E               |
| CB-F5 | Touch targets ≥44px on primary actions       | [x] E2E               |

**Section 1:** **PASS (engineering only)** — not cohort-validated on preview

---

## 2. End-to-End Flows

| ID    | Criterion                                          | Pass                           |
| ----- | -------------------------------------------------- | ------------------------------ |
| CB-E1 | TEST-007 Playwright E2E pass                       | [x] 6/6                        |
| CB-E2 | Journey: login → map → site → log → offline → sync | [ ] **FAIL** — preview blocked |
| CB-E3 | Journey: prohibited site blocks collection CTA     | [x] E2E online (engineering)   |
| CB-E4 | External navigate opens maps with fuzzy coords     | [x] unit + API                 |

**Section 2:** **FAIL** — live preview journey not executed

---

## 3. Beta Cohort

| ID    | Criterion                              | Pass        |
| ----- | -------------------------------------- | ----------- |
| CB-B1 | ≥5 users onboarded                     | [ ] **0/5** |
| CB-B2 | ≥5 users completed FIELD_TEST_PLAYBOOK | [ ] **0/5** |
| CB-B3 | Feedback template filled               | [ ] **0/5** |
| CB-B4 | No unresolved P0 bugs                  | [x]         |
| CB-B5 | Sync success ≥95% within 24h           | [ ] no data |

**Section 3:** **FAIL**

---

## 4. Observability (DEPLOY-004)

| ID    | Criterion                          | Pass                       |
| ----- | ---------------------------------- | -------------------------- |
| CB-O1 | Sentry captures client errors      | [ ] DSN missing on preview |
| CB-O2 | Errors tagged with release version | [ ] not verified live      |
| CB-O3 | /offline fallback renders          | [x] engineering            |

**Section 4:** **FAIL**

---

## 5. Profile & Account

| ID    | Criterion                                    | Pass                |
| ----- | -------------------------------------------- | ------------------- |
| CB-P1 | GET /api/v1/me returns ProfileV1             | [x] API-005 + tests |
| CB-P2 | Profile page shows display name / reputation | [x] engineering     |
| CB-P3 | Logout clears session                        | [ ] cohort not run  |

**Section 5:** **PARTIAL**

---

## 6. Documentation

| ID    | Criterion                             | Pass                          |
| ----- | ------------------------------------- | ----------------------------- |
| CB-D1 | docs/qa/FIELD_TEST_PLAYBOOK.md exists | [x] + KR-001                  |
| CB-D2 | Preview URL shared with beta cohort   | [ ] **FAIL** — not accessible |

**Section 6:** **FAIL**

---

## Gate summary

| Gate          | Result   |
| ------------- | -------- |
| G2-A TEST-007 | **PASS** |
| G2-B FE-010   | **PASS** |
| G2-C META-002 | **FAIL** |
| G2-D META-003 | **FAIL** |

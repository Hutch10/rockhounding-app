# Closed Beta Readiness Checklist

**Program:** Rockhound M3 Closed Beta  
**Cohort size:** 5 internal field testers  
**Prerequisite:** Sprint 3 certification PASS

---

## 1. Build & Deploy

| Item                                        | Owner   | Status        |
| ------------------------------------------- | ------- | ------------- |
| Sprint 3 certification commit on `main`     | Release | [x] `7d9a807` |
| Preview URL deployed from cert SHA          | Release | [ ]           |
| `pnpm --filter web build` green on cert SHA | QA      | [ ]           |
| Service worker `/offline` fallback verified | QA      | [ ]           |
| Supabase linked project migrations current  | Release | [ ]           |
| Magic-link auth works on preview domain     | QA      | [ ]           |

---

## 2. Field Operations

| Item                                               | Owner         | Status |
| -------------------------------------------------- | ------------- | ------ |
| AZ or OR seed state selected for cohort            | Beta PM       | [ ]    |
| ≥1 prohibited seed site identified for gating test | QA            | [ ]    |
| Quick Log offline path smoke-tested on 1 device    | Field Systems | [ ]    |
| Reconnect flush verified on 1 device               | Field Systems | [ ]    |
| `docs/qa/FIELD_TEST_PLAYBOOK.md` reviewed          | QA            | [ ]    |

---

## 3. Observability & Support

| Item                                         | Owner   | Status |
| -------------------------------------------- | ------- | ------ |
| Sentry release tracking (DEPLOY-004)         | Release | [ ]    |
| Error tags include `release` + `environment` | Release | [ ]    |
| Feedback form / template link prepared       | Beta PM | [ ]    |
| `#rockhound-beta` or email list active       | Beta PM | [ ]    |
| P0 escalation path documented                | Beta PM | [ ]    |

---

## 4. Legal & Safety Comms

| Item                                          | Owner   | Status |
| --------------------------------------------- | ------- | ------ |
| Known-risk KR-001 communicated to testers     | Beta PM | [ ]    |
| Testers acknowledge offline prohibited gap    | Beta PM | [ ]    |
| Beta is internal / non-public disclaimer sent | Beta PM | [ ]    |

---

## 5. Sprint 4 Engineering

| Item                                      | Owner       | Status |
| ----------------------------------------- | ----------- | ------ |
| FE-010 Field Mode shell in progress       | Engineering | [ ]    |
| TEST-007 Playwright offline E2E scaffold  | QA          | [ ]    |
| FE-009 collection list shows synced finds | Engineering | [ ]    |
| Issue collection workflow live            | Beta PM     | [ ]    |

---

## Go / No-Go

**Go** when sections 1–3 are complete and Sprint 4 CP-4.1 is met.  
**No-Go** if any P0 open or preview auth broken.

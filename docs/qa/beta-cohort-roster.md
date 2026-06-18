# Beta Cohort Roster — META-002 / META-003 (Sprint 4)

**Certification date:** 2026-06-18  
**META-003 verdict:** **FAIL** (see [`META-003-final-certification-report.md`](../implementation/META-003-final-certification-report.md))  
**Branch:** `feat/sprint-4-field-mode` @ `15214da`  
**Preview:** https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app (**not accessible to testers — Deployment Protection**)

---

## Cohort roster

| ID  | Profile               | Geography | Device         | Invite | Playbook | KR-001 ack | Feedback |
| --- | --------------------- | --------- | -------------- | ------ | -------- | ---------- | -------- |
| T1  | Power user / engineer | AZ seed   | iOS Safari     | **No** | **No**   | **No**     | —        |
| T2  | Weekend rockhound     | AZ seed   | Android Chrome | **No** | **No**   | **No**     | —        |
| T3  | Oregon collector      | OR seed   | iOS Safari     | **No** | **No**   | **No**     | —        |
| T4  | Poor-coverage user    | AZ rural  | Android Chrome | **No** | **No**   | **No**     | —        |
| T5  | Skeptic / QA mindset  | Either    | Desktop+mobile | **No** | **No**   | **No**     | —        |

**Completions:** **0 / 5**

**Playbook:** [`FIELD_TEST_PLAYBOOK.md`](FIELD_TEST_PLAYBOOK.md)

---

## Blockers (2026-06-18 audit)

| Blocker                                                            | Status       |
| ------------------------------------------------------------------ | ------------ |
| `rockhound-web` Preview env empty (Supabase not on deploy project) | Open         |
| `NEXT_PUBLIC_MAPBOX_TOKEN` missing                                 | Open         |
| `NEXT_PUBLIC_SENTRY_DSN` missing                                   | Open         |
| Supabase auth redirect URLs for preview                            | Not verified |
| Deployment Protection (401 / Vercel SSO wall)                      | Open         |
| Invites not sent                                                   | Open         |

---

## Operational evidence log

| Metric                            | Target        | Actual  | Notes                |
| --------------------------------- | ------------- | ------- | -------------------- |
| Sync success rate (24h)           | ≥95%          | **N/A** | No cohort operations |
| Offline queue flush               | Playbook pass | **N/A** |                      |
| Quick Log completions             | ≥5            | **0**   |                      |
| Sentry events (release `15214da`) | Live capture  | **0**   | DSN not set          |
| P0 bugs from cohort               | 0             | **0**   | Cohort not run       |

---

## META-002 / META-003 status

| Criterion               | Status         |
| ----------------------- | -------------- |
| 5 testers identified    | PASS (T1–T5)   |
| Playbook ready          | PASS           |
| ≥5 onboarded            | **FAIL (0/5)** |
| ≥5 playbook completions | **FAIL (0/5)** |
| META-003 certification  | **FAIL**       |

---

## Re-run checklist (before next certification attempt)

1. Complete preview env on `rockhound-web` + redeploy
2. Add Mapbox + Sentry DSN
3. Supabase redirect URLs + Site URL
4. Deployment Protection exception for testers
5. Send Day 0 invite with playbook + KR-001 consent
6. Record completions and `client_operation_id` for sync issues in this file

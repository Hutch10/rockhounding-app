# Beta Cohort Roster — META-002 (Sprint 4)

**Status:** **INVITES BLOCKED** — preview deploy failed; playbook ready  
**Branch:** `feat/sprint-4-field-mode` @ `c8ca2b9`  
**Playbook:** [`FIELD_TEST_PLAYBOOK.md`](FIELD_TEST_PLAYBOOK.md) (includes KR-001 notice)

---

## Cohort roster

| ID  | Profile               | Geography | Device         | Invite | Playbook | KR-001 ack |
| --- | --------------------- | --------- | -------------- | ------ | -------- | ---------- |
| T1  | Power user / engineer | AZ seed   | iOS Safari     | ready  | pending  | pending    |
| T2  | Weekend rockhound     | AZ seed   | Android Chrome | ready  | pending  | pending    |
| T3  | Oregon collector      | OR seed   | iOS Safari     | ready  | pending  | pending    |
| T4  | Poor-coverage user    | AZ rural  | Android Chrome | ready  | pending  | pending    |
| T5  | Skeptic / QA mindset  | Either    | Desktop+mobile | ready  | pending  | pending    |

**Invite status:** Blocked on Deployment Protection bypass + Mapbox/Sentry DSN + deploy-gate commit (see [`META-003-preview-readiness-report.md`](../implementation/META-003-preview-readiness-report.md)).

---

## Day 0 onboarding packet (per tester)

- [x] Playbook link: `docs/qa/FIELD_TEST_PLAYBOOK.md`
- [x] KR-001 known-risk notice embedded in playbook
- [ ] Preview URL (blocked — Vercel root directory + build gates)
- [ ] Magic-link login instructions with live URL
- [ ] KR-001 informed-consent checkbox in feedback form

---

## Distribution checklist

| Item                                   | Owner   | Status                                                             |
| -------------------------------------- | ------- | ------------------------------------------------------------------ |
| Preview deploy from `c8ca2b9`          | Release | **PARTIAL** — Ready on `rockhound-web`; hotfix uncommitted         |
| Supabase + Sentry + Mapbox preview env | Release | **PARTIAL** — Supabase on `rockhounding-web`; Mapbox + DSN missing |
| Email/Slack kickoff with URL           | Beta PM | Pending preview                                                    |
| Playbook PDF or doc link               | QA      | **READY**                                                          |
| KR-001 notice                          | QA      | **READY** (playbook § Known risk)                                  |
| Roster tracking                        | Beta PM | This file                                                          |

---

## META-002 gate

| Criterion               | Status                           |
| ----------------------- | -------------------------------- |
| 5 testers identified    | **PASS** (T1–T5)                 |
| Playbook distributed    | **READY** (awaiting preview URL) |
| ≥5 onboarded            | **PENDING**                      |
| ≥5 playbook completions | **PENDING**                      |

**META-002:** **BETA COHORT PENDING**

---

## Planned preview smoke routes (Release Engineer)

Run on live preview URL once deploy succeeds:

| Route                                            | Seed / expectation              |
| ------------------------------------------------ | ------------------------------- |
| `/login`                                         | Auth shell loads                |
| `/`                                              | Home + Field Mode entry         |
| `/map`                                           | Mapbox token required           |
| `/field`                                         | Field Mode shell                |
| `/offline`                                       | Offline fallback                |
| `/finds`                                         | Read-only ledger                |
| `/profile`                                       | ProfileV1 surface               |
| `/location/22222222-2222-2222-2222-222222222205` | AZ Prohibited — Grand Canyon NP |
| `/location/22222222-2222-2222-2222-222222222201` | AZ Official — Quartzsite        |

---

## Issue collection

Feedback route: form fields per [`beta-cohort-plan-5-testers.md`](beta-cohort-plan-5-testers.md) — device, OS, browser, online/offline, `client_operation_id` for sync issues.

**P0 queue:** empty at engineering handoff.

# Beta Cohort Roster — META-002 (Sprint 4)

**Status:** **READY FOR INVITE** — engineering gates pass; live completions pending  
**Branch:** `feat/sprint-4-field-mode`  
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

**Invite status:** Packet prepared; preview URL blocked on Vercel link (see [`sprint-04-preview-deployment.md`](../implementation/sprint-04-preview-deployment.md)).

---

## Day 0 onboarding packet (per tester)

- [x] Playbook link: `docs/qa/FIELD_TEST_PLAYBOOK.md`
- [x] KR-001 known-risk notice embedded in playbook
- [ ] Preview URL (blocked — deploy pending)
- [ ] Magic-link login instructions with live URL
- [ ] KR-001 informed-consent checkbox in feedback form

---

## Distribution checklist

| Item                                           | Owner   | Status                                                        |
| ---------------------------------------------- | ------- | ------------------------------------------------------------- |
| Preview deploy from `feat/sprint-4-field-mode` | Release | **BLOCKED** — manual `vercel link --project rockhounding-web` |
| Email/Slack kickoff with URL                   | Beta PM | Pending preview                                               |
| Playbook PDF or doc link                       | QA      | **READY**                                                     |
| KR-001 notice                                  | QA      | **READY** (playbook § Known risk)                             |
| Roster tracking                                | Beta PM | This file                                                     |

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

## Issue collection

Feedback route: form fields per [`beta-cohort-plan-5-testers.md`](beta-cohort-plan-5-testers.md) — device, OS, browser, online/offline, `client_operation_id` for sync issues.

**P0 queue:** empty at engineering handoff.

# Beta Cohort Roster — META-002 / META-003 (Sprint 4)

**Certification date:** 2026-06-21 (operations re-pass #5)  
**Public gate:** **FAIL** (`/login` anonymous = 401)  
**Cohort invites:** **HOLD**  
**META-003:** **FAIL**  
**Branch:** `feat/sprint-4-field-mode` @ `15214da`  
**Active Preview:** https://rockhound-5e2uztwr8-hutchs-projects-ef99514e.vercel.app  
**Deployment:** `dpl_BLJ4DbxBwMNyZ8cRXD5NeMGK5dL9`

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

---

## Re-pass #5 (2026-06-21)

| Action | Status | Notes |
| ------ | ------ | ----- |
| Project = `rockhound-web` | **PASS** | `prj_NUekhJuY90sK8wwSZTgPnHFc4o5a` |
| Deployment Protection | **FAIL** | SSO wall; `_vercel_sso_nonce` cookie |
| Mapbox token | **FAIL** | Missing; no local value found |
| Sentry DSN | **FAIL** | Missing; no local value found |
| SITE_URL updated | **PASS** | Now `5e2uztwr8` host |
| Redeploy | **NOT RUN** | Config incomplete |
| Gate 1 `/login` | **FAIL** | HTTP 401 |
| Public smoke | **NOT RUN** | Blocked |
| Invite T1–T5 | **HOLD** | Not authorized |

---

## Invitation log

| Date | Tester | Status |
| ---- | ------ | ------ |
| — | T1–T5 | **Not sent** |

---

## Operational evidence

| Metric | Actual |
| ------ | ------ |
| KR-001 acks | **0** |
| Playbook completions | **0** |
| Sentry events | **0** |
| Sync/offline field data | **N/A** |

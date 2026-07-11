# META-003 Final Certification Report — Closed Beta

**Gate:** G2 — Closed Beta Certification  
**Certification Lead:** Rockhound Release Operations Lead  
**Certification date:** 2026-06-21 (operations re-pass #5)  
**Branch:** `feat/sprint-4-field-mode`  
**Engineering baseline:** `15214da` (unchanged)  
**Project:** `rockhound-web` (`prj_NUekhJuY90sK8wwSZTgPnHFc4o5a`)  
**Active Preview:** https://rockhound-5e2uztwr8-hutchs-projects-ef99514e.vercel.app  
**Deployment:** `dpl_BLJ4DbxBwMNyZ8cRXD5NeMGK5dL9`

---

## Final verdict: **FAIL**

META-003 Closed Beta **PASS is not granted.** Gate 1 fails: anonymous `/login` returns **HTTP 401** (Vercel Deployment Protection). Mapbox and Sentry DSN remain absent from Preview env. No cohort or field telemetry evidence exists.

---

## Operational gate evidence (re-pass #5)

| Gate | Result | Classification |
| ---- | ------ | -------------- |
| Linked project `rockhound-web` | **PASS** | — |
| Deployment Protection allows anonymous users | **FAIL** | Infrastructure |
| Anonymous `GET /login` → 200 | **FAIL** | Infrastructure |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **FAIL** | Configuration |
| `NEXT_PUBLIC_SENTRY_DSN` | **FAIL** | Configuration |
| `NEXT_PUBLIC_SITE_URL` matches active host | **PASS** | Configuration (updated this pass) |
| Supabase Preview vars | **PASS** | Configuration |
| Public smoke | **NOT RUN** | Blocked at Gate 1 |

---

## Actions taken this pass

- Confirmed `apps/web` linked to `rockhound-web`
- Updated `NEXT_PUBLIC_SITE_URL` to active preview host via `vercel env add`
- Did **not** redeploy (configuration still incomplete)
- Did **not** modify application code

---

## Sync invariant

Unchanged: `StorageManager → SyncManager → POST /api/v1/sync/batch`

---

## Sign-off

| Role | Verdict | Date |
| ---- | ------- | ---- |
| Release Operations Lead (re-pass #5) | **FAIL** | 2026-06-21 |
| META-003 PASS | **Withheld** | — |
| Cohort T1–T5 | **HOLD** | — |

**Recommendation:** **NO-GO** until Deployment Protection is resolved, Mapbox + Sentry DSN are added, Preview is redeployed, and Gate 1 returns **200**.

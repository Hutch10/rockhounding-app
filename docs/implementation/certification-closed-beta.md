# Closed Beta Certification (META-003)

**Gate:** G2  
**Branch:** `feat/sprint-4-field-mode`  
**Engineering baseline:** `15214da`

```
Certified by: Rockhound Release Operations Lead
Date: 2026-06-21 (re-pass #5)
Project: rockhound-web (prj_NUekhJuY90sK8wwSZTgPnHFc4o5a)
Active Preview: https://rockhound-5e2uztwr8-hutchs-projects-ef99514e.vercel.app
Gate 1 (/login anonymous): FAIL (401)
Deployment Protection: FAIL
Mapbox token: FAIL (missing; not available locally)
Sentry DSN: FAIL (missing; not available locally)
SITE_URL: PASS (updated to active host)
Cohort invites: HOLD
```

---

## Verdict: **FAIL**

---

## Gate summary (re-pass #5)

| Gate | Result |
| ---- | ------ |
| Project link `rockhound-web` | **PASS** |
| Deployment Protection | **FAIL** |
| Anonymous `/login` → 200 | **FAIL** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **FAIL** |
| `NEXT_PUBLIC_SENTRY_DSN` | **FAIL** |
| `NEXT_PUBLIC_SITE_URL` | **PASS** |
| Supabase vars | **PASS** |
| Public smoke | **NOT RUN** |

---

## Authorization

**NO-GO** | **T1–T5 HOLD** | **META-003 FAIL** | **Feature freeze ACTIVE**

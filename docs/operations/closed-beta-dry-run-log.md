# Closed Beta Dry-Run Log

**Policy:** Feature freeze at `15214da`; config/deploy/ops only until META-003 PASS  
**Operator:** Rockhound Release Operations Lead  
**Project:** `rockhound-web` (`prj_NUekhJuY90sK8wwSZTgPnHFc4o5a`, Root Directory `apps/web`)  
**Branch:** `feat/sprint-4-field-mode`  
**Active Preview:** https://rockhound-5e2uztwr8-hutchs-projects-ef99514e.vercel.app  
**Deployment:** `dpl_BLJ4DbxBwMNyZ8cRXD5NeMGK5dL9` (Ready)  
**Last updated:** 2026-06-21 (operations re-pass #5)

---

## Re-pass #5 summary (2026-06-21)

**No application code changes.**

| Task | Result | Evidence |
| ---- | ------ | -------- |
| 1. Linked project = `rockhound-web` | **PASS** | `prj_NUekhJuY90sK8wwSZTgPnHFc4o5a` |
| 2. Deployment Protection inspection | **FAIL** | Anonymous `/login` → **401**; `Set-Cookie: _vercel_sso_nonce` (Vercel SSO wall). CLI has no `vercel protection` subcommand — dashboard action required |
| 3. Preview env vars (`feat/sprint-4-field-mode`) | **PARTIAL** | Supabase vars **SET**; `NEXT_PUBLIC_SITE_URL` **updated**; Mapbox + Sentry DSN **MISSING** |
| 4. Mapbox/Sentry locally available | **FAIL** | No values in `.env.rockhound.preview`, `.env.rockhounding.preview`, `.env.rh.preview`, or `.env.vercel.rockhounding.preview` |
| 5. `NEXT_PUBLIC_SITE_URL` → active host | **PASS** | Updated via CLI to `https://rockhound-5e2uztwr8-hutchs-projects-ef99514e.vercel.app` |
| 6. Redeploy after config complete | **NOT RUN** | Config incomplete (Protection + Mapbox + SSN still open) |
| 7. Gate 1 anonymous `GET /login` | **FAIL** | **HTTP 401** |
| 8–9. Public smoke | **NOT RUN** | Stopped per policy |

### Public smoke verdict: **FAIL**

### Cohort recommendation: **HOLD**

---

## Gate status

| Gate | Result |
| ---- | ------ |
| Anonymous `/login` = 200 | **FAIL** |
| Deployment Protection allows testers | **FAIL** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **FAIL** |
| `NEXT_PUBLIC_SENTRY_DSN` | **FAIL** |
| `NEXT_PUBLIC_SITE_URL` matches active host | **PASS** |
| Supabase Preview vars | **PASS** |
| Public smoke | **NOT RUN** |

---

## Remaining blockers

| # | Blocker | Class |
|---|---------|-------|
| 1 | Vercel Deployment Protection (SSO) | Infrastructure |
| 2 | `NEXT_PUBLIC_MAPBOX_TOKEN` missing | Configuration |
| 3 | `NEXT_PUBLIC_SENTRY_DSN` missing | Configuration |

---

## Operator dashboard actions required

1. **Deployment Protection:** Vercel → `rockhound-web` → Settings → Deployment Protection → disable for Preview **or** add hostname exception **or** configure Protection Bypass for Automation.
2. **Mapbox:** Vercel → `rockhound-web` → Settings → Environment Variables → Add → Preview → branch `feat/sprint-4-field-mode` → `NEXT_PUBLIC_MAPBOX_TOKEN`
3. **Sentry:** Same path → `NEXT_PUBLIC_SENTRY_DSN`
4. **Redeploy** Preview after all three are set; re-run Gate 1 (`/login` must return **200**).

---

## Go / No-Go

**NO-GO** | **T1–T5 HOLD** | **META-003 FAIL**

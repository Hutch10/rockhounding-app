# Sprint 4 Preview Deployment

**Branch:** `feat/sprint-4-field-mode`  
**Release commit (tag intent):** `c8ca2b9`  
**Date:** 2026-06-18  
**Status:** **PARTIAL — Ready preview on `rockhound-web`; `rockhounding-web` blocked**

Full report: [`META-003-preview-readiness-report.md`](META-003-preview-readiness-report.md)

---

## Ready preview (2026-06-18)

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| Project    | `rockhound-web` (Root Directory: `apps/web`)                             |
| Deployment | `dpl_g5P6zdbeck2NiwSvET1suu9JGLAe`                                       |
| URL        | https://rockhound-468m6ceye-hutchs-projects-ef99514e.vercel.app          |
| Alias      | https://rockhound-web-sootyjosh-5651-hutchs-projects-ef99514e.vercel.app |
| Build      | **Ready** (monorepo `vercel.json` build command)                         |
| Git tree   | **Local WIP** includes deploy-gate fixes not in `c8ca2b9`                |

**Cohort blocker:** Vercel Deployment Protection returns **401** for unauthenticated HTTP. Home verified **200** via authenticated fetch only.

---

## `rockhounding-web` (requested project)

| Step                                            | Status                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| `vercel link --project rockhounding-web`        | **DONE**                                       |
| Root Directory → `apps/web`                     | **BLOCKED** — still `.` in dashboard           |
| Deploy from monorepo root                       | **ERROR** — No Next.js at repo root            |
| Branch preview env (`feat/sprint-4-field-mode`) | Supabase + `SENTRY_RELEASE=c8ca2b9` configured |

**Fix:** Vercel Dashboard → `rockhounding-web` → Settings → General → **Root Directory: `apps/web`**, then redeploy from Git.

---

## Environment variables

Configured on **`rockhounding-web`** (branch `feat/sprint-4-field-mode`):

| Variable                                                | Status                                   |
| ------------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                              | set                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                         | set                                      |
| `SUPABASE_SERVICE_ROLE_KEY`                             | set                                      |
| `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE`         | `c8ca2b9`                                |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `preview`                                |
| `NEXT_PUBLIC_SITE_URL`                                  | placeholder — update to live preview URL |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                              | **MISSING**                              |
| `NEXT_PUBLIC_SENTRY_DSN`                                | **MISSING**                              |

Mirror required vars onto **`rockhound-web`** preview if that project remains the deploy target.

---

## Deploy-gate hotfix (not in `c8ca2b9`)

Required for Vercel `tsc --build` + Next type-check:

1. `packages/shared/src/index.ts` — export `v1-contract` (SyncBatch + ProfileV1 + LocationV1)
2. `packages/shared/src/hutchstack/server/orchestrator.ts` — strict-null guards
3. `apps/web/lib/sync/coordinator.ts` — Navigator connection typing

Commit before claiming preview SHA = `c8ca2b9`.

---

## Smoke test checklist

Run after Deployment Protection resolved:

| Route                                            | Seed / expectation              |
| ------------------------------------------------ | ------------------------------- |
| `/login`                                         | Auth shell                      |
| `/`                                              | Home + Field Mode entry         |
| `/map`                                           | Mapbox (needs token)            |
| `/field`                                         | Field Mode shell                |
| `/offline`                                       | Offline fallback                |
| `/finds`                                         | Read-only ledger                |
| `/profile`                                       | ProfileV1                       |
| `/location/22222222-2222-2222-2222-222222222205` | AZ Prohibited — Grand Canyon NP |
| `/location/22222222-2222-2222-2222-222222222201` | AZ Official — Quartzsite        |

---

## CB-D2

Preview URL is **not yet shareable** with the beta cohort until protection bypass + env completion + deploy-gate commit land.

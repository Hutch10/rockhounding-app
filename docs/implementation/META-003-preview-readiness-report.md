# META-003 Preview Readiness Report

**Role:** Rockhound Release Guardian / Closed Beta Operations Lead  
**Date:** 2026-06-18  
**Release commit (tag intent):** `c8ca2b9`  
**Branch:** `feat/sprint-4-field-mode`  
**Verdict:** **PREVIEW PARTIAL — NOT FULL META-003 PASS**

---

## Executive summary

Engineering gates pass locally after **uncommitted deploy-gate fixes** (not in `c8ca2b9`). A **Ready** Vercel preview exists on **`rockhound-web`** (monorepo root + `apps/web` Root Directory). The requested **`rockhounding-web`** project still fails until Root Directory is set to `apps/web` in the Vercel dashboard.

**Full META-003 Closed Beta PASS is not claimed** — zero cohort playbook completions, no sync telemetry evidence, public smoke blocked by Deployment Protection, and Sentry live capture blocked by missing DSN.

---

## 1. Artifact hygiene

| Item                       | Action                     | Status                 |
| -------------------------- | -------------------------- | ---------------------- |
| `**/*.js.map`              | Added to root `.gitignore` | **DONE** (uncommitted) |
| `playwright-report/`       | Added to `.gitignore`      | **DONE** (uncommitted) |
| `test-results/`            | Added to `.gitignore`      | **DONE** (uncommitted) |
| `apps/web/public/*.js.map` | Ignored                    | **DONE**               |
| `apps/web/.gitignore`      | `.vercel` local link       | **DONE** (uncommitted) |

Generated PWA files (`sw.js`, `workbox-*.js`) remain modified locally from build — do not commit.

---

## 2. Commit `c8ca2b9` verification

| Gate                                       | At `c8ca2b9` (clean tree)                                                          | With deploy-gate fixes (local WIP) |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------- |
| `git log -1`                               | `c8ca2b9` — Sprint 4 release slice                                                 | same HEAD                          |
| `git status`                               | WIP: `.gitignore`, shared index/orchestrator, coordinator, docs                    |                                    |
| Unit tests (30)                            | **22/30 FAIL** — `SyncBatchRequestSchema` not exported from `@rockhounding/shared` | **30/30 PASS**                     |
| E2E (6)                                    | not re-run on clean tree                                                           | **6/6 PASS**                       |
| `pnpm --filter web type-check`             | **FAIL** — coordinator Navigator types; missing v1 exports                         | **PASS**                           |
| `pnpm --filter @rockhounding/shared build` | **FAIL** — orchestrator strict TS                                                  | **PASS**                           |
| `pnpm --filter web build`                  | **FAIL** (depends on shared)                                                       | **PASS**                           |

### Deploy-gate delta (required before Vercel build; not in `c8ca2b9`)

1. `packages/shared/src/index.ts` — `export * from './v1-contract'`
2. `packages/shared/src/hutchstack/server/orchestrator.ts` — strict-null guards
3. `apps/web/lib/sync/coordinator.ts` — Navigator connection typing

**Recommendation:** Cherry-pick or commit as `fix(deploy): v1-contract exports + Vercel build gates` before claiming preview = `c8ca2b9`.

---

## 3. Preview deployment

### `rockhounding-web` (requested)

| Step                                                           | Result                                       |
| -------------------------------------------------------------- | -------------------------------------------- |
| `vercel link --project rockhounding-web`                       | **DONE** (repo + `apps/web`)                 |
| Root Directory `apps/web`                                      | **NOT SET** — project still uses `.`         |
| CLI deploy from monorepo root                                  | **ERROR** — No Next.js detected              |
| Branch-scoped preview env (Supabase, `SENTRY_RELEASE=c8ca2b9`) | **CONFIGURED** on `feat/sprint-4-field-mode` |

### `rockhound-web` (fallback — correct monorepo layout)

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Deployment ID | `dpl_g5P6zdbeck2NiwSvET1suu9JGLAe`                                       |
| Status        | **Ready**                                                                |
| Preview URL   | https://rockhound-468m6ceye-hutchs-projects-ef99514e.vercel.app          |
| Alias         | https://rockhound-web-sootyjosh-5651-hutchs-projects-ef99514e.vercel.app |
| Build         | `pnpm --filter @rockhounding/shared build && pnpm --filter web build`    |
| Source        | CLI deploy with **local WIP** (includes deploy-gate fixes)               |

### Preview environment variables

| Variable                                        | `rockhounding-web` (branch) | `rockhound-web` (deploy used)    |
| ----------------------------------------------- | --------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_*`                        | set                         | verify / mirror                  |
| `SUPABASE_SERVICE_ROLE_KEY`                     | set                         | verify / mirror                  |
| `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` | `c8ca2b9`                   | verify / mirror                  |
| `NEXT_PUBLIC_SITE_URL`                          | placeholder                 | **update to preview URL**        |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                      | **MISSING**                 | **MISSING** — map tiles may fail |
| `NEXT_PUBLIC_SENTRY_DSN`                        | **MISSING**                 | **MISSING** — CB-O1 blocked      |

---

## 4. Smoke test (preview)

Base URL: https://rockhound-468m6ceye-hutchs-projects-ef99514e.vercel.app

| Route                                   | Public HTTP | Authenticated (Vercel MCP)   | Notes                        |
| --------------------------------------- | ----------- | ---------------------------- | ---------------------------- |
| `/login`                                | 401         | bypass conflict              | Deployment Protection        |
| `/`                                     | 401         | **200** — Home shell renders | Field Mode entry present     |
| `/map`                                  | 401         | bypass conflict              | Mapbox token likely required |
| `/field`                                | 401         | bypass conflict              |                              |
| `/offline`                              | 401         | bypass conflict              |                              |
| `/finds`                                | 401         | bypass conflict              |                              |
| `/profile`                              | 401         | bypass conflict              |                              |
| `/location/22222222-…2205` (prohibited) | 401         | not tested                   | Grand Canyon NP seed         |
| `/location/22222222-…2201` (official)   | 401         | not tested                   | Quartzsite seed              |

**Action:** Disable Deployment Protection for preview **or** share bypass link with cohort before CB-D2.

---

## 5. Sentry release tagging (CB-O2)

Code reads release from `NEXT_PUBLIC_SENTRY_RELEASE` → `VERCEL_GIT_COMMIT_SHA` (`apps/web/sentry.*.config.ts`).

| Check                                                            | Status                                   |
| ---------------------------------------------------------------- | ---------------------------------------- |
| Env intent `SENTRY_RELEASE=c8ca2b9` on `rockhounding-web` branch | **CONFIGURED**                           |
| `NEXT_PUBLIC_SENTRY_DSN` on preview                              | **MISSING** — Sentry disabled at runtime |
| Live event with release tag                                      | **NOT VERIFIED**                         |

---

## 6. META-003 gate status

| Section         | Engineering  | Full META-003                      |
| --------------- | ------------ | ---------------------------------- |
| 1 Field Mode    | PASS         | PASS                               |
| 2 E2E           | PASS (local) | PARTIAL (preview smoke incomplete) |
| 3 Beta cohort   | PENDING      | **FAIL** (0/5 completions)         |
| 4 Observability | PARTIAL      | PARTIAL (no DSN)                   |
| 5 Profile       | PASS         | PARTIAL                            |
| 6 Documentation | PARTIAL      | PARTIAL                            |

---

## 7. Required before cohort Day 0

1. **Commit deploy-gate hotfix** and redeploy from `c8ca2b9` (+ hotfix SHA)
2. **Fix `rockhounding-web` Root Directory** → `apps/web` **or** standardize on `rockhound-web`
3. Set **`NEXT_PUBLIC_MAPBOX_TOKEN`** and **`NEXT_PUBLIC_SENTRY_DSN`** on preview
4. Update **`NEXT_PUBLIC_SITE_URL`** + Supabase redirect URLs to live preview URL
5. **Remove or bypass Deployment Protection** for beta testers
6. Distribute playbook + preview URL; track in `beta-cohort-roster.md`
7. Collect **≥5 playbook completions** + **sync ≥95%** evidence

---

## 8. Explicit non-goals (honored)

- SYNC-001 — **not started**
- M4 — **not started**
- New features — **none added**

---

## Sign-off

| Role             | Verdict                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| Release Guardian | **PREVIEW PARTIAL** — Ready URL on `rockhound-web`; `rockhounding-web` blocked |
| Closed Beta Ops  | **COHORT NOT INVITED** — protection + env gaps                                 |
| META-003         | **NOT PASS** — awaiting cohort + sync evidence                                 |

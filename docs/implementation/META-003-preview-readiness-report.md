# META-003 Preview Readiness Report

**Role:** Rockhound Release Guardian / Closed Beta Operations Lead  
**Date:** 2026-06-18 (updated post hotfix)  
**Release slice:** `c8ca2b9` — Sprint 4 Field Mode closed beta  
**Deploy-gate hotfix:** `15214da` — `fix(release): make Sprint 4 preview deployment reproducible`  
**Branch:** `feat/sprint-4-field-mode`  
**Verdict:** **PREVIEW READY (ENGINEERING) — NOT FULL META-003 PASS**

---

## Executive summary

The deploy-gate hotfix at **`15214da`** restores reproducible local and Vercel builds from a clean committed SHA. A **Ready** preview is live on **`rockhound-web`**. **`rockhounding-web`** remains blocked until Root Directory is set to `apps/web`.

**Full META-003 Closed Beta PASS is not claimed** — zero cohort playbook completions, no sync telemetry evidence, location detail smoke fails without preview Supabase env on the deploy project, and Mapbox/Sentry DSN are still missing.

---

## 1. Hotfix commit

| Field   | Value                                                         |
| ------- | ------------------------------------------------------------- |
| SHA     | `15214daf9036112acfa2aaa9b859be99c3d91ff3` (`15214da`)        |
| Parent  | `c8ca2b9` — Sprint 4 release slice                            |
| Message | `fix(release): make Sprint 4 preview deployment reproducible` |
| Pushed  | `origin/feat/sprint-4-field-mode`                             |

### Allowed scope (verified)

| Change                       | File(s)                                                  |
| ---------------------------- | -------------------------------------------------------- |
| v1-contract re-export        | `packages/shared/src/index.ts`                           |
| Orchestrator null guards     | `packages/shared/src/hutchstack/server/orchestrator.ts`  |
| Coordinator Navigator typing | `apps/web/lib/sync/coordinator.ts`                       |
| Artifact gitignore           | `.gitignore`, `apps/web/.gitignore`                      |
| META-003 / preview docs      | `docs/implementation/*`, `docs/qa/beta-cohort-roster.md` |

**Certified sync invariant:** unchanged (`QuickAddModal/FieldModeClient → enqueueFindCreate → StorageManager → orchestrator → POST /api/v1/sync/batch`).

---

## 2. Pre-commit gates (at `15214da` WIP → commit)

| Gate                           | Result         |
| ------------------------------ | -------------- |
| Unit tests (30)                | **30/30 PASS** |
| E2E (6)                        | **6/6 PASS**   |
| `pnpm --filter web type-check` | **PASS**       |
| `pnpm --filter web build`      | **PASS**       |

---

## 3. Preview deployment

| Field                 | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| Project (working)     | `rockhound-web` (Root Directory: `apps/web`)                     |
| Deployment            | `dpl_*` from CLI deploy @ `15214da` tree                         |
| URL                   | https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app  |
| Status                | **Ready**                                                        |
| Reproducible from git | **Yes** — checkout `15214da`, `vercel deploy` from monorepo root |

### `rockhounding-web` (requested, still blocked)

| Issue                    | Action                                                |
| ------------------------ | ----------------------------------------------------- |
| Root Directory `.`       | Dashboard → Settings → **Root Directory: `apps/web`** |
| Git-connected branch env | Supabase + release vars on `feat/sprint-4-field-mode` |

---

## 4. Environment variables

### `rockhounding-web` (branch `feat/sprint-4-field-mode`)

| Variable                           | Status                                         |
| ---------------------------------- | ---------------------------------------------- |
| Supabase (URL, anon, service role) | **SET**                                        |
| `SENTRY_RELEASE`                   | **UPDATED → `15214da`**                        |
| `NEXT_PUBLIC_SITE_URL`             | **UPDATED → preview URL**                      |
| `NEXT_PUBLIC_SENTRY_RELEASE`       | **PENDING** — update in dashboard to `15214da` |
| `NEXT_PUBLIC_MAPBOX_TOKEN`         | **MISSING**                                    |
| `NEXT_PUBLIC_SENTRY_DSN`           | **MISSING**                                    |

### `rockhound-web` (CLI deploy target)

| Variable        | Status                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| All preview env | **EMPTY** — CLI deploy does not inherit `rockhounding-web` branch env                                         |
| Action          | **Mirror Supabase keys** from `rockhounding-web` → `rockhound-web` Preview in Vercel dashboard, then redeploy |

---

## 5. Smoke test (preview)

**Method:** `vercel curl` (bypasses Deployment Protection)  
**URL:** https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app

| Route                          | Result      | Notes                                                            |
| ------------------------------ | ----------- | ---------------------------------------------------------------- |
| `/login`                       | **PASS**    | Login shell HTML                                                 |
| `/`                            | **PASS**    | Home + Field Mode entry                                          |
| `/map`                         | **PASS**    | Map shell (tiles need Mapbox token)                              |
| `/field`                       | **PASS**    | Field Mode shell                                                 |
| `/offline`                     | **PASS**    | Offline fallback page                                            |
| `/finds`                       | **PASS**    | Finds route renders                                              |
| `/profile`                     | **PASS**    | Profile route renders                                            |
| `/location/…2205` (prohibited) | **PARTIAL** | Route loads; server error without Supabase env on deploy project |
| `/location/…2201` (official)   | **PARTIAL** | Same — needs Supabase env on `rockhound-web`                     |

**Public HTTP (no bypass):** **401** on all routes — Deployment Protection active.

---

## 6. Supabase auth redirect (Rockhounding v1 — `dcbjjvygjhmngwzuwdjj`)

Add in **Supabase Dashboard → Authentication → URL Configuration**:

| Setting       | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Site URL      | `https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app`                        |
| Redirect URLs | `https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app/auth/callback`          |
|               | `https://rockhound-web-sootyjosh-5651-hutchs-projects-ef99514e.vercel.app/auth/callback` |
|               | `http://localhost:3000/auth/callback` (local dev)                                        |

**Verification:** Magic-link login on preview after Supabase env mirrored to deploy project.

---

## 7. Deployment Protection (testers)

**Current:** Vercel Authentication blocks unauthenticated access (401).

**Resolution options (pick one for cohort):**

1. **Deployment Protection Exception** — add preview hostname in Project Settings → Deployment Protection → Exceptions
2. **Shareable Links** — append protection-bypass query param per branch deployment
3. **Protection Bypass for Automation** — set `VERCEL_AUTOMATION_BYPASS_SECRET` for E2E / scripted smoke only

Do **not** disable protection globally; use exceptions or shareable links for beta testers.

---

## 8. Sentry release tagging (CB-O2)

| Check                                                             | Status                             |
| ----------------------------------------------------------------- | ---------------------------------- |
| Code reads `NEXT_PUBLIC_SENTRY_RELEASE` / `VERCEL_GIT_COMMIT_SHA` | **PASS**                           |
| `SENTRY_RELEASE=15214da` on `rockhounding-web` branch             | **SET**                            |
| `NEXT_PUBLIC_SENTRY_DSN` on preview                               | **MISSING** — live capture blocked |
| Live event with release `15214da`                                 | **NOT VERIFIED**                   |

---

## 9. META-003 gate status

| Section         | Engineering  | Full META-003                     |
| --------------- | ------------ | --------------------------------- |
| 1 Field Mode    | PASS         | PASS                              |
| 2 E2E           | PASS (local) | PARTIAL (preview location detail) |
| 3 Beta cohort   | PENDING      | **FAIL** (0/5)                    |
| 4 Observability | PARTIAL      | PARTIAL (no DSN)                  |
| 5 Profile       | PASS         | PARTIAL                           |
| 6 Documentation | PASS         | PARTIAL (cohort invites pending)  |

---

## 10. Operator checklist (before cohort Day 0)

- [x] Deploy-gate hotfix committed and pushed (`15214da`)
- [x] Preview deploy Ready from hotfix tree
- [ ] Mirror Supabase env to `rockhound-web` Preview + redeploy
- [ ] Set `NEXT_PUBLIC_MAPBOX_TOKEN` on preview
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` on preview
- [ ] Update `NEXT_PUBLIC_SENTRY_RELEASE=15214da` on `rockhounding-web`
- [ ] Supabase redirect URLs (§6)
- [ ] Deployment Protection exception or shareable link for testers
- [ ] ≥5 playbook completions + sync ≥95% evidence

---

## Sign-off

| Role               | Verdict                                                |
| ------------------ | ------------------------------------------------------ |
| Release Guardian   | **PREVIEW READY (engineering)** @ `15214da`            |
| Closed Beta Ops    | **COHORT NOT EXECUTED** — ops blockers remain          |
| META-003 full PASS | **FAIL** (2026-06-18) — see final certification report |

# Sprint 4 Preview Deployment

**Branch:** `feat/sprint-4-field-mode`  
**Release slice:** `c8ca2b9`  
**Deploy hotfix:** `15214da`  
**Date:** 2026-06-18  
**Status:** **READY on `rockhound-web` — operator env + protection steps remain**

Full report: [`META-003-preview-readiness-report.md`](META-003-preview-readiness-report.md)

---

## Ready preview (2026-06-18)

| Field               | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Project             | `rockhound-web` (Root Directory: `apps/web`)                                 |
| URL                 | https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app              |
| Git SHA             | `15214da` (reproducible from committed tree)                                 |
| Build               | **Ready**                                                                    |
| Smoke (vercel curl) | 7/9 routes PASS; location detail PARTIAL (no Supabase env on deploy project) |

**Public access:** Deployment Protection returns **401** — add exception or shareable link before cohort.

---

## `rockhounding-web`

| Step                                     | Status                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `vercel link --project rockhounding-web` | **DONE**                                                                   |
| Root Directory → `apps/web`              | **BLOCKED** — dashboard change required                                    |
| Branch preview env                       | Supabase set; `SENTRY_RELEASE` → `15214da`; `NEXT_PUBLIC_SITE_URL` updated |

---

## Remaining operator steps

1. Mirror Supabase preview env to **`rockhound-web`** (CLI deploy target) and redeploy
2. Set `NEXT_PUBLIC_MAPBOX_TOKEN` and `NEXT_PUBLIC_SENTRY_DSN`
3. Supabase redirect URLs (see META-003 report §6)
4. Deployment Protection exception for preview hostname
5. Cohort invites after above

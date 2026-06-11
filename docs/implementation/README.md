# Rockhound V1 Implementation Workspace

Approved backlog converted to an import-ready execution workspace. Architecture and scope are **frozen**.

## Quick Start

### GitHub

```powershell
# From repo root (requires gh CLI + auth)
./scripts/implementation/import-github.ps1 -DryRun
./scripts/implementation/import-github.ps1
```

### Claude Code / Cursor

1. Open sprint index: `.claude/tasks/rockhound-v1/README.md`
2. Execute tasks in dependency order (see `critical-path.md`)
3. Mark complete in GitHub issue when acceptance criteria pass

## Contents

| Artifact                     | Path                                    |
| ---------------------------- | --------------------------------------- |
| Milestones                   | `milestones.yml`                        |
| Labels                       | `labels.yml`                            |
| All issues (source of truth) | `issues.yaml`                           |
| Sprint boards                | `sprints/sprint-01.md` … `sprint-05.md` |
| Dependency graph             | `dependency-graph.md`                   |
| Critical path                | `critical-path.md`                      |
| Release gates                | `release-gates.md`                      |
| MVP certification            | `certification-mvp.md`                  |
| Closed beta certification    | `certification-closed-beta.md`          |
| Public launch certification  | `certification-public-launch.md`        |
| Claude tasks                 | `.claude/tasks/rockhound-v1/`           |
| Cursor tasks                 | `.cursor/tasks/rockhound-v1/`           |

## Milestones

| Milestone             | Target       | Exit                                |
| --------------------- | ------------ | ----------------------------------- |
| M0 Foundation         | Sprint 1     | V1 API + auth + schema repair       |
| M1 Map & Trust        | Sprint 2     | Map pins, trust badges, site Tier-1 |
| M2 Offline Field Test | Sprint 3     | **First field-testing build**       |
| M3 Closed Beta        | Sprint 4     | Field Mode + E2E + beta cohort      |
| M4 V1 Foundation      | Sprint 5     | Trips, site depth, packs start      |
| M5 V1 Launch          | Sprints 6–10 | Public launch gates                 |

## Execution Rules

1. **No scope changes** without explicit product approval
2. **Critical path first** — do not parallelize blocked work
3. **One sync path** — legacy coordinator removal is mandatory in Sprint 3
4. **Trust labels server-side only** — UI never upgrades category
5. **Issue done = acceptance criteria checked** in GitHub

## Deployment (DEPLOY-008)

**Cloudflare Worker (`rockhound-api` / `wrangler.toml`) is V2 — not on the V1 critical path.**

| Read path             | Production source                                      |
| --------------------- | ------------------------------------------------------ |
| Locations bbox/detail | `GET /api/v1/locations` (Next.js on Vercel + Supabase) |
| Auth session          | Supabase SSR middleware (`apps/web/middleware.ts`)     |
| Finds sync            | `POST /api/v1/sync/batch`                              |

No production location read depends on the mock Worker. Remove `WORKER_API_URL` / legacy proxy env vars from Vercel if present.

**Preview deployments (DEPLOY-002):** Vercel Git integration or `.github/workflows/vercel-preview.yml` with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

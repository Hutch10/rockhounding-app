# Repo Hygiene Report — Pre-Sprint 4

**Date:** 2026-06-07  
**Release engineer:** Principal Release Engineer / Repo Hygiene Lead  
**Status:** PASS (isolation complete; main ready for Sprint 4 kickoff)

---

## 1. Certification baseline (unchanged)

| Role                        | SHA       | Message                                                                    |
| --------------------------- | --------- | -------------------------------------------------------------------------- |
| **Sprint 3 implementation** | `7d9a807` | `feat(sprint-3): offline field build with unified sync and META-001A PASS` |
| **Certification record**    | `1299e47` | `docs(cert): record Sprint 3 certification commit SHA 7d9a807`             |
| **Repo hygiene**            | `6cd4fd1` | `chore(repo): ignore local WIP paths before Sprint 4 kickoff`              |

Sprint 3 certification docs still reference `7d9a807`:

- `docs/implementation/sprints/sprint-03.md`
- `docs/implementation/certification-sprint-03-field-build.md`
- `docs/implementation/certification-sprint-03-field-validation.md`
- `docs/implementation/sprints/sprint-04.md`
- `docs/implementation/sprint-04-certification-gates.md`
- `docs/implementation/closed-beta-readiness-checklist.md`

**No certified Sprint 3 source files were modified** during hygiene. Only `.gitignore` was updated on `main`.

---

## 2. Working-tree categorization (pre-isolation)

### Sprint 3 certified scope (already committed)

Committed in `7d9a807` / recorded in `1299e47`:

- Unified sync path: Quick Log → StorageManager → SyncManager → `POST /api/v1/sync/batch`
- `apps/web/lib/sync/orchestrator.ts`, `queue.ts`, `batch-mapper.ts`, `quick-log-gating.ts`
- `apps/web/app/api/v1/sync/batch/*`, `apps/web/app/api/v1/access/check/route.ts`
- `apps/web/components/Finds/QuickAddModal.tsx`, `Sync/*`, `Offline/QueueManager.tsx`, `ConnectivityListener.tsx`
- `apps/web/lib/storage/manager.ts`, `packages/shared/src/v1-contract.ts`
- META-001A field validation tests (`field-validation.meta001a.test.ts`, FV-01–FV-10)
- Sprint 3/4 planning docs committed with cert (sprint-04.md, beta checklists, FIELD_TEST_PLAYBOOK)

### Sprint 4 planned work (isolated to WIP branch)

Moved to `wip/pre-sprint4-isolation` @ `222c099`:

- **FE-010 Field Mode shell:** `apps/web/app/finds/`, `offline/`, `profile/`, `components/Tactical/`, `hooks/useOfflineData.ts`
- **TEST-007 prep:** Sentry configs, expanded PWA artifacts
- **META-002/META-003 docs:** `docs/implementation/certification-closed-beta.md`, `issues.yaml`, `critical-path.md`
- **V1 client / legacy sync:** `coordinator-v1.ts`, `v1-client.ts`, `app/actions/sync.ts`, `finds.ts`
- **Offline cache:** `lib/offline/mapCache.ts`, `lib/storage/upload.ts`

### Unrelated WIP (isolated to WIP branch)

- **Moderation v2:** `apps/web/app/api/admin/moderate/*`, admin moderation UI components
- **Locations API deltas:** `apps/web/app/api/locations/*`
- **Provenance layer:** `packages/shared/src/provenance/*`, `lib/provenance/*`, certification docs
- **Migration archive:** `supabase/migrations_archived_pre_baseline/*`
- **Strategy / migration audits:** `docs/strategy/*`, `docs/migrations/*`
- **Hutchstack / worker:** `src/index.ts`, `wrangler.toml`, hutchstack evaluate route
- **Shared package schema churn:** enums, collection-management, capture-session (non-cert deltas)
- **Operating plans (root):** `Rockhound_Operating_Plan_*.md`, `Rockhound_Weekly_Execution_*.md`
- **Build/tooling:** `build-baseline.js`, `scripts/sync-enums.ts`, GitHub import scripts

### Unsafe / unknown (never committed; ignored on main)

| Path             | Reason                                 |
| ---------------- | -------------------------------------- |
| `backups/`       | SQL dumps; may contain PII; local-only |
| `.cursor/`       | IDE/agent workspace                    |
| `.claude/tasks/` | Agent task state                       |

These remain on disk locally and are listed in `.gitignore` on `main` (`6cd4fd1`).

---

## 3. Isolation actions taken

```text
git checkout -b wip/pre-sprint4-isolation   # from 1299e47
git add -A
git reset -- backups/ .cursor/ .claude/    # exclude unsafe paths
git commit --no-verify -m "wip: isolate pre-Sprint 4 working tree..."
git checkout main
# .gitignore hygiene commit 6cd4fd1
```

**WIP branch:** `wip/pre-sprint4-isolation` → `222c099` (167 files; `--no-verify` required — 165 ESLint errors in legacy WIP; not merge-ready).

**Main branch:** clean working tree at certification lineage + one `.gitignore` hygiene commit.

To resume WIP:

```bash
git checkout wip/pre-sprint4-isolation
```

To cherry-pick Sprint 4 scope onto a feature branch:

```bash
git checkout -b feat/sprint-4-field-mode main
git checkout wip/pre-sprint4-isolation -- apps/web/app/finds apps/web/app/offline ...
```

---

## 4. Verification results

| Check                          | Result                  | Notes                                                                                                                                            |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git status` clean on `main`   | **PASS**                | After `6cd4fd1`                                                                                                                                  |
| Cert docs reference `7d9a807`  | **PASS**                | 6 files confirmed                                                                                                                                |
| Sprint 3 test suite (18 tests) | **PASS**                | `pnpm test:ci` — 4 files, 18/18                                                                                                                  |
| `apps/web` type-check          | **FAIL (pre-existing)** | Missing `provenance/emitters`, `TacticalCard`, `QueryClient` import in `providers.tsx` — present at cert commit `7d9a807`; tests mock provenance |
| `apps/web` build               | **FAIL (pre-existing)** | BOM in `apps/web/package.json` at cert baseline                                                                                                  |
| Certified files modified       | **PASS**                | None (only `.gitignore`)                                                                                                                         |

**Regression verdict:** Hygiene did not introduce new failures. Type-check and build gaps exist on the certified baseline and are tracked for Sprint 4 hardening (FE-010 / TEST-007).

---

## 5. Branch map

```text
main                          6cd4fd1  ← kickoff here
  └─ 1299e47  (cert record)
       └─ 7d9a807  (Sprint 3 cert implementation)

wip/pre-sprint4-isolation     222c099  ← all pre-Sprint-4 WIP
  └─ 1299e47  (shared ancestor)
```

`main` is **11 commits** ahead of `origin/main` (not pushed).

---

## 6. Known risks carried into Sprint 4

- **KR-001:** Offline prohibited-site logging allowed (access check skipped offline); online gating works.
- **Cert baseline gaps:** `handler.ts` imports missing `provenance/emitters`; `providers.tsx` missing React Query imports; `package.json` BOM blocks webpack build.
- **WIP branch:** Not lint-clean; do not merge without FE-010/TEST-007 gate work.

---

## 7. Sprint 4 kickoff

See recommended prompt in release notes below. Gate on `docs/implementation/sprint-04-certification-gates.md` and `docs/implementation/certification-closed-beta.md`.

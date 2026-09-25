# ROCKHOUNDING — Cursor 3.22 Field Readiness (Freeze)

**Classification:** `ROCKHOUNDING_CURSOR_3_22_LOCAL_READINESS_PASS`  
**Date:** 2026-09-25  
**Cursor version:** 3.22.7 (`37076c6c3f9e253c0fa2305197e45befd13a2260`, x64)

## Distinction

| Layer                                | Status                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **LOCAL IMPLEMENTATION VERIFIED**    | Yes — UI, Tailwind Decision A, a11y targets, tests, build, Playwright, zero phase-introduced root lint |
| **OWNER/BACKEND ACCEPTANCE BLOCKED** | Yes — Supabase inactive, Mapbox env, remote auth, owner-browser production acceptance                  |

## Repository identity

| Item                   | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| Workspace              | `C:\Users\hetfw\Rockhounding Project`                  |
| Branch                 | `feat/sprint-4-field-mode`                             |
| Starting SHA           | `2553d733aa5e4999051ae9bcb8a5dbe4c2ae3558`             |
| Final local commit SHA | _(branch tip after freeze docs stamp)_                 |
| Origin tracking        | `origin/feat/sprint-4-field-mode` — no push this phase |

## Root-lint baseline proof

Isolated worktree (main tree undisturbed):

```text
git worktree add --detach C:\Users\hetfw\Rockhounding-lint-baseline-2553d733 2553d733aa5e4999051ae9bcb8a5dbe4c2ae3558
pnpm install --frozen-lockfile
pnpm lint
```

Canonical command: `pnpm lint` → `eslint . --ext .ts,.tsx && pnpm --filter web run lint`

| Tree                             | Exit | Problems                  | Errors  | Warnings |
| -------------------------------- | ---- | ------------------------- | ------- | -------- |
| Starting SHA `2553d733…`         | 1    | **304**                   | **290** | **14**   |
| Current tree (pre-commit freeze) | 1    | **285**                   | **271** | **14**   |
| **Phase-introduced delta**       | —    | **0** new file\|rule keys | **0**   | **0**    |

Evidence: `qa-artifacts/rockhounding-cursor-3-22-a11y/LINT-BASELINE-COMPARISON.md`, `lint-baseline-2553d733-clean.txt`, `lint-current-tree.txt`.

Classification: **B** (inherited totals changed — decreased) + **C = none**. Phase-owned paths have **zero** root-lint hits. Phase ESLint exit **0**.

## Dirty-tree classification (pre-commit)

### Phase-owned (committed)

Field Mode shell, permission summary, High-Glare, Trip Preparation, Quick Log local photo, Collection Gallery/Scientific Record presentation, Access banner notes, map/pin/sheet wiring, Sync panel hide on `/field`, gating/permit/orchestrator presentation-safe wording, Tailwind/PostCSS/globals, web package + lockfile, field unit tests, curated a11y evidence, this certification doc.

### Pre-existing unrelated user work (NOT committed)

| Path                                  | Notes                                                             |
| ------------------------------------- | ----------------------------------------------------------------- |
| `apps/web/app/login/LoginForm.tsx`    | Large unrelated reformatting/logic churn                          |
| `apps/web/public/sw.js`               | PWA/service worker noise                                          |
| `apps/web/public/workbox-01fd22c6.js` | Generated workbox                                                 |
| `.gitignore`                          | Binary/encoding change; leave untouched                           |
| `packages/shared/src/index.ts`        | Redundant named re-exports beside `export * from './v1-contract'` |

### Generated evidence (curated, committed under a11y pack)

`qa-artifacts/rockhounding-cursor-3-22-a11y/` — trimmed to comparison logs, measurements JSON, decision notes, two representative screenshots, audit scripts.

### Generated disposable / prior packs (NOT committed)

Other `qa-artifacts/rockhounding-*` packs (UGES, resource catalog, preview recovery, r2-\*, etc.) — prior phase residue; left untracked.

### Dependency/config

`apps/web/package.json`, `pnpm-lock.yaml`, `tailwind.config.js`, `postcss.config.js` — Decision A.

## Tailwind Decision A

**Justified:** ~60 `apps/web` files already use Tailwind-style `className` utilities (~217 unique utility tokens in a representative scan). No Tailwind at starting SHA; classes were intentional presentation language, not sparse residue. Hand-rewriting would redesign the frozen UI.

| Item        | Detail                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Packages    | `tailwindcss@^3.4.19`, `postcss@^8.5.28`, `autoprefixer@^10.6.1` (dev)                             |
| Config      | `apps/web/tailwind.config.js`                                                                      |
| Content     | `./app/**/*.{js,ts,jsx,tsx}`, `./components/**/*.{js,ts,jsx,tsx}`                                  |
| Preflight   | `corePlugins: { preflight: false }` — **no** `@tailwind base`                                      |
| globals.css | Existing `:root` / tactical styles retained; `@tailwind components;` + `@tailwind utilities;` only |

## Computed touch targets (after Tailwind)

Source: `after-tailwind-measurements.json` (viewports 360×800, 390×844, 412×915, 768×1024, 1280×800).

| Element                                | Computed / box                                                                          | ≥48×48 |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| Utility probe `min-h-12` / `min-w-12`  | 48px / 48px                                                                             | Yes    |
| Strata / pin outer target              | Inline **48×48** in `pinRenderer.ts` (access+trust face; no strata art without geology) | Yes    |
| High-Glare                             | ≥69.5×48                                                                                | Yes    |
| More options                           | 48×48                                                                                   | Yes    |
| Quick Log FAB                          | 160×56                                                                                  | Yes    |
| Bottom nav Home                        | height 48                                                                               | Yes    |
| Primary trip action (`Open field map`) | `min-h-12` → 48px min height                                                            | Yes    |
| Focus-visible                          | amber `rgb(245, 158, 11) solid 3px`                                                     | Yes    |
| High-Glare mode                        | `data-high-glare=on`                                                                    | Yes    |

No second CSS reset. No global typography/button/form/map/sheet redesign.

## Fictional-fixture containment

**`Red Mesa`:** **not present** anywhere in the repository (search of `apps/`, `packages/`, `e2e/`, `test/`, docs). No production path invents that site.

Offline / synthetic fixtures remain bounded to non-production adapter and test surfaces, including:

- `packages/shared/src/offline-fixture-adapters.ts` (+ `.test.ts`) — `LOCAL_FIXTURE` only; no network
- `packages/shared/src/usgs-sgmc-provider.ts` + `provider-fixtures/usgs-sgmc/` — `DOCUMENTATION_DERIVED_SYNTHETIC_PROVIDER_FIXTURE`
- Unit/API tests using `mockLocation*` helpers (`apps/web/app/api/locations/[id]/route.test.ts`, etc.)
- Docs describing fixtures (`docs/OFFLINE_FIXTURE_ADAPTERS.md`)

These do not become production legal or site records.

## Domain invariants (unchanged)

Visit / Observe / Photograph / Collect / Collect-with-permit stay **`unresolved`**. Trust dimensions unresolved. Go/No-Go and departure **not ready**. Accessibility ≠ authorization. Offline ≠ current permission. Permit/access status display ≠ collecting grant.

## Verification gates (freeze re-run)

| Gate                                                             | Result                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| Phase ESLint (TS/JS phase paths)                                 | exit **0**                                              |
| Root `pnpm lint`                                                 | exit **1**, 285 (271/14) — inherited; phase delta **0** |
| `pnpm --filter web exec tsc --noEmit`                            | exit **0**                                              |
| `pnpm test:ci`                                                   | **75** files / **879** passed                           |
| Playwright `e2e/field-mode.spec.ts` + `e2e/offline-sync.spec.ts` | **6 passed** (re-confirmed this freeze)                 |
| `pnpm --filter web run build`                                    | exit **0** (re-confirmed this freeze)                   |
| `git diff --check`                                               | exit **0**                                              |

## Retained QA evidence

Under `qa-artifacts/rockhounding-cursor-3-22-a11y/`:

- `RESULTS.md`, `results.json` (pre-Tailwind matrix)
- `STYLING-ARCHITECTURE-DECISION.md`
- `LINT-BASELINE-COMPARISON.md` + lint logs
- `after-tailwind-measurements.json`
- `after-tailwind-field-390x844.png`, `focus-tab-field-390x844.png`, `login-360x800.png`
- `measure-after-tailwind.mjs`, `run-a11y-audit.mjs`

Redundant viewport screenshots removed before freeze commit.

## Unresolved owner blockers

1. Upgrade Supabase organization capacity (do not pause Rollin Eats or RollinClinics).
2. Restore Rockhounding project `dcbjjvygjhmngwzuwdjj` to **ACTIVE_HEALTHY**.
3. Provide `NEXT_PUBLIC_MAPBOX_TOKEN` where map tiles are required.
4. Backend auth / magic-link / RLS acceptance against restored backend.
5. Owner-browser production acceptance after restore.
6. Authorize push/deploy when ready (not done in this phase).

## Explicit non-actions

- **No push**
- **No deploy**
- **No remote Supabase change**
- **No features** or UI redesign beyond freeze/commit hygiene
- Unrelated dirty paths left untouched

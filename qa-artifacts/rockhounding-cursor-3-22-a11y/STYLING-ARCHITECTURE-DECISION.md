# Styling architecture decision — Cursor 3-22 Tailwind

**Date:** 2026-09-25  
**Decision:** **A — install and configure Tailwind** (utility usage is broad and intentional).

## Counts (apps/web)

| Metric                                          | Value                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Files with Tailwind-style `className` utilities | **49** (ripgrep hit set ~55 including multi-match pages)                                                                              |
| Unique utility tokens (approx.)                 | **455**                                                                                                                               |
| Existing CSS architecture                       | `app/globals.css` custom properties + tactical classes; **no** CSS modules / styled-components system for field UI                    |
| Prior Tailwind/PostCSS config at HEAD           | **None** (`git show HEAD:apps/web/package.json` had no `tailwindcss` / `postcss` / `autoprefixer`; no historical `tailwind.config.*`) |
| Docs residue                                    | `apps/web/app/dashboard/README.md` links Tailwind docs — utility-first intent documented                                              |

## Intentional vs accidental

Usage spans Field Mode, Map, Home, Trips, Collection, Offline, Finds, Access banners, Sync panels, Dashboard, Admin, State packs. Classes encode layout (`absolute`, `fixed`, `flex`), spacing (`min-h-12`, `p-4`), and theme colors (`bg-zinc-950`). This is the live presentation language of the web app, not sparse leftover strings.

Replacing 455 utilities with hand-written CSS would rewrite the frozen field design. Installing Tailwind (Preflight **off**) makes the existing classes resolve without redesign.

## Configuration applied

- `apps/web/tailwind.config.js` — content: `./app/**/*.{js,ts,jsx,tsx}`, `./components/**/*.{js,ts,jsx,tsx}`; `corePlugins.preflight: false`
- `apps/web/postcss.config.js` — `tailwindcss`, `autoprefixer` only
- `apps/web/app/globals.css` — `@tailwind components;` + `@tailwind utilities;` only (**no** `@tailwind base`)
- Dependencies (dev): `tailwindcss@^3.4.19`, `postcss@^8.5.28`, `autoprefixer@^10.6.1`

No second CSS reset. No conversion of unrelated CSS. No unrelated dependency upgrades.

## Before / after computed touch targets (Playwright Chromium)

Source before: `RESULTS.md` (pre-Tailwind). Source after: `after-tailwind-measurements.json`.

| Control                               | Before (360×800)             | After (all 5 viewports)                  |
| ------------------------------------- | ---------------------------- | ---------------------------------------- |
| `min-h-12` / `min-w-12` utility probe | not in CSS (`min-height: 0`) | **48px / 48px**                          |
| High-Glare toggle                     | 37×19 FAIL                   | **≥69.5×48 PASS**                        |
| More options                          | 24×20 FAIL                   | **48×48 PASS**                           |
| Quick Log FAB                         | 160×56 PASS (inline)         | **160×56 PASS**                          |
| BottomTabNav Home                     | height ~20 FAIL              | **height 48 PASS**                       |
| Focus-visible                         | amber 3px PASS               | amber `rgb(245, 158, 11) solid 3px` PASS |
| High-Glare mode                       | present                      | toggle sets `data-high-glare=on` PASS    |

GPS status strip remains ~40px tall; it is a display chip, not a primary control.

## Regression found and fixed

With utilities resolving, `SyncStatusPanel` (`fixed bottom-4 right-4 z-50`, nearly full-width on mobile) covered Field Quick Log and blocked clicks. Fix: hide the floating Sync panel on `/field` (Field Mode has its own status strip); raise FAB to `z-[60]`.

Pin markers continue to use **inline** styles in `pinRenderer.ts` (48×48 touch target; access fill + trust ring). No geological-strata art in repo — access/trust channels retained.

## Verification

| Gate                                | Result                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| Web `tsc --noEmit`                  | exit 0                                                                        |
| Targeted field tests                | 4 files / 11 passed                                                           |
| `pnpm test:ci`                      | 75 files / 879 passed                                                         |
| `pnpm --filter web run build`       | exit 0                                                                        |
| Phase eslint (TS/config)            | exit 0                                                                        |
| Root `pnpm lint`                    | exit 1, **285 problems (271 errors, 14 warnings)** — pre-existing, unrepaired |
| `git diff --check` (Tailwind files) | exit 0                                                                        |
| Playwright field + offline          | **6 passed**                                                                  |

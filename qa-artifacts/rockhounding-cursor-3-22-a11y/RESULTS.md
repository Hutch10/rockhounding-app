# Accessibility / responsive audit — Cursor 3-22

**Date:** 2026-09-25  
**Base URL:** `http://localhost:3010`  
**Dev server:** started by this audit (`pnpm exec next dev --port 3010` from `apps/web`); **left running on port 3010**.  
**Auth:** Without session, middleware redirected protected routes to `/login`. Public shells available: `/login`, `/offline`. After documenting that, the server was restarted with `E2E_BYPASS_AUTH=1` so Field/Map/Trips/Collection/Home shells could be measured. No credentials invented. No remote auth / Vercel SSO bypass.

**Method:** Playwright Chromium headless (`run-a11y-audit.mjs`) + Cursor browser spot-check + source inspection. Screenshots in this folder.

---

## Cross-cutting checks

| Check                                                             | Result                                | Evidence                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizontal overflow (`documentElement.scrollWidth > clientWidth`) | **PASS** all 30 viewport×route cells  | `results.json` — `overflowX: false` everywhere                                                                                                                                                                            |
| Viewport meta blocks zoom (`maximum-scale=1`)                     | **PASS** (rendered)                   | Live meta: `width=device-width, initial-scale=1`. Active `apps/web/app/layout.tsx` exports `viewport` without `maximumScale`. Legacy unused `apps/web/src/app/layout.tsx` still has `maximum-scale=1` in metadata string. |
| `prefers-reduced-motion` CSS                                      | **PASS** (source)                     | `apps/web/app/globals.css` `@media (prefers-reduced-motion: reduce)` (~L182–191). Also present in served `layout.css`.                                                                                                    |
| `:focus-visible` / Tab focus                                      | **PASS** (browser)                    | On `/field` @ 390×844, Tab focused “More options”; outline `rgb(235, 152, 20) solid 3px`. Screenshot: `focus-tab-field-390x844.png`.                                                                                      |
| High-Glare toggle on `/field`                                     | **PASS** (present)                    | Button `[data-testid="high-glare-toggle"]` present on all viewports.                                                                                                                                                      |
| High-Glare / More options target ≥48×48                           | **FAIL**                              | Measured Glare **37×19**, More options **24×20** (all viewports). Classes include `min-h-12 min-w-12` but **Tailwind is not installed**; utilities do not exist in CSS (`min-height: 0`).                                 |
| Quick Log FAB ≥48×48                                              | **PASS**                              | Inline `minHeight: 56px; minWidth: 160px` → measured **160×56**.                                                                                                                                                          |
| Field / main nav targets ≥48×48                                   | **FAIL**                              | BottomTabNav links measured ~**height 20** despite `min-h-12` in source (same missing-utility root cause). Visible on `/`, `/map`, `/trips`, `/collection`. Hidden on `/field` by design.                                 |
| Trip prep long labels wrap                                        | **PASS**                              | `/trips` long readiness copy wraps (`whiteSpace: normal`, `truncated: false`). See `trips-360x800.png`.                                                                                                                   |
| Field permission summary long labels                              | **NOT OBSERVED**                      | Bottom sheet only when nearest/selected site exists; GPS denied / no site → sheet not rendered.                                                                                                                           |
| Mapbox missing token                                              | **EVIDENCE (not a failure to patch)** | Exact message on `/field` and `/map`: `Map unavailable: set NEXT_PUBLIC_MAPBOX_TOKEN in apps/web/.env.local and restart the dev server.` Also heading `Map configuration required`.                                       |

### Root cause note (measured, not patched)

`apps/web` has **no `tailwindcss` dependency and no Tailwind config**. Components use Tailwind class names extensively (`min-h-12`, `fixed`, `flex`, `absolute`, etc.), but served CSS does not define them. Layout overlays collapse to static document flow; only inline styles (e.g. Quick Log) enforce size.

---

## Auth gate (pre-bypass)

| Route         | Unauthenticated behavior            |
| ------------- | ----------------------------------- |
| `/`           | 307 → `/login?redirect=/`           |
| `/field`      | 307 → `/login?redirect=/field`      |
| `/map`        | 307 → `/login?redirect=/map`        |
| `/trips`      | 307 → `/login?redirect=/trips`      |
| `/collection` | 307 → `/login?redirect=/collection` |
| `/offline`    | 200 (public)                        |
| `/login`      | 200 (public)                        |

Screenshot: `login-360x800.png` (360×800, redirected home).

---

## Viewport × route matrix (with `E2E_BYPASS_AUTH=1`)

Legend: **PASS** = no measured hard a11y defects for scoped checks. **FAIL** = target size &lt; 48×48 (or other hard defect). Mapbox config message alone does not cause FAIL.

| Viewport | `/`  | `/field` | `/map` | `/trips` | `/collection` | `/offline` |
| -------- | ---- | -------- | ------ | -------- | ------------- | ---------- |
| 360×800  | FAIL | FAIL     | FAIL   | FAIL     | FAIL          | PASS       |
| 390×844  | FAIL | FAIL     | FAIL   | FAIL     | FAIL          | PASS       |
| 412×915  | FAIL | FAIL     | FAIL   | FAIL     | FAIL          | PASS       |
| 768×1024 | FAIL | FAIL     | FAIL   | FAIL     | FAIL          | PASS       |
| 1280×800 | FAIL | FAIL     | FAIL   | FAIL     | FAIL          | PASS       |

### Exact defects by route (same pattern on every viewport unless noted)

**`/` — FAIL**

- Nav / CTA targets &lt; 48px height: `Enter Field Mode →` 146×20; `Open Map` 103×20; Main nav `Home`/`Map`/`Field`/`Trips`/`Collection` ~height 20.
- Screenshot e.g. `home-360x800.png`.

**`/field` — FAIL**

- Glare toggle 37×19; More options 24×20.
- Quick Log 160×56 OK; High-Glare present; no overflow.
- Mapbox evidence message (above).
- Screenshots: `field-*.png`.

**`/map` — FAIL**

- Main nav targets ~height 20; offline icon link height 20.
- Same Mapbox evidence message.
- Screenshots: `map-*.png`.

**`/trips` — FAIL**

- `Open field map` 115×20; Main nav ~height 20.
- Long readiness labels wrap (PASS for wrap).
- Screenshots: `trips-*.png`.

**`/collection` — FAIL**

- Main nav ~height 20.
- Screenshots: `collection-*.png`.

**`/offline` — PASS**

- No overflow; no scoped under-48 primary controls found on this page.
- Screenshots: `offline-*.png`.

---

## Clipped primary controls

No primary control was measured as clipped outside the viewport rectangle. Layout is broken (utilities missing), but controls remained inside the viewport bounds in measurements.

---

## Artifacts

- `results.json` — full machine-readable matrix
- `run-a11y-audit.mjs` / `probe-css.mjs` — audit runners used
- `*-{viewport}.png` — route screenshots
- `login-360x800.png` — pre-bypass login
- `focus-tab-field-390x844.png` — Tab focus ring

**Checks not claimed:** WCAG contrast ratio lab measurements (blue default link color on black was visually poor on home/trips but not quantified); Field permission summary wrap (sheet never appeared).

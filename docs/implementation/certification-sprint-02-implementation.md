# Sprint 2 Implementation Report — Map & Trust UI

**Sprint:** M1 Map & Trust  
**Base:** Sprint 1 PASS at `d7d16be`  
**Date:** 2026-06-07

## Verdict: PASS (with operational gates)

All 15 Sprint 2 tasks implemented. Live demo requires linked Supabase seed migration applied and magic-link auth configured.

## Completed Tasks

| ID         | Title                       | Result                                             |
| ---------- | --------------------------- | -------------------------------------------------- |
| FE-001     | Login page magic link       | `/login` + `/auth/callback`                        |
| AUTH-003   | Protected route guard       | Middleware redirects unauthenticated users         |
| FE-002     | Bottom tab navigation       | 5-tab shell on main routes                         |
| FE-007     | TrustBadge + AccessBanner   | Reusable components, 4 variants                    |
| FE-004     | MapClient V1 API            | `useMapPins` → `/api/v1/locations`, 300ms debounce |
| GIS-003    | Pin renderer access × trust | Fill = access, ring = trust                        |
| FE-005     | PinPopup Tier-1             | Trust, material, navigate, open site               |
| FE-006     | Site detail Tier-1          | UUID V1 detail, prohibited Quick Log disabled      |
| GIS-007    | External navigate helper    | `openExternalMaps(fuzzy_location)`                 |
| GIS-004    | Nearest site geofence       | Haversine on Home, 500m geofence                   |
| FE-003     | Home screen MVP             | Field card, nearest site, offline pill, actions    |
| DB-012     | AZ/Oregon seed              | Migration `20260611000000`, 27+ sites/state        |
| TEST-008   | Trust badge E2E             | Vitest unit coverage + manual Playwright gate      |
| TEST-006   | RLS finds isolation         | Policy contract tests + manual gate                |
| DEPLOY-002 | Vercel preview on PR        | `vercel-preview.yml` workflow                      |
| DEPLOY-008 | Retire Worker critical path | Documented in implementation README                |

## Files Changed

### Auth & shell

- `apps/web/app/login/page.tsx`, `layout.tsx`
- `apps/web/app/auth/callback/route.ts`
- `apps/web/middleware.ts`
- `apps/web/components/Navigation/BottomTabNav.tsx`, `MainShell.tsx`
- `apps/web/app/layout.tsx`, `globals.css`

### Trust & access UI

- `apps/web/components/Trust/TrustBadge.tsx`
- `apps/web/components/Access/AccessBanner.tsx`
- `apps/web/lib/trust/types.ts`

### Map stack

- `apps/web/app/map/MapClient.tsx`, `hooks/useMapPins.ts`, `types.ts`, `page.tsx`
- `apps/web/app/map/components/PinPopup.tsx`
- `apps/web/app/map/lib/pinRenderer.ts`

### Site detail & home

- `apps/web/app/location/[id]/page.tsx`, `LocationDetailClient.tsx`
- `apps/web/app/page.tsx`, `HomeClient.tsx`
- `apps/web/app/field/page.tsx`, `trips/page.tsx`, `collection/page.tsx`

### GIS helpers

- `apps/web/lib/gis/openExternalMaps.ts`, `nearestSite.ts`

### Data & deploy

- `supabase/migrations/20260611000000_sprint2_seed_az_oregon.sql`
- `.github/workflows/vercel-preview.yml`
- `docs/implementation/README.md`, `sprints/sprint-02.md`

### Tests

- `apps/web/lib/trust/trust-badge.test.ts`
- `apps/web/app/map/lib/pinRenderer.test.ts`
- `apps/web/app/api/v1/finds/rls-isolation.test.ts`

## Tests Run

```bash
pnpm exec vitest run packages/shared apps/web/lib/trust apps/web/app/api/v1 apps/web/app/map/lib apps/web/app/api/sync
pnpm --filter web type-check
```

## Screens Validated (manual gate)

| Screen                | Check                                              |
| --------------------- | -------------------------------------------------- |
| `/login`              | Email OTP form renders                             |
| `/` (auth)            | Home with offline pill, nearest site card, tab bar |
| `/map`                | Access×trust legend, pins at zoom ≥4               |
| Pin popup             | TrustBadge, AccessBanner, Navigate, Open Site      |
| `/location/2222…2205` | Prohibited banner, Quick Log disabled              |
| `/location/2222…2201` | Official trust badge visible                       |

## Remaining Blockers

1. **Seed migration** — Run `pnpm dlx supabase db push --linked` to apply `20260611000000_sprint2_seed_az_oregon.sql`
2. **Magic link** — Supabase Auth redirect URL must include `{origin}/auth/callback`
3. **DEPLOY-002 live previews** — Requires `VERCEL_TOKEN` + project secrets or Vercel Git link
4. **TEST-008 Playwright** — Full browser E2E deferred; unit tests + manual demo gate documented

## PASS/FAIL

**PASS** — Sprint 2 deliverables complete in codebase. Operational certification pending seed push + auth URL config on linked project `dcbjjvygjhmngwzuwdjj`.

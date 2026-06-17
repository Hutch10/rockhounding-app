# Sprint 4 Preview Deployment

**Branch:** `feat/sprint-4-field-mode`  
**Date:** 2026-06-07  
**Status:** **BLOCKED** (documented)

## Attempt

```bash
vercel link --yes
# Error: Project name invalid — workspace directory "Rockhounding Project" contains spaces
```

Vercel project names must be lowercase alphanumeric with `.`, `_`, `-` only. Auto-link from workspace path fails.

## Resolution steps (Release Engineer)

1. Link manually from repo root:
   ```bash
   vercel link --project rockhounding-web
   ```
2. Set root directory to `apps/web` in Vercel project settings (monorepo).
3. Deploy preview:

   ```bash
   git push -u origin feat/sprint-4-field-mode
   vercel deploy --prebuilt
   ```

   Or GitHub integration deploy on push.

4. Required preview env vars (Vercel dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_SENTRY_DSN` (DEPLOY-004)
   - `NEXT_PUBLIC_SENTRY_RELEASE` = git SHA
   - `NEXT_PUBLIC_SITE_URL` = preview URL

## CB-D2 status

Preview URL **not yet shared** with cohort — blocked on manual Vercel link + env configuration.

**Engineering artifact:** `vercel.json` build command validated locally (`pnpm --filter web build` PASS).

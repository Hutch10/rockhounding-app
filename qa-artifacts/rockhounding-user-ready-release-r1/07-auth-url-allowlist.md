# Owner Auth URL allowlist (Preview + Production prep)

**Project:** Rockhounding v1 `dcbjjvygjhmngwzuwdjj`  
**Dashboard:** Authentication → URL Configuration  
**Date:** 2026-09-28  
**Agent cannot apply these via MCP** — owner-only Dashboard action.

## Required entries

### Site URL (choose one strategy)

**Preview acceptance now:** set Site URL temporarily to the Preview origin under test, **or** keep Production Site URL and ensure redirect allowlist covers Preview (preferred if magic link uses request origin).

App builds `emailRedirectTo` from **browser origin** (`{origin}/auth/callback?...`).

### Redirect URLs allowlist (exact)

Add / keep:

```
https://rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app/auth/callback
https://rockhound-onv1zxquk-hutchs-projects-ef99514e.vercel.app/auth/callback
https://rockhound-web.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

When a new unique Preview deployment URL is used, add its `/auth/callback` **or** rely on the stable git-branch alias above for acceptance.

### Production (when promoting — not now)

```
Site URL: https://rockhound-web.vercel.app
Redirect: https://rockhound-web.vercel.app/auth/callback
```

Also add team Production alias callback if still used:
`https://rockhound-web-hutchs-projects-ef99514e.vercel.app/auth/callback`

## Verify after change

1. Open Preview login
2. Request magic link
3. Confirm network host is `dcbjjvygjhmngwzuwdjj.supabase.co` (not deleted refs)
4. Click link → lands on `/auth/callback` → session

## Non-actions

- Do not pause Rollin projects
- Do not set `E2E_BYPASS_AUTH` on Production
- Do not promote Production deployment as part of this sheet

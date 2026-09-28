# Workstream C — Production env gate (`rockhound-web`)

**Date:** 2026-09-28  
**Vercel project:** `rockhound-web` (`prj_NUekhJuY90sK8wwSZTgPnHFc4o5a`)  
**Team:** `team_NFMipynqoxGTRy9h5Irtb5fQ` (Hutch's projects)  
**Authoritative Supabase:** Rockhounding `dcbjjvygjhmngwzuwdjj`  
**Constraint compliance:** No secret values printed. No Production promote. No Rollin project touched. No env writes applied.

**Verdict:** `PRODUCTION_ENV_CONTRACT_READY` — Production scope has **zero** application env vars (**exact owner-only blocker**). Hard-required Supabase public URL/anon are missing on Production. Change set §6A is ready; agent did not apply Production writes. Preview branch overrides for `feat/sprint-4-field-mode` correctly target `dcbjjvygjhmngwzuwdjj.supabase.co`.

## **SECURITY_GATE mapping:** PASS with owner-only blocker identified (empty Production + §6A/§5 Auth URLs). Not a promote.

## 1. Vercel `env ls` inventory (names only)

Source: `vercel env ls` on linked `apps/web` → `rockhound-web`. All listed values are **Encrypted**.

| Name                             | Scopes observed                                   | Notes                                                |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `SUPABASE_ANON_KEY`              | Preview (`feat/sprint-4-field-mode`) only         | Not Development, not Production, not general Preview |
| `SUPABASE_URL`                   | Preview (`feat/sprint-4-field-mode`) only         | Same                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Preview (`feat/sprint-4-field-mode`) only         | Same                                                 |
| `NEXT_PUBLIC_SUPABASE_URL`       | Preview (`feat/sprint-4-field-mode`) only         | Same                                                 |
| `NEXT_PUBLIC_SITE_URL`           | Preview (`feat/sprint-4-field-mode`); Development | **No Production**                                    |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Preview (`feat/sprint-4-field-mode`) only         | Tag only; no DSN                                     |
| `SENTRY_ENVIRONMENT`             | Preview (`feat/sprint-4-field-mode`) only         | Tag only                                             |
| `NEXT_PUBLIC_SENTRY_RELEASE`     | Preview (`feat/sprint-4-field-mode`) only         | Tag only                                             |
| `SENTRY_RELEASE`                 | Preview (`feat/sprint-4-field-mode`) only         | Tag only                                             |

**Production application vars:** none.  
`vercel env pull --environment production` returned only platform injects (`VERCEL_*`, `TURBO_*`, `NX_DAEMON`) — no `NEXT_PUBLIC_*` / `SUPABASE_*` / `SENTRY_*` / Mapbox / admin keys.

**Preview caveat:** General Preview (no branch) also has **no** app Supabase vars. Only the `feat/sprint-4-field-mode` branch override set does.

**Domains (Production surface):** `rockhound-web.vercel.app` (verified). Latest production URL reported by CLI: `https://rockhound-web-hutchs-projects-ef99514e.vercel.app`.

---

## 2. Code-required env contract (production web)

Authority: `apps/web/lib/env.ts`, middleware, Supabase clients, Sentry configs, MapClient, admin routes, API client.

### Hard-required (Production web will fail or be non-functional without)

| Name                            | Where            | Why                                                                 |
| ------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser + server | `env.ts` requiredClientEnvVars; clients; middleware / auth callback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Same                                                                |

`env.ts` calls `process.exit(1)` on missing required client vars when `NODE_ENV === 'production'`.

### Strongly recommended / middleware dual-read (server fallbacks)

| Name                   | Where            | Why                                                                                        |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`         | Server           | Middleware + `/auth/callback` fallback if `NEXT_PUBLIC_*` absent                           |
| `SUPABASE_ANON_KEY`    | Server           | Same                                                                                       |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Canonical/OG/auth origin fallback (`location/[id]/page.tsx`); should match Production host |

### Optional (feature degrade, not hard fail)

| Name                                                    | Where                   | Behavior if absent                                                       |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                              | Browser                 | Map fallback UI; if set, must start with `pk.`                           |
| `NEXT_PUBLIC_SENTRY_DSN`                                | Browser + server + edge | Sentry disabled (`enabled: Boolean(dsn)`)                                |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` / `SENTRY_ENVIRONMENT` | Client / server         | Falls back to `VERCEL_ENV`                                               |
| `NEXT_PUBLIC_SENTRY_RELEASE` / `SENTRY_RELEASE`         | Client / server         | Falls back to git SHA                                                    |
| `SENTRY_AUTH_TOKEN`                                     | Build                   | Source maps upload disabled if unset (`next.config.js`)                  |
| `SUPABASE_SERVICE_ROLE_KEY`                             | Server only             | Optional in `env.ts`; privileged routes only — **never** `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_API_URL`                                   | Browser                 | Optional; defaults by `VERCEL_ENV` / local                               |
| `ADMIN_API_KEY`                                         | Server                  | Admin moderate API disabled if unset                                     |
| `EXPORTS_BUCKET` / `STATE_PACKS_BUCKET`                 | Server                  | Defaults `exports` / `state-packs`                                       |
| `E2E_BYPASS_AUTH`                                       | Server                  | Must **not** be `1` on Production                                        |

### Code fallback hazard

`apps/web/lib/supabase/client.ts` and `server.ts` fall back to `https://placeholder.supabase.co` / `placeholder-anon-key` if public vars empty. **Unacceptable for Production acceptance.**

---

## 3. Required-var matrix vs Vercel scopes

Host check (branch Preview pull, hostname only — no keys):  
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` → **`dcbjjvygjhmngwzuwdjj.supabase.co`**  
`NEXT_PUBLIC_SITE_URL` → `rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app`

| Name                                            | Browser/Server | Required?                           | Present Preview?                             | Present Production?      | Safe replicate from Rockhounding (`dcbjjvygjhmngwzuwdjj`)?                    | Rotation needed?                         |
| ----------------------------------------------- | -------------- | ----------------------------------- | -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                      | Both           | **Required**                        | Yes (branch `feat/sprint-4-field-mode` only) | **No**                   | **Yes** — public project URL                                                  | No (unless wrong ref)                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 | Both           | **Required**                        | Yes (branch only)                            | **No**                   | **Yes** — Dashboard API → anon/`public` only                                  | No unless leaked; never use service_role |
| `SUPABASE_URL`                                  | Server         | Recommended                         | Yes (branch only)                            | **No**                   | **Yes** — same URL                                                            | No                                       |
| `SUPABASE_ANON_KEY`                             | Server         | Recommended                         | Yes (branch only)                            | **No**                   | **Yes** — same anon                                                           | Same as anon                             |
| `NEXT_PUBLIC_SITE_URL`                          | Both           | Recommended for prod auth/canonical | Yes (branch; preview host)                   | **No** (Dev has a value) | N/A — set to **Production** host, not Preview                                 | N/A                                      |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                      | Browser        | Optional                            | **No**                                       | **No**                   | No — Mapbox account token, not Supabase                                       | Rotate if exposed                        |
| `NEXT_PUBLIC_SENTRY_DSN`                        | Both           | Optional                            | **No**                                       | **No**                   | No — Sentry project DSN                                                       | Rotate if exposed                        |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT`                | Browser        | Optional                            | Yes (branch)                                 | **No**                   | N/A — set `production`                                                        | No                                       |
| `SENTRY_ENVIRONMENT`                            | Server         | Optional                            | Yes (branch)                                 | **No**                   | N/A — set `production`                                                        | No                                       |
| `NEXT_PUBLIC_SENTRY_RELEASE` / `SENTRY_RELEASE` | Both           | Optional                            | Yes (branch)                                 | **No**                   | Prefer commit SHA / omit                                                      | No                                       |
| `SUPABASE_SERVICE_ROLE_KEY`                     | Server         | Optional                            | **No** on `rockhound-web`                    | **No**                   | **Owner-only** from Rockhounding service_role; do not auto-copy; never public | Yes if ever exposed                      |
| `NEXT_PUBLIC_API_URL`                           | Browser        | Optional                            | **No**                                       | **No**                   | N/A                                                                           | No                                       |
| `ADMIN_API_KEY`                                 | Server         | Optional                            | **No**                                       | **No**                   | No — generate new; do not reuse from other products                           | Yes if exposed                           |
| `SENTRY_AUTH_TOKEN`                             | Build          | Optional                            | **No**                                       | **No**                   | No                                                                            | Yes if exposed                           |
| `E2E_BYPASS_AUTH`                               | Server         | Must be unset/`0`                   | Not listed                                   | Not listed               | Must not set on Production                                                    | N/A                                      |

---

## 4. Stale / wrong ref flags

| Ref / pattern                  | Status                                                                                   | Action                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `dcbjjvygjhmngwzuwdjj`         | **Authoritative target** for this workstream; Preview branch hosts match                 | Use for Production URL + anon                                                         |
| `vulsndadskalrmcgfyjm`         | Documented **deleted** (META-003A); **not** observed on current branch Preview host pull | Do **not** put on Production                                                          |
| `placeholder.supabase.co`      | Code/CI fallback only                                                                    | Do **not** configure as Production value                                              |
| `hszoybzhslltwfksuokt`         | Historical non-authoritative / not found                                                 | Ignore                                                                                |
| Rollin / other Vercel projects | Out of scope                                                                             | Do **not** read or copy env from Rollin projects                                      |
| Sibling `rockhounding-web`     | Separate Vercel project; may hold overlapping secrets                                    | Prefer **Supabase Rockhounding dashboard** as source for URL+anon; do not pull Rollin |

**Auth backend health (context only):** prior certification noted `dcbjjvygjhmngwzuwdjj` can be paused / NXDOMAIN when inactive. Production env config does not unpause or prove health — owner must confirm `ACTIVE_HEALTHY` before acceptance.

---

## 5. Site URL / auth callback / redirect allowlist (plan only — not applied)

**App behavior**

- Magic link: `emailRedirectTo = {origin}/auth/callback?redirect=…` (`LoginForm.tsx`)
- Callback route: `/auth/callback` uses `NEXT_PUBLIC_SUPABASE_*` with `SUPABASE_*` fallback
- Local `supabase/config.toml` additional_redirect_urls cover localhost + Preview wildcards only — **no Production host yet**

**Owner plan for Production (Supabase Dashboard → Auth → URL configuration on `dcbjjvygjhmngwzuwdjj`)**

1. Set **Site URL** to the canonical Production origin, e.g. `https://rockhound-web.vercel.app` (or custom domain once attached).
2. Add redirect allowlist entries (exact):
   - `https://rockhound-web.vercel.app/auth/callback`
   - `https://rockhound-web-hutchs-projects-ef99514e.vercel.app/auth/callback` (if that host remains the production alias)
3. Keep existing Preview/local entries as needed; do not remove Preview allowlist until Preview is retired.
4. Align Vercel `NEXT_PUBLIC_SITE_URL` (Production) with the same Site URL origin.
5. Do **not** enable `E2E_BYPASS_AUTH` on Production.
6. Confirm Deployment Protection / SSO policy separately (out of env-var scope).

---

## 6. Owner/agent change set — configure Production (NOT APPLIED)

Production is empty → minimum safe set from **Rockhounding Supabase only** (URL + anon). Prefer documenting; apply only with owner approval and without printing secrets.

### A. Minimum required (unblock `env.ts` + auth clients)

| #   | Action                              | Target                         | Value source                                                    | Method (owner)                                                                   |
| --- | ----------------------------------- | ------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Add `NEXT_PUBLIC_SUPABASE_URL`      | Production                     | `https://dcbjjvygjhmngwzuwdjj.supabase.co`                      | `vercel env add NEXT_PUBLIC_SUPABASE_URL production` (paste URL; no decrypt log) |
| 2   | Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production                     | Rockhounding Dashboard → Settings → API → **anon public**       | `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production`                        |
| 3   | Add `SUPABASE_URL`                  | Production                     | Same URL as #1                                                  | `vercel env add SUPABASE_URL production`                                         |
| 4   | Add `SUPABASE_ANON_KEY`             | Production                     | Same anon as #2                                                 | `vercel env add SUPABASE_ANON_KEY production`                                    |
| 5   | Add `NEXT_PUBLIC_SITE_URL`          | Production                     | Canonical prod origin (e.g. `https://rockhound-web.vercel.app`) | `vercel env add NEXT_PUBLIC_SITE_URL production`                                 |
| 6   | Supabase Auth URLs                  | Project `dcbjjvygjhmngwzuwdjj` | Site URL + `/auth/callback` allowlist (§5)                      | Dashboard only                                                                   |

### B. Optional follow-ups (not blocking env.ts)

| #   | Action                                 | Notes                                                                                                                             |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 7   | `NEXT_PUBLIC_MAPBOX_TOKEN` Production  | Owner Mapbox `pk.*`; omit → map fallback                                                                                          |
| 8   | `NEXT_PUBLIC_SENTRY_DSN` (+ env tags)  | Optional observability                                                                                                            |
| 9   | `SUPABASE_SERVICE_ROLE_KEY` Production | Only if privileged server routes needed; owner paste from Rockhounding **service_role**; never Preview-log; never `NEXT_PUBLIC_*` |
| 10  | `ADMIN_API_KEY`                        | Only if admin moderate enabled                                                                                                    |

### C. Explicit non-actions

- Do **not** promote a deployment / assign Production alias as part of this gate.
- Do **not** copy env from Rollin projects.
- Do **not** use `vulsndadskalrmcgfyjm` or `placeholder.supabase.co`.
- Do **not** set `E2E_BYPASS_AUTH=1` on Production.
- Replicate URL+anon from Rockhounding dashboard (or from already-verified branch Preview values **without** echoing keys). Prefer dashboard for Production so values are intentional.

### D. Verification after owner applies (still no promote required for env gate)

```text
vercel env ls   # expect Production rows for names in §6A
vercel env pull --environment production --yes   # then assert HOST only for SUPABASE_URL == dcbjjvygjhmngwzuwdjj.supabase.co; delete local file
```

Redeploy/rebuild needed for `NEXT_PUBLIC_*` to bake into client bundles — schedule separately; this artifact does not trigger it.

---

## Gate summary

| Check                                        | Result                            |
| -------------------------------------------- | --------------------------------- |
| Production app env populated?                | **FAIL** (empty)                  |
| Required Supabase public vars on Production? | **FAIL**                          |
| Preview branch points at Rockhounding ref?   | **PASS** (`dcbjjvygjhmngwzuwdjj`) |
| Stale deleted ref on current branch Preview? | **Not observed**                  |
| Auth URL plan documented?                    | **PASS** (plan only)              |
| Change set ready without applying?           | **PASS** (§6)                     |

**Classification:** `ROCKHOUNDING_PRODUCTION_ENV_OWNER_BLOCKER` — owner must apply §6A (+ §5 Auth URLs) before Production can serve authenticated web. Contract + change set are ready; no promote performed.

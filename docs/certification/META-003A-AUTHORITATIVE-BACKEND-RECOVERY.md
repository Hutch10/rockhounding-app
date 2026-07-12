# META-003A Authoritative Backend Recovery

## 1. Executive Decision

**Primary decision token:** `AUTHORITATIVE_BACKEND_NOT_PROVEN`

**Summary:** The authoritative backend cannot be proven. None of the known project references (`vulsndadskalrmcgfyjm`, `hszoybzhslltwfksuokt`, `dcbjjvygjhmngwzuwdjj`) meet the proof standard for the durable Rockhound application backend. `vulsndadskalrmcgfyjm` has been deleted, `hszoybzhslltwfksuokt` does not exist in the repository or cannot be accessed, and `dcbjjvygjhmngwzuwdjj` is explicitly documented as a disposable certification environment.

**Confidence:** High. The documentary evidence directly contradicts any of the available projects being the durable production backend.

## 2. Credential Exposure Containment

A search of the repository and environment variables was performed to contain credential exposure.

| File Path / Location                        | Category                 | Tracked | Fingerprint              | Recommended Remediation                                                                                  |
| ------------------------------------------- | ------------------------ | ------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `docs/CLOUDFLARE_DEPLOYMENT_GUIDE.md`, etc. | Dummy URL                | Yes     | `http...se.co`           | None (Example templates)                                                                                 |
| `.env.local`                                | Supabase Anon Key        | No      | `sb_p...cX9k`            | Safe for public exposure                                                                                 |
| `.env.local`                                | Supabase URL             | No      | `http...yjm.supabase.co` | Safe for public exposure                                                                                 |
| Vercel Preview Env                          | Supabase Anon Key        | Remote  | N/A                      | Safe for public exposure                                                                                 |
| Vercel Preview Env                          | Supabase URL             | Remote  | N/A                      | Safe for public exposure                                                                                 |
| Previous session logs                       | Vercel bypass credential | N/A     | N/A                      | **MANDATORY OPERATOR ACTION:** Revoke or regenerate the exposed Vercel bypass credential through Vercel. |

- Note: No service-role keys, database passwords, or Mapbox tokens were found exposed in the tracked files. `next-pwa` generated files were restored to clean the working tree.

## 3. Backend Evidence Matrix

| Project ref            | Current status            | First evidence                           | Most recent evidence         | Environment scopes | Historical role                  | Data-purpose evidence                                          | Contradictions                              | Confidence               |
| ---------------------- | ------------------------- | ---------------------------------------- | ---------------------------- | ------------------ | -------------------------------- | -------------------------------------------------------------- | ------------------------------------------- | ------------------------ |
| `vulsndadskalrmcgfyjm` | Resource has been removed | `.env.local`                             | Vercel Preview               | Local, Preview     | Unknown                          | Used as recent SUPABASE_URL in Vercel                          | Deleted                                     | High (Deleted)           |
| `hszoybzhslltwfksuokt` | Not Found / Auth failure  | N/A                                      | N/A                          | None               | Unknown                          | None                                                           | None                                        | High (Not Authoritative) |
| `dcbjjvygjhmngwzuwdjj` | Paused                    | `certification-sprint-01-operational.md` | `supabase/.temp/project-ref` | Local temp         | Disposable certification backend | "Confirmed disposable dev project", "Reset linked dev project" | Linked locally but documented as disposable | High (Disposable)        |

## 4. Environment-Variable Inventory

**Local Development (`.env.local`)**

- `GROQ_API_KEY`: Present (Server-only)
- `SUPABASE_ANON_KEY`: Present (Public-client safe)
- `SUPABASE_URL`: Present (Public-client safe)
- `VERCEL_OIDC_TOKEN`: Present (Server-only)

**Vercel Preview (Metadata)**

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Present (Public-client safe)
- `SUPABASE_ANON_KEY`: Present (Public-client safe)
- `NEXT_PUBLIC_SUPABASE_URL`: Present (Public-client safe)
- `SUPABASE_URL`: Present (Public-client safe)
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`: Present (Public-client safe)
- `SENTRY_ENVIRONMENT`: Present (Server-only)
- `NEXT_PUBLIC_SENTRY_RELEASE`: Present (Public-client safe)
- `SENTRY_RELEASE`: Present (Server-only)
- `NEXT_PUBLIC_MAPBOX_TOKEN`: **Absent**

**Vercel Production (Metadata)**

- No environment variables found.

**Test / Certification Environments**

- `.env.development.temp`: Present (Contains `NEXT_PUBLIC_SITE_URL` and `VERCEL_OIDC_TOKEN`)

## 5. Disposable-Project Classification

Project `dcbjjvygjhmngwzuwdjj` is explicitly classified as a **disposable certification backend**.
Evidence from `docs/implementation/certification-sprint-01-operational.md` explicitly lists it as:

> `Confirmed disposable dev project (dcbjjvygjhmngwzuwdjj)`

It was used for "Sprint 2 deliverables complete in codebase. Operational certification pending seed push + auth URL config". Its prior purpose disqualifies it from closed-beta authoritative use. It must not be promoted.

## 6. Validation Results (Lint / Typecheck / Test / Build)

| Task      | Exit Code | Result Summary                                                     |
| --------- | --------- | ------------------------------------------------------------------ |
| Lint      | 1         | 311 problems (291 errors, 20 warnings). P2 inherited quality debt. |
| Typecheck | 0         | Passed.                                                            |
| Tests     | 1         | 292 passed, 2 failed in `packages/shared`. P1 beta blockers.       |
| Web Build | 0         | Passed.                                                            |

- The lint errors primarily consist of `@typescript-eslint/strict-boolean-expressions` and `@typescript-eslint/no-unnecessary-condition` inherited debt.
- The test failures (`src/collection-analytics-schema.test.ts` and `src/telemetry.test.ts`) require fixes before beta.

## 7. Working-Tree Hygiene Status

- Temporary `.env` files (`.env.development.temp`, `.env.preview`, `.env.preview.temp`, `.env.production.temp`) were successfully removed from the working tree.
- `.gitignore` was updated to safely exclude `.env.*temp` and `.env.preview`.
- Generated service worker files were restored to clean the working tree.
- The working tree is currently **clean**. No secret-bearing files are tracked or staged.

## 8. Exact Unresolved Operator Actions

1. **Vercel Bypass Revocation**: The exposed Vercel bypass credential MUST be revoked or regenerated through the Vercel dashboard.
2. **Authoritative Backend Provisioning**: A new authoritative Supabase project must be provided or restored, as all existing references are deleted, inaccessible, or disposable.
3. **Mapbox Token**: A valid Mapbox token must be provided and configured.

## 9. Explicit Prohibited Next Steps

- DO NOT align environments until an authoritative backend is established.
- DO NOT unpause `dcbjjvygjhmngwzuwdjj` or promote it to authoritative status.
- DO NOT deploy or attempt E2E login verification.

## 10. Recommended Next Phase

The recommended next phase is **META-003B: Authoritative Backend Provisioning & Test Remediation**. This phase should involve the operator provisioning the actual production/closed-beta backend, syncing its credentials to Vercel, and fixing the 2 P1 failing tests in `packages/shared`.

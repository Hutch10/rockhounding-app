# Workstream E — Owner-browser acceptance retest

**Status:** READY_FOR_OWNER — Preview tip matches origin.  
**Date prepared:** 2026-09-28 (resumed)

## Exact deployment under test

| Field                         | Value                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Vercel project                | `rockhound-web`                                                                                                                 |
| Git SHA                       | Confirm at retest start: `git rev-parse --short origin/feat/sprint-4-field-mode` must match Vercel deployment `githubCommitSha` |
| Known READY tip (this resume) | `cf8d6e2` / `dpl_H2NSgAQ4wew6Rw1pqh2qfA47YtSX`                                                                                  |
| **Preferred acceptance URL**  | https://rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app                                              |
| Unique deployment URL         | https://rockhound-onv1zxquk-hutchs-projects-ef99514e.vercel.app                                                                 |
| Supabase                      | `dcbjjvygjhmngwzuwdjj` — confirm `ACTIVE_HEALTHY`                                                                               |
| Auth allowlist                | Follow `07-auth-url-allowlist.md` before magic-link retest                                                                      |

## Launch-data caveat (read before acceptance)

- TRUST pack: **12** release-ready OPRD sites in `04-trust-sites.json` (artifact only).
- Runtime discovery: **Option B** — OPRD pack **not** ingested; sprint2 synthetic AZ/OR seed may still appear on map. Treat pins as **non-authoritative demo** until `06-launch-data-activation.md` blockers clear.
- Do **not** score TRUST UI against synthetic seed as legal truth.

## Retest checklist (owner browser)

- [ ] Magic link request succeeds (no Failed to fetch / wrong host)
- [ ] Session established after callback
- [ ] Protected route reachable while signed in
- [ ] Field Mode shell loads
- [ ] High-Glare outdoor mode readable + persists
- [ ] Permission Summary visible / fail-closed language intact
- [ ] Trust UI does not treat synthetic seed as legal truth
- [ ] Quick Log open / queue path
- [ ] Offline → reconnect → sync (or pending visible)
- [ ] Collection list loads
- [ ] Specimen/find detail if available
- [ ] Logout clears session
- [ ] Route gating blocks protected routes after logout

## Explicit non-goals

- Not production promotion
- Not final ACCEPTANCE PASS until this sheet is executed on tip SHA matching origin
- Not launch-data activation (see `06-launch-data-activation.md`)
- Auth setup: `07-auth-url-allowlist.md`

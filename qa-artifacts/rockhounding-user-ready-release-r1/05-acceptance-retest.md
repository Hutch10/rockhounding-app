# Workstream E — Owner-browser acceptance retest

**Status:** READY_FOR_OWNER — Preview tip matches origin.  
**Date prepared:** 2026-09-28

## Exact deployment under test

| Field                | Value                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Vercel project       | `rockhound-web`                                                                                 |
| Git SHA              | `e9dc638839a04cbc97a00a92978ace9ddf2897f6` (`e9dc638`)                                          |
| Branch               | `feat/sprint-4-field-mode`                                                                      |
| Deployment           | `dpl_8H7VHPTiohGT6TTzf6WUbMf8vv3x` **READY**                                                    |
| Preview URL          | https://rockhound-j42q1g8ko-hutchs-projects-ef99514e.vercel.app                                 |
| Stable Preview alias | https://rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app              |
| Supabase             | `dcbjjvygjhmngwzuwdjj` (Rockhounding v1) — confirm `ACTIVE_HEALTHY`                             |
| Auth                 | Site URL + `/auth/callback` allowlist must include this Preview origin before magic-link retest |

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
- Not final ACCEPTANCE PASS until this sheet is executed on SHA `e9dc638`
- Not launch-data activation (see `06-launch-data-activation.md`)

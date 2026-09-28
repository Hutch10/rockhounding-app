# Workstream E — Owner-browser acceptance retest (prep only)

**Status:** READY_WHEN_DEPLOYED — do **not** run final acceptance against a stale preview.  
**Date prepared:** 2026-09-28  
**Prerequisite:** TRUST + FIELD + SECURITY gates PASS on the exact release-candidate deployment SHA.

## Exact deployment under test (fill at retest time)

| Field                              | Value                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| Vercel project                     | `rockhound-web`                                                   |
| Git SHA                            | _TBD — tip after push/coordinator approve_                        |
| Preview or candidate URL           | _TBD_                                                             |
| Supabase project                   | `dcbjjvygjhmngwzuwdjj` (Rockhounding v1) must be `ACTIVE_HEALTHY` |
| Auth Site URL / redirect allowlist | Must include this deployment origin + `/auth/callback`            |

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

## Explicit non-goals for this sheet

- Not production promotion
- Not final ACCEPTANCE PASS until executed on the named SHA URL above

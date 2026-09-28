# Release closure evidence summary (coordinator)

## Identity

- Branch: `feat/sprint-4-field-mode`
- Release-candidate tip (local): `97da640` (**ahead 2** of `origin`; not pushed / not redeployed)
- Prior preview baseline: `25b82ba` → https://rockhound-mzzbgdmp8-hutchs-projects-ef99514e.vercel.app (`dpl_9H53Ta8Ux53uKacY5NK3UEf9Re5h`)
- Unrelated dirty paths preserved (sw/workbox, .gitignore, shared index, other qa packs, migrations)

## Machine gates (closure tip)

- test:ci: 882 passed / 76 files (artifact `test-ci.txt`; not re-run on `97da640`)
- type-check: PASS
- build: PASS (`build.txt` / post-UX run)
- Playwright:
  - `playwright-field-resilience.txt`: **12/12**
  - `playwright-baseline.txt`: offline-sync + collection **5/5**
  - `playwright.txt`: prior field-mode/high-glare/collection closure **9/9** at `25b82ba`

## Trust / launch data (fail-closed)

### Repo + synthetic seed (not production truth)

Source: `supabase/migrations/20260611000000_sprint2_seed_az_oregon.sql`

- Demo seed only; **0** release-ready for legal authority in DB
- Repo-only research: no curated launch rows in code ([Real launch region research](ed406e0d-f695-4af7-8cda-2bff4d75ed61))
- BLM narrow-region research: **cannot** reach ≥10 official named sites in one corridor ([BLM launch region public sources](4846d27a-8dd5-435a-9677-be349b644ba7))

### Evidence-backed launch pack (artifact — not ingested to Supabase)

- [TRUST real launch pack](9d208f7b-b2b4-4b0b-b777-1eb30c6bc78f): `04-trust-launch-pack.md`, `04-trust-sites.json`
- Geography: Oregon Central Coast OPRD ocean shore (Lincoln County corridor)
- Counts: **release-ready 12**; unresolved **1**; conflicted **0**; stale **0**; closed/prohibited catalogued **3**
- Synthetic AZ/OR seed **not** used as truth; app map may still show demo seed until a separate ingest phase

## Security / Production

- [Production env security audit](33d04301-89e4-4be4-8732-3aaae54db522): `03-production-env.md`
- `rockhound-web` Production app env **empty**; Preview branch `feat/sprint-4-field-mode` → `dcbjjvygjhmngwzuwdjj`
- Owner-only: apply §6A Production vars + Supabase Auth Site URL / callback allowlist (no agent apply, no promote)

## Acceptance

- Owner-browser on **release-candidate deployment SHA**: **PENDING** — use `05-acceptance-retest.md` after push + preview redeploy
- Prior preview (`25b82ba`): OTP path to Rockhounding `/auth/v1/otp` documented; UX fixes on tip only until redeploy

## Board

- Gate status: `02-gate-status.md` → `ROCKHOUNDING_USER_READY_RELEASE_CANDIDATE` (ACCEPTANCE + PRODUCTION remain blocked)

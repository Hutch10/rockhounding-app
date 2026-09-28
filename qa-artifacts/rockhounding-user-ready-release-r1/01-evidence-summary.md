# Release closure evidence summary (coordinator)

## Identity

- Branch: feat/sprint-4-field-mode
- SHA: 25b82ba889ba4673e880a17ca2b1b250d2470c21 (== origin)
- Preview: https://rockhound-mzzbgdmp8-hutchs-projects-ef99514e.vercel.app
- Deployment: dpl_9H53Ta8Ux53uKacY5NK3UEf9Re5h READY
- Unrelated dirty paths preserved (LoginForm, sw/workbox, .gitignore, shared index, qa packs, migrations)

## Machine gates (this closure run)

- test:ci: 882 passed / 76 files
- type-check: PASS
- build: PASS (after .next clean; prior flake PageNotFoundError /\_document)
- Playwright: see playwright.txt

## Trust/legal launch data (fail-closed)

Source: supabase/migrations/20260611000000_sprint2_seed_az_oregon.sql

- Synthetic demo seed: 10 showcase + 22 AZ + 22 OR ≈ 54 rows
- Has access_status / trust_category / freshness_status labels
- Missing for release-ready legal claims: source URL/reference, collecting authority distinct from access, Visit/Collect/Route states, conflict state, provenance chain
- Must NOT treat seed as production collecting permission
- Counts for **production legal authority**:
  - verified release-ready: **0**
  - permit-required: **0** (not modeled as distinct launch class)
  - managed/pay: **0** (OR Richardson Ranch is fee-dig narrative only — not verified authority record)
  - permission-required: **0**
  - closed/prohibited (demo labels only, not certified legal): showcase 2 NP rows + cycle `restricted` in bulk — **not counted as release-ready closed set**
  - unresolved/conflicted: **all seed sites unresolved for collecting authority** → fail-closed UNKNOWN

## Acceptance

Owner-browser on corrected preview: **PENDING** (do not fabricate).
Machine: OTP reaches Rockhounding /auth/v1/otp; collection/sync fixes on tip; High-Glare/Permission Summary/TrustBadge present in code.

## Checklist path

qa-artifacts/rockhounding-user-ready-release-r1/00-release-checklist.md

# Launch-data activation — Option B (honest-empty / owner blocker)

**Date:** 2026-09-28  
**Decision:** **B — do not activate runtime discovery from the OPRD artifact pack without owner-governed ingest**  
**Runtime discovery state:** **synthetic demo seed remains in DB**; **12-site OPRD pack remains artifact-only** (`04-trust-sites.json`). Not treated as production legal truth.

## Why not Option A (wire now)

1. **Production ingestion is CLOSED** (`docs/FIELD_PLATFORM_COORDINATOR.md`). There is no authorized live ingest path that promotes curated recreation sites into `locations` for ordinary discovery.
2. **Governed path that exists** is `locations_staging` → admin moderation → promote (`scripts/ingest/README.md`, Build Doc Rule #6). Staging seed scripts are **demo/test** content (`seed_staging_locations.ts`), not an OPRD evidence loader, and still require:
   - mapping trust-pack fields → `legal_tag`, `legal_confidence`, `source_tier`, `primary_ruleset_id`, Visit/Collect/Route columns the app actually reads
   - admin approval identity
   - explicit decision that collecting `ALLOWED_LIMITED` may be stored as `access_status` without collapsing permission semantics
3. **Sprint2 AZ/OR seed** (`supabase/migrations/20260611000000_sprint2_seed_az_oregon.sql`) already populates `locations` for Preview. Replacing or filtering it is a **schema/product decision** (filter flag, delete migration, or discovery query gate) — out of scope for this handoff without inventing UI/features or weakening fail-closed.
4. Transforming OPRD/OAR evidence into `access_status` / trust rings **risks inventing or compressing legal claims** if done without an approved mapper + moderation receipt.

## Exact owner activation blockers

| #   | Blocker                                                                           | Owner action                                                                                                                   |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Authorize Preview/staging ingest of `04-trust-sites.json` (release-ready 12 only) | Written approval that this is an allowed non-production ingest exception or opens a governed ingest phase                      |
| 2   | Approve field mapping                                                             | Visit/Collect/Route/provenance → `locations` / staging columns without elevating geology or parking into collecting permission |
| 3   | Provide admin moderation actor                                                    | Approve staging rows → promote to `locations` (or signed migration)                                                            |
| 4   | Decide synthetic seed fate                                                        | Hide/delete/relabel sprint2 AZ/OR demo so it is **not** shown as real; until then discovery is **not** honest-empty            |
| 5   | Redeploy after data change                                                        | Confirm Preview SHA still matches tip after any data-only change                                                               |

## Honest runtime statement (current)

- **TRUST evidence:** PASS in artifacts (12 release-ready OPRD sites).
- **Runtime map/discovery:** may still show **synthetic** AZ/OR demo rows — **not** the OPRD pack.
- **Fail-closed product posture for acceptance:** treat map pins as **non-authoritative demo** until blockers 1–4 clear; Field Permission Summary already separates recorded access from collecting verdict.

## Non-actions this handoff

- No SQL ingest of OPRD sites
- No deletion of synthetic seed
- No new discovery filter feature
- No inventing visit/collect states beyond the artifact pack
- No production promotion

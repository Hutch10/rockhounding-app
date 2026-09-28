# 04 — TRUST launch pack (evidence-backed sites)

**Retrieved:** 2026-09-28  
**Gate:** `TRUST_PASS`  
**Geography chosen:** Oregon Central Coast ocean shore (Lincoln County corridor: Newport–Waldport–Yachats, plus Fogarty Creek) under OPRD Ocean Shore State Recreation Area rules.

## Methodology

1. **Fail closed.** State model only: `VERIFIED`, `SUPPORTED`, `REPORTED`, `UNRESOLVED`, `CONFLICTED`, `STALE`, `PROHIBITED`. Certainty is independent of confidence. `PROHIBITED` is a **permission** value, not a certainty value.
2. **No invention.** Coordinates only from official OPRD park records (`park_latitude` / `park_longitude`). Missing timestamps left `null`. Synthetic AZ/OR seed (`supabase/migrations/20260611000000_sprint2_seed_az_oregon.sql`) is **not** production truth and was not used.
3. **Accessibility ≠ authorization; geological promise ≠ collection permission.** Visit OPEN does not imply collecting. Park marketing that mentions agates does not override Marine Reserve OARs.
4. **retrievedAt ≠ sourceUpdatedAt.** Retrieval date is 2026-09-28. Source update dates recorded only when the page/rule provided them.
5. **Zero-result ≠ confirmed absence.** Mining-claim absence was not asserted for these ocean-shore sites.
6. **Prefer named recreation sites with published rules** over vague map pins.
7. **Schema alignment.** No dedicated launch-site Zod schema was found for this pack; field groups follow Decision Evidence contract classes (site access, collection permission, closure, geology) and UGES permission/certainty separation in `docs/FIELD_PLATFORM_COORDINATOR.md` / `packages/shared` decision-evidence contracts.

## Geography choice (why Oregon Central Coast, not Arizona BLM)

| Candidate                       | Official named collecting sites with visit pages                                                                                           | Statewide collecting rule         | Verdict                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------- |
| Arizona BLM desert (Safford FO) | **2** designated rockhound areas (Black Hills, Round Mountain) on [BLM rockhounding](https://www.blm.gov/programs/recreation/rockhounding) | AZ BLM brochure + 43 CFR 8365.1-5 | Workable rules, **too few** named sites for ≥10 release-ready without inventing informal pins |
| Oregon BLM high desert          | Sunstone Collection Area (+ Glass Buttes guidance)                                                                                         | OR/WA rock collecting guide       | Too few named official recreation pages                                                       |
| **Oregon Central Coast OPRD**   | Many named State Parks / SRS with coordinates                                                                                              | **OAR 736-021-0090** (in force)   | **Chosen** — coherent jurisdiction, checkable MR/plover overlays                              |

Arizona BLM Black Hills remains a strong future inland expansion candidate (official coords `32.87397, -109.39496` on [BLM visit page](https://www.blm.gov/visit/black-hills-rockhound-area)) but is **out of geography** for this launch pack.

## Counts

| Bucket              |  Count | Notes                                                                                                                                      |
| ------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **release-ready**   | **12** | Visit known, admin OPRD, collect ALLOWED_LIMITED under OAR 736-021-0090, outside MR shoreline prohibition                                  |
| permit-required     |      0 | Casual souvenir collecting within gallon limits needs no permit; special-use exists for over-limit (system rule, not site bucket)          |
| managed/pay         |      6 | Day-use parking permit required on official page (Agate Beach, Beverly Beach, South Beach, Brian Booth, Governor Patterson, Fogarty Creek) |
| permission-required |      0 | Public Ocean Shore State Recreation Area                                                                                                   |
| closed/prohibited   |      3 | Collecting PROHIBITED under OAR 736-029-0040 (MR/MPA ocean shore): Devils Punchbowl, Otter Crest, Neptune                                  |
| unresolved          |      1 | Boiler Bay — rocky limited-take / Marine Garden context; souvenir-rock status not cleared                                                  |
| conflicted          |      0 | FAQ vs OAR at MR sites resolved fail-closed to PROHIBITED (counted as closed/prohibited, not conflicted)                                   |
| stale               |      0 |                                                                                                                                            |

**Catalogued total:** 16 sites in `04-trust-sites.json`.

## Collecting rule (authoritative)

[OAR 736-021-0090](https://secure.sos.state.or.us/oard/view.action?ruleNumber=736-021-0090) (amend effective 2024-02-28):

- Digging/removing rock materials is generally prohibited except as allowed.
- Personal-use souvenirs: loose agates and other non-living items **≤ 1 gallon/person/day**, **≤ 3 gallons/person/year**, individual containers, non-commercial.
- Over-limit → special-use permit.
- Western snowy plover dry-sand seasonal restrictions (Mar 15–Sep 15) where posted; wet-sand walking generally allowed at occupied sites per rule text.
- Ocean shore that is also Marine Reserve/MPA: see [OAR 736-029-0040](https://secure.sos.state.or.us/oard/view.action?ruleNumber=736-029-0040) — **no removal of living or non-living natural products** except narrow Director allowances. Fail closed: collecting **PROHIBITED** in those overlays.

OPRD ocean-shore rules hub: https://www.oregon.gov/oprd/PRP/Pages/PRP-oceanshore-rules.aspx  
Plover info: https://www.oregon.gov/oprd/PCB/Pages/PCB-plovers.aspx

## Release-ready sites (12)

For each: location from OPRD coordinates; admin OPRD; visit OPEN; collect ALLOWED_LIMITED; MR shoreline checked; route suitable for field use.

|   # | Site                                  | Coords (OPRD)          | Parking          | Key sources                                                                                                      |
| --: | ------------------------------------- | ---------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
|   1 | Agate Beach State Recreation Site     | 44.659645, -124.056381 | Day-use required | [park 152](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=152), OAR 736-021-0090                 |
|   2 | Beverly Beach State Park              | 44.725503, -124.058355 | Day-use required | [park 164](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=164); stay north of Otter Rock MR      |
|   3 | South Beach State Park                | 44.5991216, -124.05934 | Day-use required | [park 149](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=149)                                   |
|   4 | Lost Creek State Recreation Site      | 44.543802, -124.073977 | Fee UNRESOLVED   | [park 145](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=145)                                   |
|   5 | Brian Booth State Park                | 44.518611, -124.071388 | Day-use required | [park 146](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=146)                                   |
|   6 | Seal Rock State Recreation Site       | 44.497357, -124.083111 | Fee UNRESOLVED   | [park 147](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=147)                                   |
|   7 | Driftwood Beach State Recreation Site | 44.463888, -124.077777 | Fee UNRESOLVED   | [park 144](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=144)                                   |
|   8 | Beachside State Recreation Site       | 44.381474, -124.088452 | Fee UNRESOLVED   | [park 84](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=84)                                     |
|   9 | Governor Patterson Memorial SRS       | 44.407462, -124.085148 | Day-use required | [park 82](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=82)                                     |
|  10 | Smelt Sands State Recreation Site     | 44.32087, -124.10278   | Fee UNRESOLVED   | [park 89](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=89)                                     |
|  11 | Yachats State Recreation Area         | 44.310012, -124.105872 | Fee UNRESOLVED   | [park 94](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=94)                                     |
|  12 | Fogarty Creek State Recreation Area   | 44.841388, -124.049378 | Day-use required | [park 158](https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=158); Cascade Head MR is farther north |

**Geology certainty on release-ready sites:** `SUPPORTED` for souvenir-class materials named in OAR (agates/stones/shells). No unsupported mineral-deposit or commercial claims.

## Closed / prohibited collecting (3) — not release-ready

| Site                 | Coords                 | Collect        | Why                                                                                                                                                                                                                                   |
| -------------------- | ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devils Punchbowl SNA | 44.746866, -124.064748 | **PROHIBITED** | Otter Rock MR ocean shore — [OAR 736-029-0040](https://secure.sos.state.or.us/oard/view.action?ruleNumber=736-029-0040); [Otter Rock shoreside PDF](https://oregonmarinereserves.com/content/uploads/2016/03/OtterRock_shoreside.pdf) |
| Otter Crest SSV      | 44.760809, -124.065195 | **PROHIBITED** | Otter Rock MR overlay                                                                                                                                                                                                                 |
| Neptune SSV          | 44.254073, -124.111421 | **PROHIBITED** | Cape Perpetua MR/MPA shoreline; OPRD page mentions agate hunting — **geological promise ≠ permission**; fail closed                                                                                                                   |

Visit remains ALLOWED at these parks; they are catalogued for launch UX as closed/prohibited for collecting.

## Unresolved (1)

| Site           | Why not release-ready                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Boiler Bay SSV | ODFW harvest maps mark limited-take / Marine Garden context; rock-souvenir authorization at this shoreline not cleared to release-ready standard |

## Gate verdict

**TRUST_PASS** — 12 release-ready sites (≥10) with official OPRD identity, resolved land admin, known visit state, known limited collecting state under current OAR, MR/closure checks retained in provenance, and no UNRESOLVED/CONFLICTED/STALE sites counted as release-ready.

### Residual honesty notes (do not weaken PASS)

- Launch collecting mode is **ocean-shore souvenir limits**, not inland BLM digging rockhound areas.
- Parking fee left `UNRESOLVED` where the park page did not state “Day-use parking permit required.”
- Users must still obey on-site postings, plover fences, and any newer emergency closures not present in retrieved sources.
- Machine-readable detail: `qa-artifacts/rockhounding-user-ready-release-r1/04-trust-sites.json`.

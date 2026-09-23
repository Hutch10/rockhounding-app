# First Live Provider Selection (R1)

**Decision:** `SELECTED_FIRST_LIVE_PROVIDER`

**Phase:** `ROCKHOUNDING_FIRST_LIVE_PROVIDER_SELECTION_R1` — CLOSED / PASS

The offline contract for this selection is [USGS SGMC Provider Contract](USGS_SGMC_PROVIDER_CONTRACT.md). Selection still does not authorize a live call.

**Evidence date:** 2026-09-23

This phase selects one source to test next. It does not admit that source, disclose its geometry, grant it decision authority, or authorize a network call.

## Selected record

| Field                            | Value                                                                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| providerName                     | U.S. Geological Survey                                                                                                                                                                                                                                      |
| sourceProductName                | State Geologic Map Compilation (SGMC) geology polygons, Data Series 1052, version 1.1                                                                                                                                                                       |
| providerOwner                    | U.S. Geological Survey, National Cooperative Geologic Mapping Program                                                                                                                                                                                       |
| domain                           | Geologic map units                                                                                                                                                                                                                                          |
| purpose                          | `GEOLOGICAL_CONTEXT`                                                                                                                                                                                                                                        |
| requestedOperation               | `AUTOMATED_QUERY`                                                                                                                                                                                                                                           |
| resourceType                     | Published geologic map compilation                                                                                                                                                                                                                          |
| resourceIdentity                 | DOI `10.5066/F7WH2N65`                                                                                                                                                                                                                                      |
| serviceIdentity                  | ArcGIS feature layer `SGMC_Geology` (layer id 3) on the ScienceBase SGMC feature service for catalog item `5888bf4fe4b05ccb964bab9d`                                                                                                                        |
| officialDocumentationRefs        | Horton, San Juan, and Stoeser, 2017, USGS Data Series 1052, https://doi.org/10.3133/ds1052 ; data release https://doi.org/10.5066/F7WH2N65 ; USGS copyrights and credits, https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits |
| licenseBasis                     | USGS-authored material is in the U.S. public domain. The service text also says the product, for the most part, is in the public domain and that any embedded copyrighted material must be cleared with its owner.                                          |
| reviewState                      | Enough public terms exist to write a `REVIEWED` profile before the first live call. This phase does not write that profile.                                                                                                                                 |
| attributionRequirements          | Credit the U.S. Geological Survey. Do not imply USGS endorsement. Do not use the trademarked USGS identifier.                                                                                                                                               |
| redistributionBoundary           | Not granted. `AUTOMATED_QUERY` does not allow `REDISTRIBUTE`, `PUBLIC_API`, or `BULK_DOWNLOAD`.                                                                                                                                                             |
| cacheBoundary                    | Not granted as `LOCAL_CACHE` or `OFFLINE_PACKAGE`. A later fixture may store a minimized captured response for replay.                                                                                                                                      |
| authenticationMode               | No secret. Anonymous read of the public feature-service description.                                                                                                                                                                                        |
| schemaVersionExpectation         | Pin DOI `10.5066/F7WH2N65`, Data Series 1052 version 1.1, and layer `SGMC_Geology`. Do not substitute a newer compilation silently.                                                                                                                         |
| sourceIdentityStrategy           | Resource id is the DOI. Provider record identity is `STATE`, `SGMC_LABEL`, and `UNIT_LINK`, with service `OBJECTID` retained as a service handle. `NGMDB1`, `NGMDB2`, and `NGMDB3` cite source maps. `OBJECTID` is not a scientific persistent id.          |
| temporalFieldMap                 | `AGE_MIN` and `AGE_MAX` are geologic age labels, not clocks. The publication citation is the compilation vintage. Per-feature `sourceUpdatedAt` is unknown. `retrievedAt` exists only when a later phase fetches.                                           |
| coverageSemantics                | Conterminous United States. Scales from 1:50,000 to 1:1,000,000. Where a state has both bedrock and surficial maps, bedrock is the represented map. Units are not reconciled across state lines. Alaska and Hawaii are outside this compilation.            |
| expectedDisclosureClassification | `PUBLIC`                                                                                                                                                                                                                                                    |
| expectedDisclosureMode           | `EXACT` for the published map-unit polygon, which is already a generalized map geometry. Disclosure Governance still runs. This is not a specimen locality.                                                                                                 |
| fixtureStrategy                  | Later phase saves one minimized GeoJSON response for a small extent, plus quarantine examples. This phase did not download features.                                                                                                                        |
| paginationStrategy               | Service metadata states max record count 2000 and GeoJSON query support. A page that stops at the cap is `PARTIAL`.                                                                                                                                         |
| rateLimitStrategy                | No published request quota was found. The fixture phase must treat HTTP errors and truncated pages as failures, not as empty geology.                                                                                                                       |
| failureSemantics                 | Service errors, timeouts, and truncated pages are `FETCH_FAILED` or partial coverage. They are not missing geology and not an access or collection outcome.                                                                                                 |
| quarantineCases                  | Unknown `GENERALIZED_LITH`, missing `STATE` or `UNIT_NAME`, non-polygon geometry, unexpected spatial reference, and a full page with no continuation marker.                                                                                                |
| admissionPolicyTarget            | Domain geology, purpose `GEOLOGICAL_CONTEXT`, historical map context. Not collection permission.                                                                                                                                                            |
| decisionContractRelevance        | May support geological context inside a field-visit or context contract. It does not satisfy collection, closure, route, or claim requirements.                                                                                                             |
| offSwitch                        | Suspend the governance record or stop calling the service. No migration. Existing receipts stay unchanged.                                                                                                                                                  |
| knownLimitations                 | Display service is reprojected to Web Mercator for drawing. Map scale varies. State boundaries are unreconciled. A 2026 GeMS geodatabase, DOI `10.5066/P1A3DQZK`, is a different product and is not this selection.                                         |
| selectionEvidenceDate            | 2026-09-23                                                                                                                                                                                                                                                  |

## Why this source

It is one geologic domain, one purpose, and one read query. A wrong or empty answer cannot legally open a claim, permit collection, or declare a place safe. The polygons are published map units, so the disclosure problem is smaller than exact mine, claim, or specimen points. The field list, record cap, DOI, and public-domain credit rule are documented.

The 2026 GeMS file is CC0 and newer. It is a data-release download, which is outside the first operation. The selected target remains the pinned 2017 compilation service. A later phase may consider the GeMS release only as a separately versioned source.

## Candidates not selected

National Weather Service alerts are the strongest structured API. They are open, require a User-Agent rather than a secret, use ISO-8601 times, and document a recommended request interval of about 30 seconds. They are not first because an empty or failed alert query can be misread as safety, and a zone query can omit county-based warnings. That is a life-safety consequence the geologic map does not have.

NASA FIRMS is a bounded fire-detection feed with open-data citation terms. It needs a free `MAP_KEY`, a detection is not a fire perimeter, and the first use would sit next to a safety decision. It stays a later candidate.

USGS USMIN is an official mineral-deposit database with WFS and WMS. The project describes itself as developing and focused on the most important deposits and districts. Exact deposit points are easier to misread as collecting targets, and the coverage is not all mineral occurrences.

BLM MLRS exposes national mining-claim polygons and states that some cases have no geometry because they could not be geocoded from legal land descriptions. A map with zero claims is not a claim-free place. The legal consequence is too high for the first integration.

No scraped, commercial, or community source was considered.

## What selection does not authorize

No adapter, fixture file, credential, or live query was created. Production decisions remain closed. The next phase is `ROCKHOUNDING_FIRST_PROVIDER_OFFLINE_CONTRACT_AND_FIXTURE_R1`.

# USGS SGMC shadow certification

**Phase:** `ROCKHOUNDING_FIRST_PROVIDER_SHADOW_CERTIFICATION_R1`

**Decision:** `ROCKHOUNDING_FIRST_PROVIDER_SHADOW_CERTIFICATION_R1_PASS`

**Baseline:** Shadow Read R1 `df09267b2b386a8a8b960e97b90c1a9e5b12738c`

**Additional provider requests:** none

This certification reviews the completed shadow read. It authorizes `BOUNDED_REPEATED_SHADOW_READ` for USGS SGMC geology only. It does not authorize production ingestion, public decision authority, a production map, collection permission, claim status, site access, route access, or closure authority.

The earlier shadow-read lint failure was intermediate evidence. It was fixed before `df09267` and is not unresolved debt.

## What the first response established

The pinned service answered one bounded request. ScienceBase item `5888bf4fe4b05ccb964bab9d` still cites DOI `10.5066/F7WH2N65`. Layer 3 remained `SGMC_Geology`, polygon, Query, max record count 2000. The catalog text also mentions DOI `10.5066/P1A3DQZK`. That product was not queried and is not certified.

The feature query used JSON with `outSR=102100`. The response spatial reference matched `ESRI:102100` / `EPSG:3857`. No client reprojection was applied. GeoJSON was available and unused because that path is WGS84, which the offline contract quarantines.

Adapter `rockhounding:usgs-sgmc-geology-adapter` 1.0.0 translated the live record to `SUCCESS`. Admission is `ADMITTED` for `GEOLOGY` / `GEOLOGICAL_CONTEXT` only. Disclosure for `PUBLIC` and `SHADOW_DISPLAY` was `ALLOWED` before QA-scope materialization. `confirmedAbsence` is false. Coverage semantics stay `UNKNOWN`.

`OBJECTID` remains a service handle. `STATE`, `SGMC_LABEL`, and `UNIT_LINK` remain the R1 component key. One sample does not make that key globally unique. `AGE_MIN` and `AGE_MAX` remain geologic text. `retrievedAt` is `2026-09-23T21:42:11.147Z`. Source-update time, phenomenon time, and the effective interval were not invented.

The response SHA-256 is `da2d6575b8dafa38a43383304e1ec196013cabb559cdfa5f622ddbea26d8c329`. That hash is artifact integrity, not provider authenticity. Raw bytes stay local because redistribution and offline caching are `UNKNOWN`.

## Fixture equivalence

| Assumption                            | Class              |
| ------------------------------------- | ------------------ |
| Core field names                      | CONFIRMED          |
| Age and text field types              | CONFIRMED          |
| Polygon geometry                      | CONFIRMED          |
| Accepted spatial reference            | CONFIRMED          |
| Scoped identity components            | CONFIRMED          |
| Known lithology value on this feature | CONFIRMED          |
| Feature-array response envelope       | CONFIRMED          |
| Completion below the result limit     | CONFIRMED          |
| Optional NGMDB fields                 | COMPATIBLE         |
| Unknown lithology quarantine          | NOT_EXERCISED live |
| Missing identity or unit name         | NOT_EXERCISED live |
| Non-polygon geometry                  | NOT_EXERCISED live |
| WGS84 quarantine                      | NOT_EXERCISED live |
| Full 2000-record page                 | NOT_EXERCISED live |
| Zero polygons                         | NOT_EXERCISED live |
| 2026 GeMS product as the query target | NOT_EXERCISED      |

No live assumption was `DRIFTED`. Untested fixture edges stay enforced by the offline contract and the shadow-read tests.

## Bounded repeated shadow policy

Mode `SHADOW_ONLY`. Operation `AUTOMATED_QUERY` only. A `READ` grant is not enough. Ungranted operations stay denied, including bulk download, redistribution, public API, local cache, offline package, model input, AI processing, training use, and commercial use.

Each request is one envelope, one layer (`SGMC_Geology` id 3), the pinned outFields, and at most 5 features. Each side of the envelope is at most 0.02 degrees, inside the conterminous window used by the profile. That window is a request bound, not a claim of geological coverage. No state-wide or nationwide query.

Frequency is manual and operator-triggered: one request per operator action, no background polling, no parallel fan-out, and no automatic retry. A transfer-limit or unknown completion mark stays `PARTIAL` or `UNKNOWN` and stops. Zero features mean `NO_SGMC_POLYGON_RETURNED`. The operational rate limit is `UNKNOWN_OPERATIONAL_LIMIT`. No requests-per-minute value is invented.

Governance and `guardFirstLiveAdapterExecution` run before every transport call. Disclosure runs before every materialization. Admission runs after every promotable candidate. Material drift, an unknown required enum, a bad age, a non-polygon, an unsupported CRS, or ambiguous pagination quarantines the raw record. `suspendSgmcGovernance` blocks the next call and does not delete the captured artifact.

Replay uses the recorded retrieval time, hash, and activity id. It does not create a new `SOURCE_RETRIEVAL`. Reanalysis creates a new processing record and leaves the historical artifact unchanged. The captured response cannot revise the adapter schema.

Materialization is `QA_SCOPE` only. Explore, Site Detail, Field Mode, the public map, and the public API stay closed. No secret is required. Storage of raw provider bytes remains local QA only.

## Limits

One successful feature. The transfer-limit path and the zero-result path were not observed live. The rate limit was not published on the response. Terms remain the reviewed `AUTOMATED_QUERY` grant. External schema and service identity can still change, and the next request must re-check them.

The bounded repeated shadow campaign is recorded in [USGS SGMC Bounded Repeated Shadow](USGS_SGMC_BOUNDED_REPEATED_SHADOW.md). Its decision is `ROCKHOUNDING_SGMC_BOUNDED_REPEATED_SHADOW_R1_PASS`. The production readiness gate is [USGS SGMC Production Readiness Gate](USGS_SGMC_PRODUCTION_READINESS_GATE.md). Its decision is `ROCKHOUNDING_SGMC_PRODUCTION_READINESS_GATE_R1_CONDITIONALLY_READY`. Neither result authorizes production ingestion.

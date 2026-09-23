# USGS SGMC shadow read

**Phase:** `ROCKHOUNDING_FIRST_PROVIDER_SHADOW_READ_R1`

**Production ingestion:** closed

**Public product authority:** none

This phase made one bounded, read-only shadow query against the pinned USGS State Geologic Map Compilation geology layer. The response proves that the provider answered that request. It does not prove source completeness, geological absence, nationwide availability, legal access, collecting permission, or production readiness.

## Authorization

Resource `res-usgs-sgmc-geology` and governance `gov-usgs-sgmc-geology` were loaded before any feature query. Review state is `REVIEWED`. `AUTOMATED_QUERY` evaluated to `ALLOWED_WITH_CONSTRAINTS` because USGS attribution is required. `guardFirstLiveAdapterExecution` ran before transport. `tolerantUnsupportedVersion` remains false. All eight adapter preconditions are required. A suspended profile blocks a later call before any socket is opened.

## Service identity

ScienceBase item `5888bf4fe4b05ccb964bab9d` still cites DOI `10.5066/F7WH2N65`. The item text also recommends the separate 2026 GeMS release `10.5066/P1A3DQZK`. That recommendation was not followed.

Resolved feature service:

`https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/SB_5888bf4fe4b05ccb964bab9d_USGS_SGMC_feature/FeatureServer`

Layer 3 remains `SGMC_Geology`, geometry `esriGeometryPolygon`, capability `Query`, max record count 2000. Supported query formats include JSON, geoJSON, and PBF. The query used JSON with `outSR=102100` because ArcGIS geoJSON is WGS84 and the pinned contract accepts `ESRI:102100` and `EPSG:3857`. No reprojection was applied in this phase.

## Request

Extent: National Mall, Washington, District of Columbia, bbox `-77.0365,38.889,-77.03,38.8915` in WGS84, used only as a transport envelope. Result limit 5. Fields: `STATE`, `SGMC_LABEL`, `UNIT_LINK`, `UNIT_NAME`, `AGE_MIN`, `AGE_MAX`, `GENERALIZED_LITH`, `NGMDB1`, `NGMDB2`, `NGMDB3`, and `OBJECTID`. No credential and no write endpoint. User-Agent: `RockhoundingFieldPlatform/sgmc-shadow-read-r1 (read-only; non-production)`.

The first feature query was aborted by the 20 second client timeout. No response body was kept. One recorded retry used a 60 second timeout. Service and layer metadata were read again before that retry. The retry returned HTTP 200, one polygon, and `exceededTransferLimit` was not set. Retrieved at `2026-09-23T21:42:11.147Z`. SHA-256 of the raw body: `da2d6575b8dafa38a43383304e1ec196013cabb559cdfa5f622ddbea26d8c329`. That hash is artifact integrity, not provider authenticity. No rate-limit header was present. No requests-per-minute value was inferred.

## Contract comparison

| Check               | Mark    |
| ------------------- | ------- |
| Source identity     | MATCH   |
| Layer               | MATCH   |
| Geometry type       | MATCH   |
| Spatial reference   | MATCH   |
| Core fields         | MATCH   |
| Field types         | MATCH   |
| Unknown fields      | MATCH   |
| Lithology enum      | MATCH   |
| Age representation  | MATCH   |
| Identity components | MATCH   |
| Pagination signal   | MATCH   |
| Max record count    | MATCH   |
| Coverage semantics  | UNKNOWN |

No material drift. The identity key is `STATE`, `SGMC_LABEL`, and `UNIT_LINK` for this record. That scope is still not a claim of global uniqueness. `OBJECTID` stayed a service handle. `AGE_MIN` and `AGE_MAX` stayed geologic text. `retrievedAt` is the retry timestamp. `sourceUpdatedAt`, `phenomenonTime`, and the effective interval were not invented.

Coverage of this query is the bbox only. `confirmedAbsence` is false. One returned polygon is not comprehensive geology, and zero polygons would still mean only `NO_SGMC_POLYGON_RETURNED`.

## Provenance, admission, disclosure

Provenance contains `SOURCE_RETRIEVAL` and then the adapter `IMPORT` at `rockhounding:usgs-sgmc-geology-adapter` 1.0.0. The same offline adapter translated the live record. Status `SUCCESS`. Admission for `GEOLOGY` / `GEOLOGICAL_CONTEXT` is `ADMITTED`. The same candidate is not collection, access, route, closure, claim, ownership, or management evidence.

Disclosure for `PUBLIC` and `SHADOW_DISPLAY` is `ALLOWED` at exact precision. Materialization stayed inside this phase's QA scope. No Explore, Site Detail, Field Mode, public map, or public API path was wired. Unknown sensitivity remains withheld.

The off-switch call after capture used a suspended governance profile and a transport that throws if invoked. The guard returned `AUTHORIZATION_BLOCKED` and did not send a second feature query.

## Raw response retention

Redistribution and offline caching remain `UNKNOWN`. The raw response, service metadata, and layer metadata stay in the local QA directory and are gitignored. The committed record is the request manifest, comparison marks, hash, and timestamp in `campaign-summary.json`.

## Limits

One successful feature. No pagination campaign. No outage campaign beyond the first client timeout. No production decision. No schema update from the live record. External schema and terms can still change.

The certification of this read is [USGS SGMC Shadow Certification](USGS_SGMC_SHADOW_CERTIFICATION.md). A certification pass authorizes only `BOUNDED_REPEATED_SHADOW_READ`. It does not authorize production ingestion.

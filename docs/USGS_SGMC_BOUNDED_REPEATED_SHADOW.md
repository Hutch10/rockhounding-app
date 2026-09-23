# USGS SGMC Bounded Repeated Shadow

**Phase:** `ROCKHOUNDING_SGMC_BOUNDED_REPEATED_SHADOW_R1`

**Decision:** `ROCKHOUNDING_SGMC_BOUNDED_REPEATED_SHADOW_R1_PASS`

**Starting HEAD:** `a6eed7782761cf136a6327c7043c4b298b034674`

**Baseline:** `ROCKHOUNDING_FIRST_PROVIDER_SHADOW_CERTIFICATION_R1_PASS`

## What this phase answers

Four ordinary, operator-triggered feature queries asked whether the certified USGS State Geologic Map Compilation service stayed operationally and semantically stable across a small sample. Two queries returned HTTP 504 with empty bodies. Two returned HTTP 200 and were processed by adapter `rockhounding:usgs-sgmc-geology-adapter` 1.0.0 without a code change. That is enough to keep the certified contract, and not enough to authorize production.

This phase does not decide whether SGMC is ready for production.

## Campaign policy

The frozen policy is campaign authorization only:

- Provider: USGS SGMC, DOI `10.5066/F7WH2N65`, Data Series 1052 v1.1
- Mode: `SHADOW_ONLY`
- Adapter: 1.0.0
- Operation: `AUTOMATED_QUERY`
- Layer: `SGMC_Geology` id 3
- Maximum queries: 4
- Maximum envelope: 0.02 degrees on each side
- Maximum features: 5
- Parallelism: 1
- Automatic retry, automatic pagination, and background polling: false
- Public materialization: false
- Production authority: `NONE`
- Governance, disclosure, and admission are rechecked per request, materialization, and candidate
- Off-switch: governance suspension

Each planned envelope is 0.012 by 0.008 degrees inside the certified CONUS request window. The places are ordinary downtown extents chosen for geological and state variation. They are not collecting sites and they are not a user location.

| Read   | Purpose                               | Extent                         |
| ------ | ------------------------------------- | ------------------------------ |
| READ A | Ordinary urban alluvial plain         | Downtown Omaha, Nebraska       |
| READ B | Ordinary urban Piedmont               | Downtown Atlanta, Georgia      |
| READ C | Different state-map lineage           | Downtown Austin, Texas         |
| READ D | State-line-adjacent ordinary downtown | Downtown Kansas City, Missouri |

## Execution

Metadata was fetched once before the first feature query: service and layer 3 both returned HTTP 200, the gate stayed ok, and `maxRecordCount` stayed 2000. ScienceBase was not contacted again. Each feature query was authorized separately. Requests were sequential, with a 5 second pause, and were not retried.

| Read | HTTP | Features | Completion | Replay            |
| ---- | ---- | -------- | ---------- | ----------------- |
| A    | 504  | 0        | `UNKNOWN`  | same-status match |
| B    | 504  | 0        | `UNKNOWN`  | same-status match |
| C    | 200  | 2        | `COMPLETE` | deterministic     |
| D    | 200  | 1        | `COMPLETE` | deterministic     |

READ A was not repeated after the gateway timeout. The campaign continued with B, C, and D. No request returned HTTP 429. Response cache headers do not establish a request rate. The operational limit stays `UNKNOWN_OPERATIONAL_LIMIT`.

## Stability

Successful responses used the pinned field set plus `OBJECTID`. No extra attribute appeared. Geometry stayed Esri polygon rings in Web Mercator (`wkid` 102100, `latestWkid` 3857). Multi-ring polygons were already accepted by the pinned polygon translation. No point or polyline appeared. `OBJECTID` was recorded only as a service handle.

Scoped identity used `STATE`, `SGMC_LABEL`, and `UNIT_LINK`. No component was missing and no duplicate scoped key appeared inside a read. That key is still not a global identifier. Lithology values on the successful reads were already in the pinned set, so no live mapping change was made. `AGE_MIN` and `AGE_MAX` stayed geologic text. They were not written to the Truth Clock.

`exceededTransferLimit` was absent and the feature counts were under the cap, so completion is `COMPLETE` under the existing rule. No second page was requested. Zero features were not observed on a successful response. The empty 504 bodies are `HTTP_ERROR`, `geologicalAbsence` false, and `confirmedAbsence` false. Four tiny reads are not a coverage claim.

## Provenance, admission, disclosure, governance

Each successful read created its own `SOURCE_RETRIEVAL` and a following import activity. Offline replay used adapter 1.0.0, did not create another retrieval, and matched the live normalized fields. The 504 bodies were compared at HTTP 504. Forcing those bodies through an HTTP 200 replay would mis-classify an empty gateway timeout.

Successful candidates were admitted only for `GEOLOGY` / `GEOLOGICAL_CONTEXT`. The same candidates were rejected for collection permission, site access, route access, closure, mining claim, land ownership, and land management. Disclosure before QA materialization was `ALLOWED` for `PUBLIC` and `SHADOW_DISPLAY`. Product surfaces stayed closed.

Governance was evaluated before every transport call, including the metadata calls. `suspendSgmcGovernance` blocked a prospective call before the campaign and again after the last read. Neither off-switch check contacted the provider.

Quarantine was not invoked by the live successes. The offline tests still quarantine an unknown lithology and a blank state. No fixture was added, because the live successes did not introduce a new semantic shape.

## Raw artifacts

Redistribution and local cache rights remain `UNKNOWN`. Raw response bytes and per-feature observation notes stay in the gitignored QA directory. The committed manifest stores hashes, HTTP status, completion, and structural classes.

## Production boundary

Production ingestion stays closed. Production geological context is not authorized. Ordinary-user display stays closed. The production readiness gate is [USGS SGMC Production Readiness Gate](USGS_SGMC_PRODUCTION_READINESS_GATE.md). Its decision is `ROCKHOUNDING_SGMC_PRODUCTION_READINESS_GATE_R1_CONDITIONALLY_READY`. Repeated shadow reads are evidence about interface consistency. They are not production trust.

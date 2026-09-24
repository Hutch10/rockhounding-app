# USGS SGMC production read-only geological context

`ROCKHOUNDING_SGMC_PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT_R1` is CLOSED and PASS.

Production authority is `PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT`. Scope is GEOLOGY and `GEOLOGICAL_CONTEXT` on Site Detail. This is not collection permission, access, route, closure, claim, ownership, or safety.

## Path

Site Detail asks for geological context. The server builds a 0.012 by 0.008 degree box around the stored site point and calls `getProductionGeologicalContext`. That function checks Source Governance and `AUTOMATED_QUERY`, then uses the certified shadow transport. The raw body stays in the request. Adapter `rockhounding:usgs-sgmc-geology-adapter` 1.0.0 translates features. Quarantine, Evidence Admission, Disclosure Governance, and a separate `PUBLIC_DISPLAY` check run before any unit reaches the page. The browser does not call ArcGIS.

Provider: U.S. Geological Survey. Product: State Geologic Map Compilation. DOI: `10.5066/F7WH2N65`. Layer: `SGMC_Geology` id 3. Resource: `res-usgs-sgmc-geology`.

## Bounds and transport

Maximum width and height are 0.02 degrees. Maximum features are 5. One page. No automatic retry, pagination, polling, prefetch, or map fan-out. GET only. Fixed FeatureServer. Allowlisted fields. Timeout 60 seconds. No credential. Alaska and Hawaii, and any box outside the conterminous request window, return `OUTSIDE_PROVIDER_COVERAGE` without a provider call.

## User states

Success shows unit name, lithology, geologic age text, attribution, compilation year 2017, and the retrieval time. Retrieval is not a source update. `sourceUpdatedAt` is null.

Provider failure, timeout, and HTTP 5xx say geological context is temporarily unavailable. A page with no features says no SGMC map unit was returned. That is not geological absence and not confirmed absence. A partial or ambiguous page is not shown as complete. Disclosure withhold and governance suspension show no provider-derived units. The rest of Site Detail still renders.

## Rights limits

`LOCAL_CACHE`, `REDISTRIBUTE`, `PUBLIC_API`, `OFFLINE_PACKAGE`, `MODEL_INPUT`, `AI_PROCESSING`, `TRAINING_USE`, and `BULK_DOWNLOAD` stay ungranted. There is no durable raw cache, public proxy, offline package, or redistribution. Attribution names the Survey, the product, and the DOI, and says Rockhounding is not a USGS product. The trademarked identifier is not used.

`USGS_SGMC_PRODUCTION_CONTEXT_ENABLED` turns the Site Detail call on. Governance still wins: a suspended profile makes no request. Rollback is that flag plus `suspendSgmcGovernance`. No database migration.

Observability is the request-scoped `observation` object: outcome, failure class, feature count, latency, quarantine count, admission failures, and disclosure or display blocks. The raw body is not logged.

Normal tests use a mock transport and make no live provider calls. No production smoke request was issued. The next phase is `ROCKHOUNDING_SGMC_PRODUCTION_ACCEPTANCE_R1`.

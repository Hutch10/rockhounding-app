# Live Read Path Controls (R1)

**Phase:** `ROCKHOUNDING_LIVE_READ_PATH_CONTROLS_R1`

**Package exports:** `@rockhounding/shared/disclosure-governance`, `@rockhounding/shared/source-operation-authorization`

This phase closes the two conditional dimensions from [First Live Provider Readiness Gate](FIRST_LIVE_PROVIDER_READINESS_GATE.md). It does not select a provider, contact an endpoint, or open live ingestion.

Two questions stay independent:

1. May this source be used for this exact operation?
2. May this spatial precision be disclosed for this purpose?

## Disclosure boundary

[Disclosure Governance R1](DISCLOSURE_GOVERNANCE.md) is the pre-materialization projection. `UNKNOWN` sensitivity fails closed for public, export, and shadow purposes. Exact sensitive coordinates are not copied into those releases. Coarse release uses a supplied coarse reference. It does not jitter or round the original point. The source geometry stays unchanged.

`MODEL_CONTEXT` is least-precision. It is not an automatic exact-coordinate feed.

## License-to-operation binding

`evaluateSourceOperationAuthorization` binds facts the platform already records:

- resource id
- review state `REVIEWED`, `NEEDS_REVIEW`, `UNKNOWN`, or `SUPERSEDED`
- governance status and governance receipt
- license profile attribution, redistribution, offline caching, and derivative use
- an explicit grant list
- one requested operation

It does not call `evaluateSourceAdmission` a second time and it does not invent grants.

`UNKNOWN` and `NEEDS_REVIEW` return `UNKNOWN`. `SUPERSEDED`, a deprecated governance status, and a `PROHIBITED` receipt return `PROHIBITED`. A resource id that does not match the receipt returns `PROHIBITED`. An adapter operation missing from the receipt's allowed operations returns `PROHIBITED`.

One grant does not imply another:

- `READ` is not `TRANSFORM`
- `AUTOMATED_QUERY` is not `BULK_DOWNLOAD`
- `MODEL_INPUT` is not `AI_PROCESSING`
- `MODEL_INPUT` is not `TRAINING_USE`
- `LOCAL_CACHE` is not `REDISTRIBUTE`
- `PUBLIC_DISPLAY` is not `PUBLIC_API`

`REDISTRIBUTE` and `PUBLIC_API` also require `redistribution: ALLOWED`. `LOCAL_CACHE` and `OFFLINE_PACKAGE` require offline caching allowed. `TRANSFORM` and `DERIVE` require derivative use allowed. A prohibited license field wins over an explicit grant.

If attribution is `REQUIRED`, an otherwise allowed operation is `ALLOWED_WITH_CONSTRAINTS` and the attribution constraint stays on the result. Unknown attribution fails closed.

`TRAINING_USE` is allowed by this helper only when that exact grant is present. The first-live guard still rejects it.

## First-live execution guard

`guardFirstLiveAdapterExecution` recomputes authorization and only then calls the supplied executor. It requires:

- reviewed authorization of `ALLOWED` or `ALLOWED_WITH_CONSTRAINTS`
- requested operation exactly `READ` or `AUTOMATED_QUERY`
- the same operation on the adapter definition
- matching resource id
- every source-adapter precondition
- `tolerantUnsupportedVersion: false`

A caller-supplied boolean is not an input. Missing fields fail validation, and the executor is not called.

Offline fixture adapters keep using `translateSourceMaterial` directly. They do not need a live license.

## Adapter and governance versions

Source Governance and the Source Adapter Contract stay at STABLE 1.0.0. The operation helper is not a new building block. Disclosure Governance is the new STABLE 1.0.0 block `rockhounding:disclosure-governance`.

## R1 limitations

- no live provider
- no network request
- no production ingestion
- no real provider license adjudication
- no legal certification
- no full inference-disclosure attack analysis
- no persistence
- no public API implementation
- no sensitive-location database
- no automatic policy scraping
- no inference from `MODEL_INPUT` to training permission
- no production display authorization

## Next phase

`ROCKHOUNDING_FIRST_LIVE_PROVIDER_SELECTION_R1` selected USGS SGMC. The offline contract is [USGS SGMC Provider Contract](USGS_SGMC_PROVIDER_CONTRACT.md). A shadow read is a later phase. Live ingestion stays closed.

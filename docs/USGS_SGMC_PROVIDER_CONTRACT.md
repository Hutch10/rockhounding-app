# USGS SGMC provider contract

**Phase:** `ROCKHOUNDING_FIRST_PROVIDER_OFFLINE_CONTRACT_AND_FIXTURE_R1`

**Live ingestion:** closed

**Operational endpoint contact:** prohibited

This contract interprets documentation-derived fixtures for the selected USGS State Geologic Map Compilation geology layer. A fixture is source evidence that can become a geological-context candidate. It stays short of collection permission, claim status, site access, closure, route access, and unrestricted decision authority.

## Identity

| Item             | Value                                          |
| ---------------- | ---------------------------------------------- |
| Provider         | U.S. Geological Survey                         |
| Product          | State Geologic Map Compilation                 |
| DOI              | `10.5066/F7WH2N65`                             |
| Publication      | Data Series 1052 version 1.1                   |
| Layer            | `SGMC_Geology`, ArcGIS layer 3                 |
| ScienceBase item | `5888bf4fe4b05ccb964bab9d`                     |
| Resource id      | `res-usgs-sgmc-geology`                        |
| Governance id    | `gov-usgs-sgmc-geology`                        |
| Adapter          | `rockhounding:usgs-sgmc-geology-adapter` 1.0.0 |
| Domain           | `GEOLOGY`                                      |
| Purpose          | `GEOLOGICAL_CONTEXT`                           |
| Operation        | `AUTOMATED_QUERY`                              |

Provider identity, resource identity, and record identity stay separate. The 2026 GeMS release, DOI `10.5066/P1A3DQZK`, is a different product. The adapter rejects it as `UNSUPPORTED_SOURCE_VERSION`.

## Governance and license

Review state is `REVIEWED` as of 2026-09-23. The reviewed basis is U.S. public domain for USGS-authored material, plus the service statement that embedded copyrighted material needs the owner's permission. Attribution to the U.S. Geological Survey is required. The profile does not imply USGS endorsement.

`AUTOMATED_QUERY` is `ALLOWED_WITH_CONSTRAINTS` because attribution is required. `PUBLIC_DISPLAY` is a separate explicit grant, also `ALLOWED_WITH_CONSTRAINTS`, recorded in [USGS SGMC Public Display Rights](USGS_SGMC_PUBLIC_DISPLAY_RIGHTS.md). A query grant does not authorize display.

These operations stay ungranted: `BULK_DOWNLOAD`, `REDISTRIBUTE`, `PUBLIC_API`, `LOCAL_CACHE`, `OFFLINE_PACKAGE`, `MODEL_INPUT`, `AI_PROCESSING`, `TRAINING_USE`, `COMMERCIAL_USE`. Redistribution, caching, and derivative use remain `UNKNOWN`. The CC0 mark on DOI `10.5066/F7WH2N65` is not applied to those operations and is not applied to DOI `10.5066/P1A3DQZK`.

A `READ` receipt does not authorize `AUTOMATED_QUERY`.

## Fields, geometry, and identity

Expected geometry is a polygon in `EPSG:3857` or `ESRI:102100`, the documented web-display spatial reference.

Mapped fields: `STATE`, `SGMC_LABEL`, `UNIT_LINK`, `UNIT_NAME`, `AGE_MIN`, `AGE_MAX`, `GENERALIZED_LITH`, `NGMDB1`, `NGMDB2`, `NGMDB3`. Raw values are kept. `GENERALIZED_LITH` must match the documented renderer vocabulary captured for this contract. An unknown value is quarantined and is not replaced with a guessed class.

The record key is `STATE`, `SGMC_LABEL`, and `UNIT_LINK`, joined in that order. Its scope is `STATE_SGMC_LABEL_UNIT_LINK_R1_COMPONENTS_NOT_A_GLOBAL_KEY`. That key is deterministic for those components. It is not a claim of global uniqueness. `OBJECTID` is stored as `serviceObjectId` and is not the canonical identity. A feature that has only `OBJECTID` is ambiguous and is quarantined.

## Time and coverage

`AGE_MIN` and `AGE_MAX` are geologic age text. They are not `phenomenonTime`, `sourceUpdatedAt`, `publishedAt`, or an effective interval. The offline fixture has no `retrievedAt` because nothing was retrieved. The compilation citation is August 2017 on the resource record. Per-feature `sourceUpdatedAt` is not invented.

Product coverage is the conterminous United States. Alaska and Hawaii are excluded. Scales vary from about 1:50,000 to 1:1,000,000. State-line units are unreconciled. Where bedrock and surficial maps overlap, the compilation's own representation applies. Fixture coverage is marked `OFFLINE_FIXTURE`. It is not a completed live query.

Zero returned polygons mean no SGMC polygon came back for that request. They do not mean geological absence.

The documented service max record count is 2000. A page of 2000 records whose completion state is `UNKNOWN` is `UNRESOLVED` and `PARTIAL`. This phase does not page a service.

## Quarantine, provenance, admission, disclosure

Quarantine preserves the raw fixture for: unknown lithology, missing `STATE`, missing `UNIT_NAME`, non-polygon geometry, an unsupported spatial reference, an unsupported publication version, the 2026 GeMS DOI, a full page without a completion signal, a non-string geologic age, and an ambiguous provider identity.

Provenance uses an `IMPORT` activity from the resource and the fixture through the adapter. It does not create a live `SOURCE_RETRIEVAL`.

Admission policy `policy-usgs-sgmc-geological-context` admits a successful fixture as role `DECISION` for domain `GEOLOGY` and purpose `GEOLOGICAL_CONTEXT`. Historical map context is acceptable. The same candidate is rejected for collection permission, site access, closure, and mining-claim purposes. It can satisfy the geology requirement of the geological-context and field-visit contracts. It leaves road, closure, safety, collection-rule, and claim requirements unmet.

Disclosure policy allows `PUBLIC` map-unit geometry for `SHADOW_DISPLAY` and `PUBLIC_MAP` only through `projectForDisclosure`. `UNKNOWN` sensitivity is withheld. Raw geometry cannot be materialized without that projection. Nothing is displayed, because no shadow read has happened.

## Off-switch

`suspendSgmcGovernance` returns a suspended copy. The first-live guard then refuses execution. The original governance record and fixture stay unchanged. No schema migration is required.

## Fixture strategy and limits

Fixtures live in `packages/shared/src/provider-fixtures/usgs-sgmc/`. Each file says `DOCUMENTATION_DERIVED_SYNTHETIC_PROVIDER_FIXTURE`, `offline: true`, and `operationallyRetrieved: false`. Values such as state `SYN` are synthetic. They are not retrieved SGMC features.

This phase did not query a feature service, validate service availability, execute pagination, observe a rate limit, or test a provider outage. There is no production use, live display, or live decision receipt. Provider terms are pinned to the evidence reviewed on 2026-09-23. The external schema may change before the first shadow read.

The shadow read is recorded in [USGS SGMC Shadow Read](USGS_SGMC_SHADOW_READ.md). Its certification is [USGS SGMC Shadow Certification](USGS_SGMC_SHADOW_CERTIFICATION.md). The bounded repeated campaign is [USGS SGMC Bounded Repeated Shadow](USGS_SGMC_BOUNDED_REPEATED_SHADOW.md). The production readiness gate is [USGS SGMC Production Readiness Gate](USGS_SGMC_PRODUCTION_READINESS_GATE.md). A certification pass authorizes only `BOUNDED_REPEATED_SHADOW_READ`. `PUBLIC_DISPLAY` was later granted with attribution constraints for DOI `10.5066/F7WH2N65`. Site Detail geological context is the production surface. Production ingestion stays closed.

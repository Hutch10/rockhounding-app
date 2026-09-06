# Resource Catalog (R1)

**Status:** Canonical TypeScript / Zod catalog (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/resource-catalog`

## Purpose

The Resource Catalog describes **discoverable resources** from which layers, evidence, observations, analyses, or rules may originate: datasets, APIs, documents, spatial assets, processing services, vocabularies, models, and observational collections.

A `ResourceRecord` says what a resource **is**. It does not fetch, execute, persist, or interpret the resource.

## Non-goals (R1)

Not implemented: network access, live adapters, persistence, authentication, ingestion, rendering, OGC/STAC clients, legal-rule parsing, AI integrations, health monitoring, freshness polling, resource execution, referential integrity, cycle detection, or standards-conformance claims.

## Architecture boundary

| Component                     | Role                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| **UGES**                      | Evidence assertions                                                  |
| **Geological Layer Registry** | Geological/geospatial **layer** semantics and capabilities           |
| **Resource Catalog**          | Discoverable **resources** that may back layers or future assertions |
| **Adapters**                  | Future: translate resource content into UGES assertions              |

These responsibilities must not collapse.

## Relationship to UGES

`projectResourceToUgesSource(record)` may emit an `EvidenceSourceDescriptor`.

A `ResourceRecord` **cannot** produce an `EvidenceAssertion`. Assertion `authorityClass`, `certainty`, `confidence`, `predicate`, and `value` are not catalog fields.

Community/user resources cannot self-declare `PRIMARY_AUTHORITY` or `SECONDARY_AUTHORITY`.

`resourceAuthorizesCollection` is always `false`. `regulationDocumentIsExecutableLaw` is always `false`.

## Relationship to Geological Layer Registry

Layer definitions may optionally list `resourceRecordIds`. Catalog metadata is **not** duplicated into the layer.

Helpers:

- `listResourceIdsForLayer(layer)`
- `resolveResourcesForLayer(layer, catalog)` — missing IDs appear in `missing`; they are not rejected
- `listLayersReferencingResource(registry, resourceId)`

No global mutable registry. No referential integrity.

## Resource identity vs version

- `id` is the opaque stable **application** identifier (UUID not required)
- `version.versionId` is a separate version concept
- External IDs (`providerRecordId`, `doi`, `uri`, `catalogIdentifier`, `versionIdentifier`) are not canonical identity

`supersedes` / `supersededBy` / `knownIssueRefs` are reference-only; targets need not exist.

## Authority

`ResourceAuthorityProfile` reuses UGES `EvidenceAuthorityClass` as **resource/source** authority only. It does not create UGES claims.

## Temporal model

Optional: publication, last updated, acquisition/observation period, coverage, effective interval, retrieval expectation.

Open-ended coverage is allowed. Ordered intervals with `from > to` are rejected. Future timestamps are allowed.

## Spatial model

Optional. CRS identifier, bbox, nominal scale, resolution, positional accuracy, coverage description. No reprojection or geometry operations. Negative scale/resolution rejected.

## License / access

Access mechanisms are descriptive only (`STATIC_FILE`, `REST_API`, `OGC_API`, `WMS`, `WFS`, `STAC`, `TILE_SERVICE`, `DOWNLOAD`, `MANUAL_DOCUMENT`, `LOCAL_FILE`, `USER_GENERATED`, `OTHER`). No requests are made.

Permissions (`redistribution`, `offlineCaching`, `derivativeUse`) are `ALLOWED` | `PROHIBITED` | `UNKNOWN`. Do not infer.

## Relationships

Reference-only: `DERIVED_FROM`, `SUPERSEDES`, `SUPERSEDED_BY`, `DESCRIBES`, `DOCUMENTS`, `IMPLEMENTS`, `PRODUCES`, `CONSUMES`, `HAS_VERSION`, `PART_OF`, `MIRRORS`.

Self-links and duplicate equivalent links are rejected. Missing targets and cycles are not enforced in R1.

## Limitations

Machine-readable codes plus optional detail (`COARSE_SCALE`, `INCOMPLETE_COVERAGE`, `TEMPORAL_LAG`, `HISTORICAL_ONLY`, `MODEL_DERIVED`, `COMMUNITY_SOURCED`, `LEGAL_NONAUTHORITATIVE`, `NOT_PARCEL_SCALE`, `KNOWN_PROVIDER_ISSUE`, `UNVERIFIED_CURRENCY`, `RATE_LIMITED`, `ACCESS_RESTRICTED`).

Capabilities are metadata only and do not imply runtime access.

## Derived-resource provenance

`DERIVED_PRODUCT` requires `processId`, `processVersion`, `inputResourceIds`, `derivationMethod`. Input existence is not validated.

## Standards-readiness

Optional `standardsHints` (`OGC_API_RECORDS`, `JSON_FG`, `GEOJSON`, `STAC`, `GEOSCIML`, `GEOPACKAGE`, `GEOPARQUET`, `RO_CRATE`) help future adapters. R1 does **not** claim conformance and does not import standards libraries.

## Future adapter boundary

Adapters (next phase) look up a `ResourceRecord`, fetch/parse **outside this catalog**, and emit UGES assertions. The catalog remains a metadata index.

## Built-ins (metadata only)

`res-usgs-ngmdb`, `res-usgs-mrds`, `res-usgs-3dep`, `res-blm-mlrs`, `res-nws-alerts`, `res-nasa-firms`, `res-regulation-document-example`, `res-stac-imagery-example`, `res-local-field-observations`, `res-derived-terrain-analysis`

## API

```
createResourceCatalog(definitions?)  // default: built-ins; duplicate IDs rejected
getResourceRecord(catalog, id)
listResourceRecords(catalog)         // sorted by id
listResourcesByType / Capability / Provider / Usage
listResourcesReferencing(catalog, id)
validateResourceRecord(record)
projectResourceToUgesSource(record)
```

Clone-on-read. No hidden mutation.

## R1 limitations

- no persistence
- no live retrieval
- no source adapters
- no authentication
- no referential integrity
- no cycle detection
- no health monitoring
- no execution
- no automatic version discovery
- no legal-rule interpretation
- no standards-conformance claim

# Geological Layer Registry (R1)

**Status:** Canonical TypeScript / Zod catalog (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/geological-layer-registry`

## Purpose

The Geological Layer Registry is a **catalog of data-source definitions and layer capabilities**. Downstream systems use it to answer deterministic questions such as:

- What layer is this, and who provides it?
- What category of geospatial/geological evidence can it contribute?
- What is the **source** authority class (not assertion authority)?
- What spatial scope/resolution and temporal/freshness policy apply?
- What licensing or use limitations are **known**, vs `UNKNOWN`?
- Is it appropriate for geology, claims, closures, terrain, imagery, observations, hazards, or other purposes?
- Can it support offline use, and what fallback/limitation must be retained?

A registry entry describes **what a source/layer is**. It does not fetch data, cache tiles, ingest records, or decide whether collecting is legal.

## Non-goals (R1)

Not implemented:

- database persistence
- live provider fetch / authentication / health checks
- automatic freshness polling
- map rendering or reprojection
- provider-specific OGC / STAC / GeoSciML / GeoPackage adapters
- legal rule evaluation or collection authorization
- referential integrity across layer IDs
- UGES assertion generation from a layer definition alone

## Architecture boundary

| Component                     | Role                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| **Geological Layer Registry** | Catalog of sources/layers and their declared capabilities          |
| **Resource Catalog**          | Discoverable datasets/APIs/documents that may back a layer         |
| **UGES**                      | Provenance-first **evidence assertion** primitive                  |
| Map renderer                  | View of geometries (out of scope)                                  |
| Ingestion / adapters          | Future: emit UGES assertions, referencing registry source metadata |
| Permissions / legal engine    | Future: consume UGES permission values; **not** this registry      |

The registry is **not**:

- a map-layer renderer
- a fetched-data cache
- an ingestion engine
- a database
- a permissions engine
- an authority resolver for individual claims
- a legal rule engine

## Relationship to UGES

UGES R1.1 remains the assertion contract. This registry **reuses** `EvidenceAuthorityClass` for **source/layer** authority only.

`projectLayerToUgesSource(layer)` maps a validated layer definition into an `EvidenceSourceDescriptor`.

It does **not**:

- create `EvidenceAssertion` records
- set assertion `authorityClass`, `certainty`, `confidence`, `predicate`, or `value`
- upgrade community observations to `VERIFIED` or `PRIMARY_AUTHORITY`

Four UGES dimensions stay independent: authority ≠ evidence class ≠ certainty ≠ confidence. Registry freshness expiry (`STALE` / `REVALIDATION_REQUIRED`) does **not** delete historical evidence and is not a UGES certainty rewrite.

## Authority model

`LayerAuthorityProfile`:

- `originKind`: `AGENCY` | `SCIENTIFIC` | `COMMUNITY` | `USER` | `MODEL` | `UNKNOWN`
- `sourceAuthorityClass`: UGES `EvidenceAuthorityClass`

This is **inherent source authority** for the layer catalog entry. Downstream assertions still carry their own `authorityClass`.

### Community / user restriction

`FIELD_OBSERVATION` layers, `originKind` `USER`/`COMMUNITY`, and `USER_GENERATED` retrieval **cannot** claim `PRIMARY_AUTHORITY` or `SECONDARY_AUTHORITY`.

A derived product from community inputs must be `DERIVED_ANALYSIS` with derivation metadata and typically `MODEL_DERIVED` authority. Configuration cannot launder community origin into agency authority.

## Freshness model

There is **no global TTL**. Each layer has `LayerFreshnessPolicy`:

| `class`                 | Typical use (illustrative, not legal truth)               |
| ----------------------- | --------------------------------------------------------- |
| `LONG_LIVED`            | Geologic maps, mineral-occurrence compilations, elevation |
| `MODERATE`              | Ownership-like datasets, field observations               |
| `REVALIDATE_BEFORE_USE` | Mining claims / land records used as decision **input**   |
| `SHORT_LIVED`           | Closures                                                  |
| `VERY_SHORT_LIVED`      | Weather / fire                                            |
| `UNKNOWN`               | Unresolved                                                |

Optional `maxAgeHours` (must be positive if present).

On expiry, `onExpiry` is only:

- `REVALIDATION_REQUIRED`
- `STALE`

Expiry **never** means delete or invalidate stored historical evidence.

## Spatial / scale model

Canonical CRS identifier is typically `EPSG:4326`. R1 does **not** reproject.

- `geometrySupport`: POINT / LINE / POLYGON / RASTER / MIXED
- optional `extent` bbox `[west, south, east, north]`
- optional `nominalScaleDenominator` (map scale; omit when inappropriate)
- optional `spatialResolutionMeters` / `positionalAccuracyMeters` (imagery, DEM, observations)

Negative scale/resolution is rejected. Imagery and field observations may omit map scale.

## Temporal model

Keep clocks distinct:

- `publishedAt` / `updatedAt` — dataset publication/update
- `observedOrAcquiredAt` — source observation/acquisition
- `coverageFrom` / `coverageTo` — temporal coverage (`coverageTo` omitted = open-ended)
- `coverageMode`: `CURRENT` | `HISTORICAL` | `BOTH`
- `retrievalExpectation`: `ON_DEMAND` | `BATCH` | `USER_SYNC` | `UNKNOWN`

If both coverage bounds are present, `coverageFrom` must be ≤ `coverageTo`.

## License / offline policy

`LayerLicensing` uses `UNKNOWN` where legally unresolved:

- `licenseId` / `licenseTextRef` (optional)
- `attributionRequired`: `REQUIRED` | `NOT_REQUIRED` | `UNKNOWN`
- `redistribution` / `offlineCaching` / `derivativeUse`: `ALLOWED` | `RESTRICTED` | `UNKNOWN`

R1 does **not** invent permission from a provider name.

## Access / retrieval

Descriptive modes only: `STATIC_FILE`, `REST_API`, `OGC_API`, `WMS`, `WFS`, `STAC`, `TILE_SERVICE`, `MANUAL_DOCUMENT`, `LOCAL_DATASET`, `USER_GENERATED`.

No network clients. Declaring `OGC_API` or `STAC` does not claim conformance.

## Capabilities

Declared capabilities (`FEATURE_QUERY`, `BBOX_QUERY`, `TEMPORAL_QUERY`, `POINT_QUERY`, `TILE_RENDER`, `OFFLINE_CACHE`, `HISTORICAL_LOOKUP`, `CHANGE_DETECTION`, `SOURCE_VERSIONING`, `PROVENANCE_LINKING`) are **registry metadata**. Syntactic validation only — not proof a provider implements them.

## Usage / collection-decision boundary

`LayerUsageProfile.intendedUses` may include `COLLECTION_DECISION_INPUT`.

**Invariant:** `layerAuthorizesCollection(layer)` is always `false`.

A layer usable as collection-decision **input** does not authorize collecting. Permission remains a UGES permission value (e.g. `PROHIBITED`) evaluated by a later legal/access system.

Other uses: `DISCOVERY`, `GEOLOGICAL_CONTEXT`, `SAFETY_DECISION_INPUT`, `ROUTE_DECISION_INPUT`, `SPECIMEN_CONTEXT`, `RESEARCH_ONLY`.

## Limitations

Every layer has one or more structured `LayerLimitation` records: machine-readable `code` plus optional `description`.

Codes include coarse scale, incomplete coverage, reporting delay, provider latency, historical only, inference/model output, community sourced, non-authoritative for legal decisions, not suitable for parcel-scale interpretation.

## Derived-layer provenance

`DERIVED_ANALYSIS` **requires**:

- `processId`
- `processVersion`
- `inputLayerIds` (unique; **existence not validated** in R1)
- `derivationMethod`
- optional `metadataRef`

## API (pure functions)

```
validateLayerDefinition(input)
createGeologicalLayerRegistry(definitions)  // rejects duplicate IDs
getLayerDefinition via registry.getLayerDefinition(id)
listLayerDefinitions(registry)              // sorted by id
listLayersByCategory(registry, category)
listLayersByCapability(registry, capability)
listLayersByUsage(registry, usage)
listResourceIdsForLayer(layer)              // optional Resource Catalog refs; existence not required
projectLayerToUgesSource(layer)
evaluateFreshnessExpiryEffect(layer)
layerAuthorizesCollection(layer)            // always false
```

Built-ins: `BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS`.

No hidden mutable singleton. Returned definitions are clones so callers cannot mutate registry storage.

## Built-in definitions (metadata only)

Conservative, non-networked fixtures — **not** live currency:

| id                             | Family                                   |
| ------------------------------ | ---------------------------------------- |
| `usgs-ngmdb-geologic-maps`     | USGS NGMDB geologic maps                 |
| `usgs-mrds-mineral-occurrence` | USGS MRDS-equivalent mineral occurrences |
| `usgs-3dep-elevation`          | USGS 3DEP                                |
| `blm-mlrs-mining-claims`       | BLM MLRS claims/land records family      |
| `nws-alerts-weather`           | NWS alerts/weather family                |
| `nasa-firms-fire`              | NASA FIRMS                               |
| `rockhound-field-observations` | Field/community observations             |

Built-in layers optionally reference Resource Catalog IDs (`resourceRecordIds`) such as `res-usgs-ngmdb`. Missing catalog records are **not** rejected.

## Resource Catalog

Layer definitions may point at [Resource Catalog](RESOURCE_CATALOG.md) records. Catalog metadata is not copied into the layer. `resolveResourcesForLayer` lives in `@rockhounding/shared/resource-catalog`.

## Extension path

Later phases may add OGC API Features / JSON-FG, STAC, GeoSciML, and GeoPackage **adapters** that:

1. Look up a registry id
2. Fetch/parse provider payloads (out of R1)
3. Emit **UGES assertions** with `projectLayerToUgesSource` as `source`

R1 does not claim conformance to those standards.

## R1 limitations

- no persistence
- no live provider fetch
- no provider authentication
- no referential integrity across layer IDs
- no runtime source health checks
- no automatic freshness polling
- no legal rule evaluation
- no map rendering
- no reprojection
- no provider-specific adapters
- no full OGC / STAC / GeoSciML conformance claim

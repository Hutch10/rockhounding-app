# Universal Geological Evidence Schema (UGES) R1 / R1.1

**Status:** Canonical TypeScript / Zod contract  
**Schema version:** `1` (R1.1 refines semantics within v1; no bump)  
**Package export:** `@rockhounding/shared/uges`

## Purpose

UGES is the provenance-first **evidence assertion** primitive for Rockhound. Later systems (Layer Registry, USGS/OGC/STAC adapters, MCP/WebMCP, geological similarity, opportunity surface) should attach to this model rather than invent parallel “facts.”

An assertion records:

- **what** is claimed (`predicate` + typed `value`)
- **about what** (`subject`)
- **where** it applies (`geometry`, optional)
- **when it is valid** vs **when it was observed** vs **when we retrieved it**
- **who/what source** asserted it, **authority class**, **evidence class**, **certainty**, optional **confidence**
- **supporting / contradicting** assertion IDs (references only)
- **provenance** sufficient to reconstruct ingestion later

## Non-goals (R1 / R1.1)

Not implemented here: Geological Layer Registry, USGS/OGC/STAC adapters, DuckDB ETL, MCP Gateway, WebMCP, geological similarity, opportunity surface, remote sensing, QGIS, UI, database persistence, referential integrity on relation IDs, or floating-point confidence scores.

## Four independent dimensions

Do **not** collapse these:

| Dimension                   | Field                                        | Meaning                                                     |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| **Authority**               | `authorityClass` (+ `source.authorityClass`) | Who/what class of actor produced or carries the claim       |
| **Evidence class**          | `evidenceClass`                              | How the assertion entered the system                        |
| **Certainty / truth state** | `certainty`                                  | Epistemic state of the claim (verified, reported, stale, …) |
| **Confidence**              | `confidence?`                                | Optional subjective strength (`LOW` \| `MEDIUM` \| `HIGH`)  |

### Example (R1.1 canonical)

```
authorityClass = USER_OBSERVATION
evidenceClass  = DIRECT_OBSERVATION
certainty      = REPORTED
confidence     = HIGH
```

A user can be highly confident about a direct observation without incorrectly upgrading the assertion to `VERIFIED`.

### Example (verified prohibition)

```
predicate = COLLECTING_PERMISSION
value.status = PROHIBITED
certainty = VERIFIED
```

Permission outcome and truth state remain independent.

### Example (reported prohibition)

```
predicate = COLLECTING_PERMISSION
value.status = PROHIBITED
certainty = REPORTED
authorityClass = COMMUNITY_REPORT
```

## PROHIBITED is not certainty

`PROHIBITED` is **`EvidencePermissionStatus`** on `value.kind = 'permission'`. It is **not** a member of `EvidenceCertainty`.

Collecting bans, closures, and similar access outcomes belong on permission values. Certainty describes how well the claim itself is established.

## Authority model (dual fields)

Both fields remain in R1.1:

| Field                      | Semantics                                                           |
| -------------------------- | ------------------------------------------------------------------- |
| `source.authorityClass`    | Inherent/general authority category of the **source catalog entry** |
| `assertion.authorityClass` | Authority **attributed to this particular assertion**               |

They may diverge legitimately (e.g. a `MODEL_DERIVED` assertion from a `PRIMARY_AUTHORITY` USGS source).

**Rejected combination:** direct user/community-sourced assertions (`source.authorityClass` = `USER_OBSERVATION` or `COMMUNITY_REPORT`, `evidenceClass` = `DIRECT_OBSERVATION` or `USER_REPORTED`) cannot carry `PRIMARY_AUTHORITY` or `SECONDARY_AUTHORITY` on the assertion unless `derivationMethod` is present.

## Certainty / truth state

Canonical members: `VERIFIED`, `SUPPORTED`, `REPORTED`, `UNRESOLVED`, `CONFLICTED`, `STALE`.

`HIGH` is **not** a certainty member. Use optional `confidence: HIGH` instead.

## Confidence

Optional field: `confidence?: LOW | MEDIUM | HIGH`

No floating-point scores in R1.1. Confidence is independent from certainty and from permission status.

## Evidence class

`DIRECT_OBSERVATION` · `AUTHORITATIVE_DATA` · `DOCUMENTED_REPORT` · `IMPORTED_DATASET` · `DERIVED` · `MODELED` · `USER_REPORTED` · `UNKNOWN`

## Schema

See `packages/shared/src/universal-geological-evidence-schema.ts`.

### EvidenceAssertion (equivalent fields)

| Field                      | Semantics                                                             |
| -------------------------- | --------------------------------------------------------------------- |
| `id`                       | Opaque stable application identifier (1–128 chars; UUID not required) |
| `schemaVersion`            | Always `1` in R1/R1.1                                                 |
| `subject`                  | `{ kind, id, label? }`                                                |
| `predicate`                | Assertion class                                                       |
| `value`                    | Typed discriminated payload                                           |
| `geometry?`                | GeoJSON Point / LineString / Polygon / MultiPolygon, WGS84 lon/lat    |
| `validFrom?` / `validTo?`  | Validity interval; omit `validTo` for open-ended                      |
| `observedAt?`              | When a human or sensor observed the phenomenon                        |
| `retrievedAt`              | When **this system** obtained the record                              |
| `source`                   | `EvidenceSourceDescriptor`                                            |
| `sourceRecordId?`          | Provider-native external record id                                    |
| `authorityClass`           | Authority attributed to this assertion                                |
| `evidenceClass`            | How the assertion entered the system                                  |
| `certainty`                | Truth/freshness state                                                 |
| `confidence?`              | Optional subjective strength                                          |
| `derivationMethod?`        | How a derived/modeled value was produced                              |
| `supportingEvidenceIds`    | Other assertion IDs that support this one                             |
| `contradictingEvidenceIds` | Other assertion IDs that conflict                                     |
| `provenance`               | Ingestion descriptor                                                  |

### Identifier semantics

| Identifier                                           | Role                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `assertion.id`                                       | Opaque stable platform assertion id                                |
| `source.id`                                          | Stable platform source-catalog id                                  |
| `sourceRecordId` / `provenance.sourceRecordId`       | External provider-native record id                                 |
| `supportingEvidenceIds` / `contradictingEvidenceIds` | Assertion id references only — existence **not** validated in R1.1 |

Referential integrity is deferred to persistence/query layers.

### Source descriptor

`id`, `name`, `provider`, `authorityClass`, `sourceType`, optional `license`, `canonicalUri`, `retrievalPolicy`, `freshness`.

This is **not** the Layer Registry. Registry entries should reference these primitives.

## Predicate / value typing

Values use a **discriminated union** on `value.kind`:

| `value.kind`            | Typical predicates                                           |
| ----------------------- | ------------------------------------------------------------ |
| `permission`            | ACCESS, COLLECTING_PERMISSION, PERMIT_REQUIREMENT, CLOSURE   |
| `geologic_unit`, `text` | GEOLOGY, DERIVED_GEOLOGICAL_INTERPRETATION                   |
| `mineral_occurrence`    | OCCURRENCE                                                   |
| `managing_authority`    | MANAGING_AUTHORITY                                           |
| `specimen`              | SPECIMEN_IDENTITY                                            |
| `text`                  | FIELD_OBSERVATION, ROUTE_CONDITION, HAZARD_SAFETY, OWNERSHIP |

R1.1 validates well-known predicate/value pairings. Unlisted predicates remain extensible; new predicates should add typed value variants rather than falling back to `string` / `unknown`.

## Time model

| Clock          | Field                   | R1.1 decision                                                                                                  |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Valid time     | `validFrom` / `validTo` | Reject `validFrom > validTo`; allow `validFrom === validTo` (instantaneous); open-ended when `validTo` omitted |
| Observed time  | `observedAt`            | Allowed after `retrievedAt` (sync lag / clock skew)                                                            |
| Retrieval time | `retrievedAt`           | Future timestamps allowed (imports/fixtures); not used as “now gate”                                           |

These must not be collapsed.

## Geometry

- CRS: **WGS84 / EPSG:4326**
- Axis order: **[longitude, latitude]**
- Validated: lon ∈ [-180, 180], lat ∈ [-90, 90]; polygon rings ≥ 4 positions; **ring closure** (first = last)
- **Not validated:** ring winding order, full RFC 7946 GeoJSON compliance, reprojection
- MapLibre/Mapbox encoding is a view, not the canonical store
- PostGIS persistence is deferred

## Provenance

Enough to reconstruct later: `sourceSystem`, optional `sourceUri` / `sourceRecordId` / `contentHash`, `transformVersion`, `ingestionMethod`, optional `derivationChain` (assertion IDs).

## Support and contradiction

Arrays of assertion **references**. Validation rejects:

- self-support / self-contradiction
- duplicate IDs in one list
- the same ID in both lists

**Not validated in R1.1:**

- whether referenced assertion IDs exist
- graph cycle detection (deferred to evidence index / persistence)

Conflicting claims are **both stored** (see test fixture G).

## Permission dimensions

Independent dimensions: **Visit, Observe, Photograph, Collect, Permit, Route, Closure**.

Represented as `value.kind = 'permission'` with `dimension` + `status` (`ALLOWED` | `RESTRICTED` | `PERMIT_REQUIRED` | `PROHIBITED` | `UNKNOWN`).

## Serialization

`serializeEvidenceAssertion` emits JSON with lexicographically sorted keys, ISO-8601 strings, no class instances. `parseEvidenceAssertion` revalidates on read.

## Versioning

`schemaVersion: 1` remains correct after R1.1 semantic hardening. No v2 bump — nothing is persisted as an external contract yet. Future persisted contracts will bump the literal with a documented compatibility window.

## Future relationships

- **Layer Registry:** catalog of sources referencing `EvidenceSourceDescriptor`
- **MCP / OGC / STAC:** adapters emit `EvidenceAssertion` records
- **PostGIS:** store geometry as `geography` 4326; assertions as JSONB

## Known limitations

- No DB table / RLS / referential integrity on relation IDs
- No graph cycle detection
- No floating-point confidence scores
- Polygon ring winding not RFC-validated
- `canonicalUri` requires a URL; URN-only identifiers belong on `provenance.sourceUri`
- Not wired into the web bundle barrel (`@rockhounding/shared/uges` subpath only)

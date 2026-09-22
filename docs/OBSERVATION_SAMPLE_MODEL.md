# Observation / Sample Model (R1)

**Status:** Canonical TypeScript / Zod domain model (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/observation-sample-model`

## Mission

This model is the field-science primitive layer for:

- observations of features and specimens
- sampling events
- physical samples/specimens
- procedures, instruments, and results
- physical lineage and transformation effects

Future field capture, adapters, lab integrations, provenance activities, evidence admission, and exports depend on these distinctions remaining intact.

## Non-goals

Not implemented: persistence, database schema, live capture UI, adapters, laboratory APIs, instrument registry, unit conversion, automatic identification, AI analysis, evidence admission, legal/permission inference, source-authority promotion, full provenance activities, chain of custody, sync/custody state machine, disclosure-policy enforcement, IGSN registration, or ISO 19156 / OGC OMS / SOSA/SSN conformance claims.

## Architecture

| Thing                      | Role                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| Feature of interest        | The site, sample, unit, or material being observed                          |
| Observation                | A dated result for one observed property                                    |
| Sampling event             | The act of obtaining one or more physical samples                           |
| Sample / specimen          | A physical object with identity and lineage                                 |
| Procedure                  | How a result or sample was produced                                         |
| Result                     | The observation outcome (not an interpretation by default)                  |
| Interpretation / assertion | Later identification or a UGES assertion — **not** this model's Observation |

UGES remains the assertion contract. Resource Catalog remains discoverable resource metadata. Source Governance remains source-use policy. The Building Block Registry records contract identity.

## Observation vs assertion

An Observation is not a UGES assertion. It has no `predicate`, `certainty`, `confidence`, or `authorityClass`.

`observationIsUgesAssertion` is always `false`.

`projectObservationToUgesSource` emits only an `EvidenceSourceDescriptor` for later admission work. Field observations project as `USER_OBSERVATION`. `MODEL_GENERATED` results project as `MODEL_DERIVED`. Neither becomes `PRIMARY_AUTHORITY`.

## Observation vs sample

A Sample is a physical object. An Observation is a result about a feature (often a sample). Multiple observations may target the same sample over time. A sample is not an observation.

## Sampling event

A SamplingEvent records obtaining material. It exists even if resulting Sample records are absent (`resultingSampleIds` may be empty). One event may list many sample IDs. Duplicate resulting IDs are rejected.

`samplingEventAuthorizesCollection` is always `false`. Sample type and sampling do not encode collection legality.

Location is a reference (`locationRef`), not duplicated geometry.

## Specimen / sample identity

Canonical identity is the opaque `id`. External identifiers (`IGSN`, `PROVIDER`, `LAB`, `OTHER`) are additional, never replacements. Duplicate equivalent scheme+value pairs are rejected.

A sample does not require a `samplingEventId`. Historic museum specimens, lab standards, and borrowed references may record `originNote` with unresolved origin. R1 does not fabricate a SamplingEvent.

Physical state (`physicalState`) may change without changing identity.

`FOSSIL_SPECIMEN` is a scientific class only. `fossilSpecimenImpliesLawfulCollection` is always `false`.

## Physical lineage

Lineage kinds: `DERIVED_FROM`, `SPLIT_FROM`, `SUBSAMPLED_FROM`, `CUT_FROM`, `PREPARED_FROM`.

Direct self-lineage and duplicate equivalent edges are rejected. `validateSampleLineageGraph` detects cycles across a sample set. Parents not present in the set are allowed (external/unresolved parents).

Child samples do not inherit scientific conclusions.

## Transformations

Effects: `NONE`, `NON_DESTRUCTIVE`, `ALTERING`, `PARTIALLY_DESTRUCTIVE`, `DESTRUCTIVE`, `UNKNOWN`.

Cutting/powdering/thin-section preparation are represented on lineage and/or procedure `destructiveEffect`. Photographing a specimen typically uses `NONE`. Questionable washing examples are not hard-coded.

## Procedures

Types include `FIELD_VISUAL`, `FIELD_TEST`, `INSTRUMENT_MEASUREMENT`, `SAMPLING`, `LAB_ANALYSIS`, `IMAGE_CAPTURE`, `POSITION_MEASUREMENT`, `MANUAL_CLASSIFICATION`, `MODEL_ANALYSIS`, `OTHER`.

`MODEL_ANALYSIS` is not equivalent to `FIELD_VISUAL`. Procedure version, optional instruments, calibration metadata, and limitations round-trip. There is no Instrument Registry in R1; `instrumentId` is a future hook.

## Result types

Discriminated: `TEXT`, `BOOLEAN`, `NUMBER`, `QUANTITY`, `CATEGORY`, `IDENTIFIER`, `GEOMETRY_REFERENCE`, `MEDIA_REFERENCE`, `COMPOSITE`, `UNKNOWN`.

`QUANTITY` requires a finite `value` and `unit`. NaN and infinities are rejected. Missing data uses `UNKNOWN`, not placeholder numbers. R1 does not convert units.

Observed properties are extensible `{ id, label? }` references, not a frozen vocabulary.

## Direct vs derived vs interpreted vs model-generated

`ObservationResult.origin`:

| Origin            | Example                                   |
| ----------------- | ----------------------------------------- |
| `DIRECT`          | scratches glass = true                    |
| `DERIVED`         | hardness ≥ ~5.5 inferred from a procedure |
| `INTERPRETED`     | “likely chalcedony”                       |
| `MODEL_GENERATED` | classifier or opportunity score           |

These are not equivalent evidence types.

## Temporal semantics

`observedAt` (phenomenon time) and `recordedAt` (result/record time) are optional.

- Historical `observedAt` years before `recordedAt` is valid.
- Future `observedAt` is allowed.
- `recordedAt` must not precede `observedAt` when both are present.

Quality metadata (uncertainty, detection limit, repeat count, limitations) is optional and is **not** certainty, confidence, or authority.

Optional `status` (`LOCAL_CAPTURED` … `SUPERSEDED`) is custody/sync preparation, not scientific truth.

## External identifiers / IGSN readiness

IGSN-like values are stored on `externalIdentifiers` with scheme `IGSN`. R1 does not register IGSNs or resolve PIDs.

## Raw observation preservation

Each observation has its own `id`. Later identification is a **separate** observation (typically `INTERPRETED` / `material_identification`). Helpers never mutate a prior result in place. Repeating a hardness test three times yields three observations.

## Minimal valid observation

Required: `id`, `schemaVersion`, `featureOfInterest`, `observedProperty`, `result`.

Not required: timestamps, procedure, instrument, precision, authority, resource record, or UGES assertion.

## Minimal valid sample

Required: `id`, `schemaVersion`, `sampleType`.

Missing sampling provenance stays missing (`samplingEventId` omitted plus optional `originNote`).

## Relationship to UGES

UGES owns assertions. This model may later feed admission → assertion. Projection today is source-descriptor metadata only.

## Relationship to Resource Catalog

`resourceRecordId` may point at a catalog record. Existence is not validated (referential integrity deferred). Catalog semantics are unchanged.

## Relationship to Source Governance

This model does not decide whether an external source may be used.

## Relationship to Building Block Registry

STABLE 1.0.0:

- `rockhounding:observation`
- `rockhounding:sample`
- `rockhounding:sampling-event`

DRAFT 0.1.0 records are retained for identity continuity. Latest stable is 1.0.0. Other stable foundations are unchanged.

## Future Provenance Activity Kernel

Who/what generated or transformed these entities is out of R1.

## Future custody / sync state

`status` values are placeholders compatible with a later custody state machine.

## Future OMS / SOSA / SSN mapping

Concepts align with ISO 19156:2023 / OGC OMS and SOSA/SSN (feature, observation, procedure, result, sample, sampling). R1 does not claim conformance and does not import those packages.

## R1 limitations

- no persistence
- no database schema
- no live field capture UI
- no adapters
- no laboratory API
- no instrument registry
- no unit-conversion engine
- no automatic specimen identification
- no AI analysis
- no evidence admission
- no legal/permission inference
- no source authority promotion
- no full provenance activities yet
- no chain-of-custody implementation
- no sync/custody state machine yet
- no disclosure-policy enforcement
- no IGSN registration
- no standards-conformance claim
- referential integrity deferred
- lineage cycle detection applies to graphs passed to `validateSampleLineageGraph`

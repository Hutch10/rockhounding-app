# Provenance Activity Kernel (R1)

**Status:** Canonical TypeScript / Zod kernel (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/provenance-activity-kernel`

## Mission

The kernel records how Rockhounding entities are created, acquired, transformed, analyzed, interpreted, packaged, or superseded.

It answers:

- What generated an entity?
- What inputs were used?
- Which source lineage does it depend on?
- Which processing steps transformed it?
- Who or what performed those steps?
- Which process or software version was involved?
- What the transformation did not legitimately increase?

Provenance explains lineage. It does not manufacture truth.

## Non-goals

Not implemented: persistence, graph database, RDF/SPARQL, live adapters, automatic dependency invalidation, replay execution, reanalysis execution, digital signatures, PKI, blockchain, RO-Crate export, source-independence scoring, Evidence Admission, Decision Snapshot, Trust Dependency Graph, Evidence Impact invalidation, external referential integrity, or a W3C PROV conformance claim.

## Entity / Activity / Agent

Rockhounding-native alignment with W3C PROV, without importing PROV/RDF libraries:

| PROV concept          | Kernel type                      |
| --------------------- | -------------------------------- |
| Entity                | `ProvenanceEntityReference`      |
| Activity              | `ProvenanceActivity`             |
| Agent                 | `ProvenanceAgentReference`       |
| used / wasGeneratedBy | `used[]` / `generated[]`         |
| wasDerivedFrom        | `ProvenanceDerivation`           |
| wasAssociatedWith     | `associatedAgents[]` with a role |

Entity types include UGES assertions, resource records, layers, observations, sampling events, samples, procedures, derived products, documents, media, decision snapshots, offline packages, model outputs, and `OTHER`.

References may carry `buildingBlockId`, `buildingBlockVersion`, `externalRef`, and `versionRef`. Referenced entities are not required to exist.

Activity identity (`id`) is distinct from `activityType`. Agent identity is distinct from authority. `SOFTWARE` and `AI_MODEL` agents are distinct from `PERSON`.

## Source lineage vs processing lineage

`lineageClass` is `SOURCE` or `PROCESS`.

- **Source lineage** is where information came from (retrieval, publication, resource record).
- **Processing lineage** is what happened after acquisition (normalization, GIS, lab, model, AI).

They may overlap on a shared entity and are not interchangeable.

`getSourceAncestors` follows every upstream edge and records source-class inputs and source-generated intermediates. `getProcessingAncestors` follows process-class edges only.

Example: publication → retrieved DEM → slope surface → exposure model keeps the publication on source ancestry and the DEM/slope steps on processing ancestry.

## Derivation

Kinds: `DIRECT_COPY`, `NORMALIZED_FROM`, `TRANSFORMED_FROM`, `DERIVED_FROM`, `AGGREGATED_FROM`, `INTERPRETED_FROM`, `MODEL_DERIVED_FROM`, `CORRECTED_FROM`, `SUPERSEDED_FROM`.

Relationships: `DERIVES`, `CORRECTS`, `SUPERSEDES`, `INVALIDATES`, `ANNOTATES`.

Direct self-derivation and duplicate equivalent edges are rejected. Derivation cycles are rejected by `validateProvenanceGraph`. Query helpers still terminate on a cyclic graph that bypassed validation.

Unknown external references remain valid.

## Activity types

`SOURCE_RETRIEVAL`, `MANUAL_ENTRY`, `FIELD_OBSERVATION`, `SAMPLING`, `IMAGE_CAPTURE`, `NORMALIZATION`, `CLASSIFICATION`, `TRANSFORMATION`, `DERIVATION`, `GIS_ANALYSIS`, `LAB_ANALYSIS`, `MODEL_ANALYSIS`, `AI_ANALYSIS`, `SOURCE_RECONCILIATION`, `RIGHTS_EVALUATION`, `DECISION_EVALUATION`, `PACKAGE_CREATION`, `DISCLOSURE_TRANSFORMATION`, `CORRECTION`, `SUPERSESSION`, `IMPORT`, `EXPORT`, `OTHER`.

Zero inputs and zero outputs are allowed. `AI_ANALYSIS` with inputs and no generated entity is valid.

`startedAt` / `endedAt` are optional. Equal times and future times are allowed. `endedAt` before `startedAt` is rejected. Those fields are process execution times. Temporal fitness and retrieval currency belong to the [Truth Clock](TRUTH_CLOCK_AVAILABILITY.md), not to the activity.

## Agents and roles

Agent types: `PERSON`, `ORGANIZATION`, `SOFTWARE`, `AI_MODEL`, `INSTRUMENT`, `SYSTEM`, `UNKNOWN`.

Roles: `OBSERVER`, `COLLECTOR`, `OPERATOR`, `ANALYST`, `REVIEWER`, `SOFTWARE_EXECUTOR`, `MODEL_EXECUTOR`, `DATA_PROVIDER`, `CURATOR`, `IMPORTER`, `OTHER`.

An activity may have several agents. Agent type does not imply UGES authority.

## Correction and supersession

`CORRECTS` and `SUPERSEDES` point at a new entity and retain the earlier entity id. History is not rewritten.

## Authority non-elevation

`claimedAuthorityIsElevated` is true when a claimed `EvidenceAuthorityClass` outranks every input authority. Community or user observations synthesized by AI cannot become `PRIMARY_AUTHORITY`.

`provenanceSetsUgesTruth` is always false. Activities have no certainty, confidence, or permission fields.

## AI provenance and model portability

Optional `ai` metadata: `modelName`, `modelVersion`, `provider`, `taskContractVersion`, `reasoningMode`, `evidenceBundleHash`. None are required.

`AI_ANALYSIS` is distinct from `MODEL_ANALYSIS` and `GIS_ANALYSIS`. There is no chain-of-thought field. Zod drops unknown keys such as `chainOfThought`.

Essential semantics live in typed fields, not model-specific prose.

## Observation / Sample integration

Activities reference observations, sampling events, and samples. They do not modify those schemas.

- `FIELD_OBSERVATION` may generate an Observation reference
- `SAMPLING` may generate a Sampling Event and/or Sample
- `TRANSFORMATION` may use a parent Sample and generate children
- `LAB_ANALYSIS` may use a Sample and generate an Observation

Sample identity and raw observation records stay on their own contracts.

## Resource Catalog

`SOURCE_RETRIEVAL` may use a `RESOURCE_RECORD` reference and generate an imported entity. The catalog record is not rewritten. Existence is not checked.

## Source Governance boundary

`governanceReceiptId` may name a receipt. `provenanceAuthorizesUse` is always false.

## UGES boundary

An activity may say it generated a `UGES_ASSERTION` reference. It does not set certainty, confidence, authority, or permission.

## Hashing

`hashProvenanceActivity` computes SHA-256 over a canonical JSON form (`scope: canonical-activity-v1`).

Excluded as non-material: `activityHash`, `notes`, `limitations`.

Same material activity yields the same hash. A changed input changes the hash. This is an integrity preparation hash, not a signature.

## Replay and reanalysis

Replay would reuse historical inputs, process version, parameters, and software version. Reanalysis would reuse historical evidence with a current process or model. R1 records the metadata and does not execute either.

## Future graphs and exports

Lineage helpers are the query surface for a future Trust Dependency Graph and Evidence Impact Graph. R1 does not invalidate dependents automatically.

RO-Crate / PROV export and signatures are future work.

## Building Block Registry

`rockhounding:provenance-activity` is STABLE 1.0.0. DRAFT 0.1.0 remains queryable. Dependencies are `REFERENCES` / `PROJECTS_TO` only. Other STABLE versions are unchanged.

## R1 limitations

- no persistence
- no graph database
- no RDF/SPARQL
- no live adapters
- no automatic dependency invalidation
- no replay execution
- no reanalysis execution
- no digital signatures
- no PKI
- no blockchain
- no RO-Crate export
- no source independence scoring
- no Evidence Admission
- no Decision Snapshot implementation
- no Trust Dependency Graph
- no Evidence Impact automatic invalidation
- no external referential integrity
- no full PROV conformance claim

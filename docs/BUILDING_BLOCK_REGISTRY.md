# Building Block Registry (R1)

**Status:** Canonical TypeScript / Zod registry (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/building-block-registry`

## Purpose

The Building Block Registry is the canonical catalog of independently versioned **domain contracts** used across the Rockhounding platform.

It answers:

- What contracts exist?
- What is each block's stable identity?
- What version is current?
- What lifecycle state is it in?
- What does it depend on?
- Which validators, examples, and implementation modules apply?
- Which compatibility guarantees are declared?
- What does an implementation need to claim support?

The registry governs **architectural identity and compatibility**. It does not define scientific truth, legal authority, or live data validity.

## Architectural position

The registry is a higher-order catalog. Owning contracts remain the source of their own semantics:

| Concern                                    | Owning building block                |
| ------------------------------------------ | ------------------------------------ |
| Evidence assertion semantics               | Universal Geological Evidence Schema |
| Layer metadata and capabilities            | Geological Layer Registry            |
| Discoverable resource metadata             | Resource Catalog                     |
| Permitted/prohibited source-use operations | Source Governance Contract           |

The registry **points to** those contracts. It must not become a second schema authority.

Runtime coupling is one-way: domain modules do **not** import the Building Block Registry. The registry refers to their module paths, tests, and docs.

## Non-goals (R1)

Not implemented: persistence, dynamic plugin loading, remote schema registry, runtime code generation, migration execution, automatic compatibility inference, package-version synchronization, external standards conformance claims, live implementation probing, deployment/version discovery, repository mutation from registry metadata, automatic semantic upgrades, agent authority to rewrite stable contracts, network calls, source adapters, or production configuration.

## Stable identity

Identity is a namespaced opaque string, independent of implementation path, filename, TypeScript type name, package version, and documentation title.

R1 IDs:

| ID                                        | Contract                             |
| ----------------------------------------- | ------------------------------------ |
| `rockhounding:uges`                       | Universal Geological Evidence Schema |
| `rockhounding:geological-layer-registry`  | Geological Layer Registry            |
| `rockhounding:resource-catalog`           | Resource Catalog                     |
| `rockhounding:source-governance-contract` | Source Governance Contract           |

Identity remains separate from version. Changing `modulePath` does not change `id` or `version`.

No component may infer compatibility solely from filename, package version, import path, documentation title, TypeScript type name, or implementation coincidence.

## Version model

Each definition carries `{ major, minor, patch }`. This is **not** the npm package version.

R1 supports:

- exact version identity (`id` + `major.minor.patch`)
- multiple versions of one block in the same registry
- latest known **STABLE** discovery via `getLatestStableBuildingBlock`
- supersession metadata on deprecation records
- explicit compatibility declarations

When `getBuildingBlock(id)` is called without a version, the highest version of that ID is returned. That is **not** the same as latest stable. Deprecated or draft versions can be higher than the last STABLE version.

When multiple STABLE versions exist for one ID, latest stable is the highest STABLE version by `{major, minor, patch}` order.

No runtime migration is executed.

## Lifecycle states

| Status         | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `DRAFT`        | Not yet suitable for implementation claims                    |
| `EXPERIMENTAL` | Usable for controlled development; semantics may change       |
| `CANDIDATE`    | Semantics intended to stabilize; validation underway          |
| `STABLE`       | Supported architectural contract                              |
| `DEPRECATED`   | Still recognized; replacement exists or migration is expected |
| `RETIRED`      | No longer supported for new work; remains queryable           |

PASS/FAIL are not lifecycle states.

Lifecycle does not imply implementation PASS. Implementation status (`IMPLEMENTED` / `TESTED` / `PARTIAL` / `NONE`) is a separate field on the implementation descriptor.

**STABLE requires an implementation descriptor.** Contract-only STABLE blocks are rejected in R1.

DRAFT and EXPERIMENTAL future blocks must not be treated as STABLE. `getLatestStableBuildingBlock` returns `undefined` for them.

## Dependency model

Each dependency specifies:

- `kind`: `REQUIRES` | `OPTIONAL` | `EXTENDS` | `PROJECTS_TO` | `REFERENCES`
- `targetBuildingBlockId`
- `versionRequirement`
- optional `notes`

Version requirement modes:

- `EXACT` — requires `version`
- `SAME_MAJOR` — requires `version` (major must match)
- `AT_LEAST` — requires `version`
- `COMPATIBLE_WITH_DECLARED_RANGE` — requires `range.min` (optional `range.max`)

R1 does not implement a full npm-style semver parser.

Rejected:

- direct self-dependency
- duplicate equivalent dependencies
- malformed version requirements
- duplicate `id`+`version` in a registry
- `REQUIRES` / `EXTENDS` cycles (deterministic cycle detection)

Dependencies are architecture metadata. They do not import modules or instantiate implementations.

An `EXACT` requirement for v1 must not silently substitute v2.

Referential integrity of replacement IDs is **deferred**: a deprecation record may name a replacement that is not present in the registry.

## Compatibility model

Compatibility is declared separately from dependency.

`isCompatibilityDeclared(...)` is true only for an explicit `(fromId, fromVersion) → (toId, toVersion)` record.

Missing compatibility does **not** imply compatibility. Same-major versions are not assumed compatible. Compatibility with B v1 does not imply compatibility with B v2.

## Conformance model

Each block carries a `BuildingBlockConformanceProfile`:

- `schemaValidation`
- `semanticValidation`
- `requiredTests`
- `requiredDocumentation`
- `requiredInvariants`

`evaluateBuildingBlockConformanceEvidence` accepts **precomputed** evidence descriptors (test names / doc paths). It does not execute validators, spawn processes, or load plugins.

An implementation descriptor does not imply semantic conformance. Conformance evidence must still match the profile.

## Validator descriptors

Kinds: `TYPE_GUARD`, `SCHEMA_VALIDATOR`, `SEMANTIC_VALIDATOR`, `TEST_SUITE`, `STATIC_ANALYSIS`, `DOCUMENTATION_REVIEW`.

A descriptor identifies the expected mechanism via `kind` + `ref`. Registry data does not embed executable code.

## Example descriptors

Kinds: `VALID`, `INVALID`, `ADVERSARIAL`, `MIGRATION`, `INTEGRATION`.

Refs may be test names, fixture IDs, documentation anchors, or repository paths. R1 does not load those files.

## Implementation descriptors

Fields: `packageName`, `modulePath`, optional `exportSubpath` / `language`, and `status`.

Implementation existence is not inferred from documentation alone.

## Deprecation / supersession

`BuildingBlockDeprecation` may include `deprecatedAt`, replacement id/version, `reason`, `migrationReference`, `migrationGuideRef`, `losslessMigrationKnown`, and `reversibleMigrationKnown`.

Unknown migration properties use `UNKNOWN`.

Deprecation does not delete older definitions. Historical Decision Snapshots, evidence records, and exports may continue to depend on old versions.

`getLatestStableBuildingBlock` never returns DEPRECATED or RETIRED definitions. Those remain queryable by exact id+version.

This metadata prepares a future Semantic Migration Ledger. R1 does not execute migrations.

## Registered stable foundations

| ID                                        | Version | Lifecycle | Implementation                                    |
| ----------------------------------------- | ------- | --------- | ------------------------------------------------- |
| `rockhounding:uges`                       | 1.1.0   | STABLE    | `@rockhounding/shared/uges`                       |
| `rockhounding:geological-layer-registry`  | 1.0.0   | STABLE    | `@rockhounding/shared/geological-layer-registry`  |
| `rockhounding:resource-catalog`           | 1.0.0   | STABLE    | `@rockhounding/shared/resource-catalog`           |
| `rockhounding:source-governance-contract` | 1.0.0   | STABLE    | `@rockhounding/shared/source-governance-contract` |
| `rockhounding:observation`                | 1.0.0   | STABLE    | `@rockhounding/shared/observation-sample-model`   |
| `rockhounding:sample`                     | 1.0.0   | STABLE    | `@rockhounding/shared/observation-sample-model`   |
| `rockhounding:sampling-event`             | 1.0.0   | STABLE    | `@rockhounding/shared/observation-sample-model`   |
| `rockhounding:provenance-activity`        | 1.0.0   | STABLE    | `@rockhounding/shared/provenance-activity-kernel` |
| `rockhounding:truth-clock`                | 1.0.0   | STABLE    | `@rockhounding/shared/truth-clock-availability`   |
| `rockhounding:source-adapter-contract`    | 1.0.0   | STABLE    | `@rockhounding/shared/source-adapter-contract`    |
| `rockhounding:evidence-quarantine`        | 1.0.0   | STABLE    | `@rockhounding/shared/evidence-quarantine`        |

Registry records for these blocks do **not** redefine UGES certainty, confidence, PROHIBITED-as-permission, layer semantics, resource semantics, or source-governance decisions.

## Relationship to UGES

UGES owns evidence assertion semantics, including certainty, confidence, authority, evidence class, and permission status.

The registry records that UGES exists, which version is STABLE, which module implements it, and which tests document its invariants. It does not duplicate `EvidenceAssertionSchema`.

## Relationship to Geological Layer Registry

The layer registry owns layer metadata and capabilities. The building-block record REQUIRES UGES (same major) and REFERENCES the Resource Catalog.

## Relationship to Resource Catalog

The catalog owns resource metadata. The building-block record PROJECTS_TO UGES. Projection helpers remain in the catalog module.

## Relationship to Source Governance

Source Governance owns admission/restriction of source use. The building-block record REFERENCES Resource Catalog and declares compatibility with catalog v1.0.0. Governance decisions are not re-encoded as registry fields.

## Implemented and reserved blocks

Observation, Sample, Sampling Event, Provenance Activity, Truth Clock, Source Adapter Contract, Evidence Quarantine, Evidence Admission, Decision Evidence Contract, Decision Snapshot, Decision Evaluator, Decision Receipt, and Disclosure Governance are STABLE 1.0.0. Historical DRAFT 0.1.0 records remain queryable. See [Observation / Sample Model R1](OBSERVATION_SAMPLE_MODEL.md), [Provenance Activity Kernel R1](PROVENANCE_ACTIVITY_KERNEL.md), [Truth Clock / Evidence Availability R1](TRUTH_CLOCK_AVAILABILITY.md), [Source Adapter Contract R1](SOURCE_ADAPTER_CONTRACT.md), [Evidence Quarantine R1](EVIDENCE_QUARANTINE.md), [Offline Fixture Adapters R1](OFFLINE_FIXTURE_ADAPTERS.md), [Evidence Admission Engine R1](EVIDENCE_ADMISSION_ENGINE.md), [Decision Evidence Contracts R1](DECISION_EVIDENCE_CONTRACTS.md), [Decision Snapshot R1](DECISION_SNAPSHOT.md), [Decision Evaluator R1](DECISION_EVALUATOR.md), and [Decision Receipt R1](DECISION_RECEIPT.md), and [Disclosure Governance R1](DISCLOSURE_GOVERNANCE.md). Offline fixtures implement the source-adapter contract and do not add a building block. The license-to-operation helper is not a separate building block. Evidence availability semantics inside Truth Clock stay there. `rockhounding:evidence-availability` remains a DRAFT placeholder.

Still **DRAFT** v0.1.0 with no separate implementation:

- `rockhounding:evidence-availability`

Planned but **not registered**: Process Contract.

## Agent / Astra consumption boundary

A future agent may read registry records to answer:

- Which contract owns this concept?
- Which version is STABLE?
- What does it depend on?
- Which module implements it?
- Which invariants must not be changed?
- Which validator/test evidence applies?
- Is this block safe for new implementation work?

The registry does **not** grant Astra (or any agent) authority to modify stable semantics. Semantic changes to STABLE blocks require an explicitly versioned phase. Agents must not treat DEPRECATED as latest stable, substitute undeclared versions, or rewrite owning-contract fields from registry metadata.

## Deterministic API

```
createBuildingBlockRegistry(definitions?)
validateBuildingBlockDefinition(input)
validateBuildingBlockRegistry(definitions)
getBuildingBlock(id, version?)
listBuildingBlocks()
listBuildingBlockVersions(id)
getLatestStableBuildingBlock(id)
listBuildingBlocksByCategory(category)
listBuildingBlocksByLifecycle(status)
listDependencies(id, version)
listDependents(id, version?)
isCompatibilityDeclared({ fromId, fromVersion, toId, toVersion })
evaluateBuildingBlockConformanceEvidence(definition, evidence)
```

Requirements: deterministic ordering (id, then version), immutable built-ins, clone-on-read, no mutable singleton, duplicate id+version rejected.

Built-ins: `BUILTIN_BUILDING_BLOCK_DEFINITIONS`.

## R1 limitations

- no persistence
- no dynamic plugin loading
- no remote schema registry
- no runtime code generation
- no migration execution
- no automatic compatibility inference
- no package-version synchronization
- no external standards conformance claim
- no live implementation probing
- no deployment/version discovery
- no repository mutation based on registry metadata
- no automatic semantic upgrades
- no agent authority to rewrite stable contracts
- replacement-id referential integrity is deferred
- cycle detection covers `REQUIRES` and `EXTENDS` only
- Process Contract / Disclosure Policy / Evidence Admission Contract are documented, not registered

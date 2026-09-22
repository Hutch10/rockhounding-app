# Source Adapter Contract (R1)

**Status:** Canonical TypeScript / Zod contract (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/source-adapter-contract`  
**Building block:** `rockhounding:source-adapter-contract` STABLE 1.0.0

An adapter is a translator, not an authority. It may normalize representation. It may not manufacture meaning, certainty, confidence, authority, completeness, permission, absence, currency, or legal effect that the source did not establish.

## Mission

Define how already-supplied source material may be translated into Rockhounding candidate entities, while keeping raw values, identity, governance receipts, temporal state, coverage limits, and provenance lineage intact.

## Non-goals

Not implemented: live network retrieval, provider-specific live adapters, fixture adapters, persistence, quarantine storage, Evidence Admission, Decision Snapshots, legal rule evaluation, automatic provider schema discovery, dynamic normalization plugins, AI execution, background sync, external referential integrity, a full standards conformance claim, or production ingestion.

## Architectural position

| System                              | Responsibility                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Resource Catalog                    | Describes the source or resource                                                |
| Source Governance                   | Decides whether a requested use is allowed, constrained, prohibited, or unknown |
| Truth Clock / Evidence Availability | Preserves temporal state, currency, availability, and coverage                  |
| Source Adapter Contract             | Governs translation of supplied material into candidates                        |
| Future adapter implementation       | Performs a concrete translation                                                 |
| Future Evidence Admission           | Decides whether a candidate may support a conclusion                            |

This contract does not absorb those other responsibilities. Requested operations (`READ`, `TRANSFORM`, `AUTOMATED_QUERY`, `BULK_DOWNLOAD`, `MODEL_INPUT`, `TRAINING_USE`) are execution-context labels carried with a caller-supplied receipt. They are not new Resource Catalog usages and this module does not evaluate Source Governance.

## Adapter definition

`SourceAdapterDefinition` names id, version, schema version, source resource types, input kinds, output kinds, capabilities, a deterministic flag, limitations, required building blocks, and the preconditions that adapter requires. Supported source schema versions are an explicit list. No live provider implementation is required.

## Precondition gate

Required checks may include resource identity, accepted source version, governance context, allowed operation, preserved raw input, temporal context, coverage context, and initialized provenance. A required failure stops translation. Outcomes include `RESOURCE_IDENTITY_MISSING`, `UNSUPPORTED_SOURCE_VERSION`, `GOVERNANCE_UNRESOLVED`, `GOVERNANCE_NOT_ALLOWED`, `TEMPORAL_CONTEXT_INSUFFICIENT`, `COVERAGE_CONTEXT_INSUFFICIENT`, and `PROVENANCE_CONTEXT_MISSING`.

Explicit `UNKNOWN` temporal context passes only when the adapter definition allows it. `UNKNOWN` or `PROHIBITED` governance does not proceed. One allowed operation does not imply another: `READ` is not `TRANSFORM`, `AUTOMATED_QUERY` is not `BULK_DOWNLOAD`, and `MODEL_INPUT` is not `TRAINING_USE`. `adapterAuthorizesUse` is always false.

## Input and output

Inputs are already-supplied structures: raw records, documents, features, observations, sample records, media metadata, local fixtures, derived input, or other. Outputs are candidates, including resource-derived records, geological features, observations, samples, sampling events, UGES assertion candidates, derived products, document evidence, and quarantine candidates. `CANDIDATE` means not yet admitted.

Results are `SUCCESS`, `PARTIAL_SUCCESS`, `QUARANTINED`, or `FAILED`, with diagnostics. Exceptions are not the only failure channel.

## Raw and normalized values

`RawSourceRecord.rawFields` is preserved. Normalization writes a separate `NormalizedSourceRecord` linked by `rawSourceRecordId`. Mappings may be `DIRECT`, `RENAMED`, `ENUM_MAPPED`, `UNIT_NORMALIZED`, `SEMANTIC_NORMALIZATION`, `DERIVED`, `UNMAPPED`, or `IGNORED_BY_CONTRACT`. Ignoring a field requires that explicit mapping type.

Unknown enums, unrecognized terms, and missing required fields are recorded. The raw value stays. No guessed canonical value is written. Vocabulary normalization keeps the source label and the normalized concept. Unit normalization keeps the original value when the mapping is lossless. Declared rules are data (`ENUM_MAPPING`, `UNIT_MAPPING`, `DATE_MAPPING`, `VOCABULARY_MAPPING`, and the other listed kinds). There is no dynamic evaluation.

## Identity

`sourceResourceId` is the Resource Catalog identity. `sourceRecordId` is the provider record id and is not the Rockhounding candidate id. Adapter id and version travel with the result.

## Authority ceiling

Projection uses the existing categorical `EvidenceAuthorityClass` ranks. Output authority may stay equal or move downward. It may not rise. `USER_OBSERVATION`, `COMMUNITY_REPORT`, and `MODEL_DERIVED` cannot become `PRIMARY_AUTHORITY`. `SECONDARY_AUTHORITY` cannot become `PRIMARY_AUTHORITY` through processing. Later transformations are checked against the original source authorities, so authority does not accumulate.

## Truth Clock

Clock fields are set only by an explicit `DATE_MAPPING`. `retrievedAt` is not copied to `sourceUpdatedAt`, and `publishedAt` is not copied to `effectiveFrom`, unless the mapping sets `declaredTemporalEquivalence`. Missing timestamps stay missing. Invalid timestamps produce `INVALID_TEMPORAL_VALUE`. Successful retrieval does not imply source currency.

## Availability and coverage

Record, geometry, and temporal coverage, known missing classes, availability state, and reason are copied through. `PARTIAL` and `UNKNOWN` cannot be promoted to `COMPLETE` because retrieval succeeded. `confirmedAbsence` is always false, including zero results with partial or unknown coverage.

## Provenance

A successful, partial, or quarantined result can name the source resource, adapter id, adapter version, raw input, and normalized record. A version change remains visible even when the normalized fields match. Provenance does not manufacture truth. There is no graph store in this contract.

## Observation, sample, and UGES

Observation, sample, and sampling-event candidates stay distinct. A sample record without sampling provenance does not gain a sampling-event candidate. A sample does not become an observation. Model-generated content cannot be claimed as `DIRECT`. A UGES output remains an unverified candidate: no fabricated certainty, confidence, verified flag, or `PROHIBITED` permission.

## Partial success and quarantine

Partial success lists what was emitted, what stayed unknown, and whether downstream use of the successful portion is contractually safe. When a required semantic cannot be normalized and the adapter declares `QUARANTINE_ON_UNKNOWN`, the result is `QUARANTINED` and still carries source identity, version, raw input, adapter id and version, diagnostics, truth-clock context, governance receipt, provenance, and coverage. Malformed records are not dropped. Quarantine candidates are held by [Evidence Quarantine R1](EVIDENCE_QUARANTINE.md).

## Source versions and determinism

An undeclared source version returns `UNSUPPORTED_SOURCE_VERSION`. Tolerant mode, when explicitly enabled, must surface a diagnostic and must not hide the mismatch. A deterministic adapter yields the same semantic result for the same input, adapter version, and configuration. Inputs are not mutated.

## R1 limitations

No live network retrieval, provider live adapter, persistence, quarantine storage, Evidence Admission, Decision Snapshot, legal evaluation, automatic schema discovery, dynamic plugins, AI execution, background sync, external referential integrity, standards-conformance claim, or production ingestion.

## Later phases

Quarantine candidates are held by [Evidence Quarantine R1](EVIDENCE_QUARANTINE.md). The first controlled implementation is [Offline Fixture Adapters R1](OFFLINE_FIXTURE_ADAPTERS.md): local fixtures only, no network. Adapter success is not admission. Purpose eligibility is [Evidence Admission Engine R1](EVIDENCE_ADMISSION_ENGINE.md). The next phase is `ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1`. Live ingestion stays closed.

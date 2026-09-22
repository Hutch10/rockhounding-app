# Offline Fixture Adapters (R1)

Deterministic local fixtures are the first executable proof that source material can move through the closed contracts. They implement `rockhounding:source-adapter-contract`. They are not a new stable building block, and they are not a live provider.

## Mission

A known fixture must be identifiable, governable, mappable, and normalizable without losing raw meaning. It must carry an explicit truth clock, a provenance activity, and the right candidate kind. Unsafe mapping must enter Evidence Quarantine. The same fixture, adapter version, and execution context must reproduce the same semantic result.

## Why fixtures exist

Resource Catalog, Source Governance, the Source Adapter Contract, Truth Clock, Provenance, Observation / Sample, UGES, and Evidence Quarantine were closed as persistence-free contracts. This phase shows those contracts can be composed on synthetic input. Provider coverage is out of scope.

## Why live ingestion stays closed

No fixture contacts a network. There is no USGS, BLM, NWS, NASA FIRMS, Macrostrat, or Mindat client, no browser retrieval, no credential, and no production ingestion path. A passing fixture does not authorize a live read.

## Fixture families

| Case                                                      | What it exercises                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `fixture-geology-clean`                                   | Raw `Qal` preserved, concept `quaternary-alluvium`, source label retained, geological and UGES candidates |
| `fixture-observation-hardness`                            | Direct observation, raw result `scratches glass`, no fabricated material identification                   |
| `fixture-sample-specimen`                                 | Sample candidate, provider id distinct from canonical id, no sampling event                               |
| `fixture-zero-partial` / `fixture-zero-unknown-coverage`  | Zero rows with partial or unknown coverage, no confirmed absence                                          |
| `fixture-coverage-complete`                               | Complete coverage represented, still not admitted                                                         |
| `fixture-unknown-enum`                                    | `ZX-UNKNOWN` stays raw and is quarantined                                                                 |
| `fixture-optional-unmapped`                               | Optional unknown field yields partial success                                                             |
| `fixture-unsupported-version`                             | Source version `99` against supported version `1`                                                         |
| `fixture-authority-elevation`                             | Community source claimed as primary authority                                                             |
| `fixture-temporal-ambiguity`                              | Raw date `2025` with no declared meaning                                                                  |
| `fixture-governance-unknown` / `prohibited` / `read-only` | Required transform blocked; read does not imply transform                                                 |
| `fixture-geology-multistage`                              | Source, normalization, then derived candidate                                                             |

## Adapter identities

| Id                                         | Input                                 | Output                                                                              |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------- |
| `rockhounding:fixture-geology-adapter`     | Feature, local fixture, derived input | Geological feature, UGES candidate, derived product, quarantine candidate           |
| `rockhounding:fixture-observation-adapter` | Observation, local fixture            | Observation candidate, quarantine candidate                                         |
| `rockhounding:fixture-sample-adapter`      | Sample record, local fixture          | Sample candidate, sampling-event candidate only when sampling provenance is present |

Each definition is version `1.0.0`, supports source version `1`, declares `DETERMINISTIC_TRANSLATION`, and requires a transform operation. `runFixtureAdapterCase` and `replayFixtureCatalog` replay these cases. Expectations are structural: status, candidate kinds, quarantine reasons, raw preservation, and absence of admission.

## Raw preservation

Normalized values live beside the raw record. `Qal` remains `Qal`. `ZX-UNKNOWN` is not replaced with a guessed lithology. `2025` is not rewritten into `publishedAt`, `effectiveFrom`, or `phenomenonTime`. Provider specimen id `fixture-specimen-001` stays distinct from `canonicalCandidateId`.

## Governance context

Receipts are synthetic. `READ` allowed and `TRANSFORM` allowed are separate. An `UNKNOWN` or `PROHIBITED` decision fails the adapter precondition and emits no canonical candidate. The raw record remains representable in quarantine. These receipts do not prove rights to any external provider.

## Truth Clock

The clean geology fixture maps `publishedAt` to `2018-06-01T00:00:00.000Z` and `retrievedAt` to `2026-09-22T12:00:00.000Z`. `sourceUpdatedAt` stays absent. The ambiguous year is quarantined as temporal ambiguity (`TEMPORAL_MEANING_UNKNOWN`). No timestamp is invented.

## Provenance

Successful translation records a provenance activity whose process id and version are the fixture adapter. The activity uses the fixture source and can generate the normalized record. The multi-stage case keeps a source-lineage edge to `fixture-geology-001` and a processing-lineage edge through `norm:raw-geology-001`. Activity hashes use the existing provenance SHA-256 scope. Provenance does not manufacture truth or raise authority. Both stages of the geology fixture remain `SECONDARY_AUTHORITY`.

## Observation and sample

The hardness fixture emits one `OBSERVATION_CANDIDATE` with origin `DIRECT`. It is not a UGES assertion and it does not invent a material identification. The specimen fixture emits one `SAMPLE_CANDIDATE`. Requesting a sampling event without sampling provenance records `SAMPLING_PROVENANCE_ABSENT` and does not create the event. A sample does not become an observation.

## UGES candidate boundary

The geology fixture may emit `UGES_ASSERTION_CANDIDATE` with admission `CANDIDATE` and `verified: false`. Certainty and confidence are unset. That candidate is not evidence admission.

## Quarantine

Unsafe results use Evidence Quarantine R1 via `quarantineFromAdapterResult`. Distinct reasons covered here:

- unsupported source version
- unknown required enum
- authority elevation
- temporal ambiguity
- governance unknown or prohibited

Quarantine keeps raw fields, source identity, adapter id and version, diagnostics, governance receipt, truth-clock context, and coverage. `admitted` stays false.

## Zero results and coverage

Zero rows with `PARTIAL` or `UNKNOWN` record coverage produce no candidates and `confirmedAbsence: false`. `COMPLETE` coverage can be represented on a successful candidate and still does not admit evidence. A coverage gap is not “nothing exists here.”

## R1 limitations

- Offline fixtures only
- No live provider
- No network
- No authentication
- No production data
- No real provider SLA assumptions
- No persistence
- No background sync
- No Evidence Admission
- No Decision Snapshot
- No production ingestion
- Fixtures do not establish real-world provider licensing or semantics
- Fixtures are architectural validation, not source certification

## Next phase

`ROCKHOUNDING_EVIDENCE_ADMISSION_ENGINE_R1` is the purpose-specific gate in [Evidence Admission Engine R1](EVIDENCE_ADMISSION_ENGINE.md). A fixture candidate that translates successfully is not thereby admitted. The phase after admission is `ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1`. Live ingestion stays closed.

# Evidence Admission Engine (R1)

Evidence Admission answers one question: may this candidate evidence support this purpose?

It does not answer what field action the user should take.

## Mission

Candidate evidence can exist, parse, look recent, come from a strong source, and still be unfit for a particular question. Admission evaluates an explicit policy for role, domain-scoped authority, purpose, time, coverage, provenance, independence, contradiction, availability, quarantine, and governance. The result is an immutable receipt.

## Non-goals

Admission is not source authority, certainty, confidence, Source Governance, Truth Clock, Evidence Availability, adapter translation, Evidence Quarantine, a Decision Snapshot, or a legal, collection, or safety decision.

## Architectural position

Source Adapter creates candidates. Evidence Quarantine holds unsafe material. Evidence Admission decides whether a candidate may support a defined purpose. Future Decision Evidence Contracts will say what a decision class requires. A future decision engine may use admitted evidence. Admission does not collapse into that decision.

## Admission and truth

`ADMITTED` means eligible to support the specified purpose. It does not mean true, verified, legally sufficient, or resolved. `UNKNOWN` inputs are not treated as `REJECTED` by renaming them. Missing, unresolved, quarantined, or conflicted states fail closed as `REJECTED`, `DEFERRED`, `INSUFFICIENT_INFORMATION`, `CONFLICTED`, or `QUARANTINED`, according to the failing gate.

## Evidence roles

Roles say what evidence may do. They are declared. They are not inferred from authority class.

| Role                     | May do                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `DISCOVERY`              | Suggest where to investigate                                         |
| `CORROBORATING`          | Strengthen an already supported proposition                          |
| `NEGATIVE`               | Support non-detection only when coverage and detectability allow     |
| `DECISION`               | Participate directly in a decision contract                          |
| `AUTHORITATIVE_DECISION` | Satisfy a requirement that explicitly demands authoritative evidence |

A primary geological source with role `DISCOVERY` still fails a policy that allows only `DECISION`.

## Domain-scoped authority

Authority is evaluated in the policy domain. Geological authority does not satisfy a collection-rule requirement. A road source does not become geological authority. A collection-rule source does not own mineral-estate truth. A user observation can be admitted for corroboration and remains a user observation.

## Purpose fitness

The candidate declares the purposes it offers to support. The same record can be fit for `GEOLOGICAL_CONTEXT` or `HISTORICAL_REVIEW` and unfit for current `SITE_ACCESS`. A sample record can support `SPECIMEN_IDENTIFICATION` and still fail `COLLECTION_PERMISSION`.

## Temporal requirements

Admission consumes a Truth Clock fitness and freshness result. It does not recompute provider age. Requirements are `ANY_TEMPORAL_STATE`, `CURRENT_REQUIRED`, `REVALIDATION_ALLOWED`, `HISTORICAL_ACCEPTABLE`, `MAX_AGE_REQUIRED`, and `EFFECTIVE_AT_DECISION_TIME`.

`CURRENT_REQUIRED` rejects stale fitness and fails closed on unknown fitness. `HISTORICAL_ACCEPTABLE` allows a known historical record. `REVALIDATION_ALLOWED` can admit with a limitation when revalidation is still required.

## Coverage requirements

Each of record, geometry, and temporal coverage can require `COMPLETE_REQUIRED`, `PARTIAL_ALLOWED`, `UNKNOWN_ALLOWED`, or `NOT_APPLICABLE`. Partial or unknown coverage fails a complete requirement. Partial coverage can pass only where the policy allows it.

## Negative evidence

`NO RECORD FOUND` is not verified absence. A negative role or `ABSENCE_INFERENCE` purpose requires complete record coverage, present search effort, addressed detectability, source suitability, and temporal applicability. A successful query with zero rows and partial or unknown coverage is rejected. R1 does not implement a full search-effort or detectability model. It rejects absence claims when those prerequisites are missing.

## Provenance requirements

Requirements are `NONE`, `BASIC`, `SOURCE_TRACEABLE`, `PROCESS_TRACEABLE`, and `FULL_REQUIRED`. Source lineage does not satisfy a processing requirement. Processing lineage does not satisfy a source requirement. Full traceability requires both. Missing lineage is rejected. Admission does not manufacture provenance.

Discovery-oriented policies may accept basic provenance. Authoritative-decision policies may require source and processing traceability.

## Governance boundary

Source Governance stays separate. A policy may require an allowed use. `ALLOWED` does not force admission. `PROHIBITED` blocks admission when lawful use is required. `UNKNOWN` governance fails closed. High-quality evidence does not override a prohibited use.

## Independence

Independence is lineage-based: `INDEPENDENT`, `SAME_UPSTREAM_SOURCE`, `DERIVED_FROM_SAME_SOURCE`, or `UNKNOWN_INDEPENDENCE`. Distinct upstream lineage ids are counted. Three downstream records that repeat one upstream id count as one lineage. Unknown independence fails when a minimum count is required. There is no numeric independence score.

## Contradiction policy

Policies are `ALLOW_CONFLICT`, `REQUIRE_NO_UNRESOLVED_CONFLICT`, `REQUIRE_AUTHORITATIVE_RESOLUTION`, and `DEFER_ON_CONFLICT`. Unresolved conflict under a strict policy yields `CONFLICTED`. Allowing conflict can admit with a limitation. The engine does not select a preferred source. Resolution belongs to later reconciliation.

## Quarantine boundary

A candidate whose quarantine state is still active is `QUARANTINED` or `DEFERRED`. It is not `ADMITTED`. A resolved quarantine record may be evaluated again under the normal policy. A quarantine disposition of `ADMIT_CANDIDATE` is not Evidence Admission `ADMITTED`.

## UGES boundary

An assertion may be a candidate. Admission does not change its certainty, confidence, authority, or permission. A `VERIFIED` geological assertion can be inadmissible for collection permission. A `SUPPORTED` assertion can be admissible for corroboration. Admission does not create `PROHIBITED`.

## Observation and sample boundary

A direct field observation may be admitted as corroboration. Admission does not promote it to authority. A sample may support specimen context. Physical existence and full provenance do not prove site legality or collection permission.

## Fixture candidates

A clean geology fixture candidate can be admitted for `GEOLOGICAL_CONTEXT` when the policy is satisfied. The same candidate is not automatically admissible for `COLLECTION_PERMISSION`. Adapter `SUCCESS` is not `ADMITTED`. A fixture quarantine case stays blocked.

## Receipts

Every evaluation returns a frozen receipt with the request id, candidate id, policy id and version, decision, reasons, evaluation time, domain, purpose, role, input references, temporal fitness, coverage, provenance, authority, independence, contradiction, and limitations. Generating the receipt does not change the candidate.

## Fail-closed behavior

Where a gate needs an affirmative state and the input is unknown, missing, unresolved, quarantined, or conflicted, the engine does not admit. The status names the failure. It does not guess.

## Future Decision Evidence Contracts

[Decision Evidence Contracts R1](DECISION_EVIDENCE_CONTRACTS.md) is the completeness layer after admission. `ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1` defines, per decision class, required domains, roles, authority, time, coverage, independence, contradiction policy, and unresolved factors. Completeness is not a field outcome. The next phase is `ROCKHOUNDING_DECISION_SNAPSHOT_R1`.

## R1 limitations

- No persistence
- No database
- No live provider
- No decision engine
- No Decision Snapshot
- No complete legal rules engine
- No probabilistic scoring
- No numeric evidence score
- No full Search Effort / Detectability model
- No automated contradiction resolution
- No automatic authority promotion
- No automatic UGES mutation
- No production ingestion
- No external certification

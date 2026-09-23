# Decision Evidence Contracts (R1)

Decision Evidence Contracts answer one question: do we have the admitted evidence required to evaluate this decision?

Completeness means the contract's evidence requirements are satisfied. It does not mean the later decision is favorable. A collection-permission contract can be `COMPLETE` while a future evaluator finds collection prohibited.

## Non-goals

This module does not choose a field action. It does not emit a permission, access, closure, or safety result. It does not run a legal rules engine, score opportunity, schedule revalidation, persist a Decision Snapshot, or ingest a live provider.

## Architectural position

Source adapters create candidates. Evidence Quarantine holds unsafe material. Evidence Admission decides whether a candidate may support a purpose. A Decision Evidence Contract states what admitted evidence a decision class requires. A future decision evaluator interprets rule content. A future Decision Snapshot records the contract version and receipts used at a time.

## Completeness versus outcome

`COMPLETE` means the required admitted evidence is present. `COMPLETE_WITH_LIMITATIONS` means it is present with explicit limitations. `INCOMPLETE` means a required gap remains. `UNRESOLVED` means applicability or a deferred contradiction is not established. `CONFLICTED` means credible admitted evidence disagrees and the contract does not allow that disagreement to pass quietly. `REVALIDATION_REQUIRED` means time-sensitive evidence is stale or the target time is still ahead. `NOT_APPLICABLE` means every non-optional requirement was explicitly out of scope.

None of these statuses is an outcome.

## Decision classes

`COLLECTION_PERMISSION`, `SITE_ACCESS`, `ROUTE_ACCESS`, `CLOSURE_STATUS`, `SAFETY_STATUS`, `GEOLOGICAL_CONTEXT`, `GEOLOGICAL_OPPORTUNITY`, `MINING_CLAIM_STATUS`, `LAND_OWNERSHIP_STATUS`, `LAND_MANAGEMENT_STATUS`, `SPECIMEN_IDENTIFICATION`, `FIELD_VISIT_READINESS`, and `OTHER`.

Collection permission is not site access. Land ownership is not mineral estate or claim status. Geological opportunity does not imply collecting rights.

## Requirement model

Each requirement names a domain, a purpose, allowed evidence roles, and optional authority, temporal, coverage, provenance, independence, contradiction, availability, and candidate-kind constraints. Those fields reuse Evidence Admission vocabulary. The contract does not invent a second temporal model.

`requiredCount` counts admitted bundles. `independenceMinimum` counts distinct upstream lineage ids.

## Requirement groups

Groups are `ALL_OF`, `ANY_OF`, or `AT_LEAST_N_OF`. An optional requirement never blocks completeness. A satisfied `ANY_OF` or `AT_LEAST_N_OF` group does not let an unmet sibling block the contract. There is no general-purpose rule language.

## Gaps

Every unmet non-applicable criterion produces a `DecisionEvidenceGap` with a stable reason: missing domain, missing role, authority, temporal fitness, revalidation, coverage, provenance, independence, contradiction, quarantine, availability, count, not applicable, or other. Blocking gaps are the ones that change completeness.

## Domain isolation

A receipt satisfies a requirement only when its admission domain and purpose match that requirement. Geology does not fill a collection-rule requirement. Surface ownership does not fill mineral estate. A road record does not fill geology or closure. Sample provenance does not fill collection permission.

## Admitted-evidence linkage

A bundle carries the candidate, the Evidence Admission receipt, and the admission policy id and version. Only `ADMITTED` and `ADMITTED_WITH_LIMITATIONS` receipts can satisfy a normal requirement. Rejected, quarantined, conflicted, and insufficient receipts do not. Adapter success without an admitted receipt does not. A receipt admitted for geological context does not satisfy a collection-permission purpose.

## Temporal requirements and future target time

Current, revalidation-allowed, historical, max-age, and effective-at-decision-time requirements consume the fitness already on the candidate. Historical geology can satisfy `GEOLOGICAL_CONTEXT`. Stale closure evidence yields `REVALIDATION_REQUIRED`.

If `targetDecisionTime` is later than `evaluatedAt` and the requirement is time-sensitive, currently fit evidence still needs revalidation unless the caller sets `revalidatedForTarget`. Nothing is scheduled.

## Coverage, independence, and contradiction

Complete, partial, unknown, and not-applicable coverage modes match Evidence Admission. Partial coverage cannot complete a complete-coverage requirement. Zero results with partial coverage do not establish claim-free or open-site completeness.

Independence counts unique `upstreamLineageIds`. Three downstream copies of one report count once. Empty lineage ids fail closed when a minimum is set. There is no numeric score.

Unresolved contradiction under a strict policy makes the requirement `CONFLICTED`. `ALLOW_CONFLICT` can yield `COMPLETE_WITH_LIMITATIONS`. The module does not pick a winner.

## Applicability

`ALWAYS` requirements are always evaluated. `CONTEXT` requirements read a caller-supplied key: `APPLICABLE`, `NOT_APPLICABLE`, or `UNRESOLVED`. A missing key is `UNRESOLVED`, not silently out of scope. The contract does not infer whether a mining claim matters.

## Builtin contracts

Collection permission requires land-management, collection-rule, and closure evidence admitted for `COLLECTION_PERMISSION`, plus claim and mineral-estate evidence when the caller marks those keys applicable. No geology bundle can fill those requirements.

Site access requires ownership or management, plus road evidence and closure evidence, all admitted for `SITE_ACCESS`. A road record alone is incomplete.

Route access requires road, closure, and land-management evidence admitted for `ROUTE_DECISION`, with complete route geometry. Map visibility is not legal access.

Closure status requires current closure-domain evidence with complete record coverage. A partial or empty result does not mean the site is open. Stale closure evidence requires revalidation.

Safety status requires safety-domain evidence. Weather and fire evidence are optional families. This is not a hazard engine.

Geological context requires geology evidence and allows historical fitness. Mineral occurrence is optional. A collection rule does not substitute for geology.

Geological opportunity accepts geology or mineral-occurrence evidence admitted for discovery. It does not score an opportunity.

Mining-claim status requires complete current claim evidence. A claim-absence requirement activates only when the caller marks it applicable, and it accepts only admitted negative evidence. A zero-result query is not claim-free completeness.

Land ownership and land management are separate contracts. Neither receipt satisfies the other.

Specimen identification accepts an admitted field observation or specimen-identification record. That evidence does not establish collection permission.

Field-visit readiness reports whether access, closure, safety, and geological-context evidence are all present. It is not a go or no-go result.

## Versions

Every contract has an id, a version, and a decision class. `selectDecisionEvidenceContract` returns the requested version. Evaluation uses the contract object it is given, so an older version stays reproducible after a newer one exists.

## Future Decision Snapshot

[Decision Snapshot R1](DECISION_SNAPSHOT.md) freezes the contract version, admitted receipts, gaps, contradictions, and target time used for an evaluation. [Decision Evaluator R1](DECISION_EVALUATOR.md) is the outcome layer. [Decision Receipt R1](DECISION_RECEIPT.md) freezes that outcome. `ROCKHOUNDING_DECISION_EVALUATOR_R1` does not authorize a live provider. The readiness gate is recorded in [First Live Provider Readiness Gate](FIRST_LIVE_PROVIDER_READINESS_GATE.md). It does not authorize a live provider.

## R1 limitations

- No final decision evaluator
- No permission result
- No safety result
- No closure-status result
- No legal rules engine
- No persistence
- No live provider
- No Decision Snapshot implementation yet
- No automated revalidation scheduling
- No probabilistic completeness score
- No provider-specific policy
- No production ingestion

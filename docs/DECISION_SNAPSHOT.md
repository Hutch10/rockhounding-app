# Decision Snapshot (R1)

A Decision Snapshot answers one question: what evidence, contracts, policies, gaps, contradictions, and temporal context did we have at that moment?

It does not answer what the decision outcome was. A future Decision Receipt would freeze an outcome. This record freezes the input state.

## Non-goals

No persistence, database, final evaluator, Decision Receipt, permission result, safety result, closure result, go or no-go result, signatures, public-key infrastructure, blockchain, automatic replay, automatic reanalysis, live provider, or production ingestion. External referential integrity is deferred. Internal consistency of the supplied snapshot is checked.

## Identity and exact contract pinning

Every snapshot has an id, schema version 1, a decision class, and `createdAt`. It pins `contractId` and `contractVersion`. There is no `latest` alias. Replay reads the pinned version even after a newer contract exists.

## Context

Optional references may name a location, geometry, site, route, or sample. `evaluatedAt` is required. `targetDecisionTime` may be later than creation, which lets a Monday snapshot record that Saturday still needs revalidation. Applicability keys supplied by the caller are preserved. The snapshot does not infer them.

## Evidence and admission receipts

Each evidence reference keeps the candidate id and kind, admission receipt id, admission policy id and version, admission decision, domain, purpose, role, and the temporal fitness already on the receipt. Snapshot creation does not re-run Evidence Admission and does not copy a whole mutable upstream object. Evidence, gaps, contradictions, policies, and context parameters are stored in canonical order so input order does not change the integrity hash.

## Completeness, gaps, and contradictions

The snapshot copies the Decision Evidence Contract evaluation it was given. It does not recompute completeness against a newer contract. Blocking gaps and non-blocking limitations both remain. Unresolved contradictions are recorded with their evidence ids and resolution state. No winner is chosen.

## Time

`evaluatedAt`, optional `targetDecisionTime`, per-candidate temporal fitness, and whether revalidation was required are stored as they were at creation. Later clock movement does not rewrite the snapshot. Truth Clock is not called and is not mutated.

## Immutability and supersession

The returned snapshot is deep-frozen. A correction is a new snapshot whose supersession names the prior id, a reason, and a time. The prior snapshot stays addressable. A snapshot cannot supersede itself.

## Replay and reanalysis

Replay metadata pins the contract version, admission policy versions, evidence ids, receipt ids, schema version, process version, provenance activity id, and integrity hash. Reanalysis is a separate descriptor that names a prior snapshot id. Creating that descriptor does not change the prior snapshot. This module does not execute either path.

## Provenance and integrity

The caller supplies the provenance activity id for snapshot creation. Upstream provenance ids are not invented. The integrity hash is SHA-256 over scope `canonical-decision-snapshot-v1`. It covers the decision class, pinned contract, context, canonical evidence and policies, completeness, gaps, contradictions, and temporal context. It excludes the snapshot id, supersession, and software version. The same canonical content produces the same hash. A contract, evidence, or gap change produces a different hash. The hash is content consistency, not a digital signature, source authenticity, legal authority, or truth.

## Examples

A collection-permission snapshot can be complete enough to evaluate, or incomplete with a missing collection-rule gap, and still contain no permission result. Claim applicability stays whatever the caller supplied.

A field-visit-readiness snapshot can preserve complete road, closure, safety, and geological-context evidence and still contain no go or no-go result.

A geological-context snapshot can stay complete on historical geology. A later snapshot may use newer geology. The first snapshot keeps the fitness it recorded.

## Future Decision Evaluator

[Decision Evaluator R1](DECISION_EVALUATOR.md) consumes a valid snapshot and an exact synthetic rule set. [Decision Receipt R1](DECISION_RECEIPT.md) freezes that outcome. `ROCKHOUNDING_DECISION_SNAPSHOT_R1` does not produce an outcome and does not store a receipt id. The next phase is `ROCKHOUNDING_FIRST_LIVE_PROVIDER_READINESS_GATE`.

## R1 limitations

- No persistence
- No database
- Snapshot R1 itself produces no outcome; the evaluator is a separate contract
- Snapshot R1 does not store a receipt id
- No permission result
- No safety result
- No closure result
- No go or no-go result
- No signatures or public-key infrastructure
- No blockchain
- No automatic replay execution
- No automatic reanalysis
- No live provider
- No production ingestion
- External referential integrity is deferred

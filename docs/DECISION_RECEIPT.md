# Decision Receipt (R1)

A Decision Receipt freezes the outcome an evaluator produced from one snapshot, one rule set, and one evaluator version.

A Decision Snapshot freezes the input context. The receipt references that snapshot. The snapshot does not store a receipt id.

## Non-goals

No persistence, database, receipt history store, signatures, public-key infrastructure, blockchain, automated replay, automated reanalysis, live provider, production ingestion, or legal certification. R1 rules remain synthetic. External referential integrity is deferred.

## Identity and pinning

Each receipt has an id, schema version 1, `createdAt`, `evaluatedAt`, and a decision class. It pins the snapshot id and hash, contract id and version, rule-set id and version, and evaluator id and version. There is no `latest` alias. `evaluatedAt` comes from the evaluation. `createdAt` is the receipt freeze time.

## Outcome, reasons, and limitations

The outcome is copied from the evaluation result. Reason codes, details, rule ids, rule versions, and source references are retained. Limitations supplied by the evaluator are retained, including on `ALLOWED_WITH_CONDITIONS` and `READY_WITH_LIMITATIONS`. A caller-supplied limitation list that disagrees with the evaluation is rejected. Completeness status is copied from the snapshot and is not recomputed.

## Integrity

The hash is SHA-256 over scope `canonical-decision-receipt-v1`. It covers the decision class, snapshot id and hash, contract, rule set, evaluator, outcome, canonical reasons, limitations, applied rules, evidence ids, completeness status, `evaluatedAt`, and the evaluation provenance activity. Receipt id, creation time, supersession, and reanalysis links are outside the hash, so a second freeze of the same evaluation matches. Reasons sort by code, rule id, then detail. Limitations, applied rules, and evidence ids sort lexicographically. The hash shows canonical equivalence. It does not prove source authenticity, legal correctness, human identity, authority, or truth.

## Supersession, replay, and reanalysis

A later receipt may name an earlier receipt, a reason, and a time. The earlier receipt stays unchanged. A receipt cannot supersede itself. Replay metadata pins the historical snapshot, contract, rule set, and evaluator. Reanalysis is a new receipt with kind `REANALYSIS_OF`. A new snapshot, rule set, or evaluator version produces a new receipt. This module does not execute replay or reanalysis.

## Boundaries

Receipt creation checks that the evaluation candidate names the same snapshot id and hash, and that the outcome agrees with the decision class. It does not call the evaluator. The outcome is not UGES certainty, confidence, or authority. A collection outcome does not change source-use governance, and this module does not call Source Governance. Upstream provenance ids are not invented. The caller may supply separate activity ids for the evaluation and for receipt creation.

## Next gate

`ROCKHOUNDING_FIRST_LIVE_PROVIDER_READINESS_GATE` is recorded in [First Live Provider Readiness Gate](FIRST_LIVE_PROVIDER_READINESS_GATE.md). The receipt does not select or contact a provider. The gate decision is `CONDITIONALLY_READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER`. The next phase is `ROCKHOUNDING_LIVE_READ_PATH_CONTROLS_R1`.

## R1 limitations

- No persistence
- No database
- No receipt history store
- No signatures or public-key infrastructure
- No blockchain
- No automated replay
- No automated reanalysis
- No live provider
- No production ingestion
- No legal certification
- Synthetic decision rules remain the only R1 rules
- External referential integrity is deferred

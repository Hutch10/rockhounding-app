# Temporal semantics and coverage

## Temporal — PASS

Evidence: `TruthClockSchema` fields and `forbiddenTemporalInference` in the adapter contract. Freshness uses an explicit `referenceTimestampKind`.

Finding: retrieval time is not copied into source-update time. Publication time is not copied into effective time. Stale is not false.

Blocker: none.

## Coverage / absence — PASS

Evidence: `SourceCoverageMetadataSchema`, `EvidenceAvailabilityState` (`MISSING`, `FETCH_FAILED`, `COVERAGE_GAP`), adapter `confirmedAbsence: false`, and admission negative-evidence checks.

Finding: a zero `resultCount` stays a count. It becomes confirmed absence only when coverage is complete and the admission negative-evidence conditions hold.

Blocker: none.

## Rate / API — PASS

Evidence: `rateLimit` on the access profile, `RATE_LIMITED` limitation and availability reason, `PROVIDER_ERROR`, `NETWORK_FAILURE`.

Finding: these states are distinct from `MISSING`. No retry client exists. A partial page must be emitted as `PARTIAL` coverage plus `RATE_LIMITED`, not as `COMPLETE`.

Blocker: none.

## Outage — PASS

Evidence: availability states and the evaluator completeness gate, which withholds affirmative outcomes when required evidence is incomplete or unresolved.

Finding: provider downtime does not become an operational allow.

Blocker: none.

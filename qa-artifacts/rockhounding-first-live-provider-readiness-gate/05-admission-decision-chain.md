# Admission and decision chain

## Evidence admission — PASS

Evidence: `packages/shared/src/evidence-admission.ts`. A candidate is judged for one domain, purpose, and role. Quarantine blocks admission unless the policy explicitly allows it. `fixtureInvokesEvidenceAdmission` is false.

Finding: live adapter success would still be only a candidate.

## Decision relevance — PASS

Evidence: decision classes and purpose-specific contracts. Collection permission does not treat geology-domain evidence as legal permission. The evaluator does not call Source Governance or UGES.

Finding: the architecture can limit the first provider to one domain and one purpose. This gate does not pick that provider.

## Replayability — PASS

Evidence: snapshot hash scope `canonical-decision-snapshot-v1` and receipt hash scope `canonical-decision-receipt-v1`. Receipt pins snapshot hash, contract version, rule-set version, and evaluator version. Reanalysis is a new receipt.

Finding: historical outcome reconstruction uses those pins. It does not call the current provider. Raw bytes and adapter version remain separate objects cited by provenance id. If they are lost, re-derivation stops. It does not fall through to a latest adapter.

## Fixture equivalence — PASS

Evidence: `packages/shared/src/offline-fixture-adapters.ts`. Cases are local, deterministic, and can quarantine. `fixtureAdaptersContactNetwork` is false.

Finding: the first provider must add its own fixture module before a live call. The existing harness is the pattern.

Blocker: none. The disclosure and license conditions are recorded on the other pages.

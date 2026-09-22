# Offline Fixture Adapters R1 — implementation

Fixtures call `translateSourceMaterial` and, when the outcome is unsafe or blocked, `quarantineFromAdapterResult`. Provenance activities use `validateProvenanceActivity`, `validateProvenanceGraph`, and `hashProvenanceActivity`.

Adapters:

- `rockhounding:fixture-geology-adapter` 1.0.0
- `rockhounding:fixture-observation-adapter` 1.0.0
- `rockhounding:fixture-sample-adapter` 1.0.0

No new stable building block. No network client. No change to stable contract semantics.

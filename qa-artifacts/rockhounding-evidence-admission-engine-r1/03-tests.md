# Evidence Admission Engine R1 — tests

`packages/shared/src/evidence-admission.test.ts`: 16 tests covering the numbered admission, role, domain, purpose, temporal, coverage, negative-evidence, quarantine, provenance, governance, independence, contradiction, UGES, observation, sample, fixture, receipt, registry, and coordinator cases, including adversarial cases A–J.

Related suites re-run green:

- building-block-registry (22)
- evidence-quarantine (11)
- source-adapter-contract (18)

Full `pnpm test:ci`: 61 files, 797 tests, exit 0. Prior baseline was 60 files / 781 tests.

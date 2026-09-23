# Disclosure, secrets, off-switch, production isolation

## Authentication / secrets — PASS

Evidence: `authenticationRequired` is `REQUIRED`, `NOT_REQUIRED`, or `UNKNOWN`. Availability reason `AUTH_REQUIRED`. Provenance agent references have no secret field.

Finding: the first provider should need no secret. A write or admin credential is unsuitable. Secrets must not enter source, fixtures, logs, or provenance.

Blocker: none.

## Sensitive location / disclosure — CONDITIONAL

Evidence: no disclosure, redaction, or coordinate-precision contract under `packages/shared/src`. `docs/OBSERVATION_SAMPLE_MODEL.md` lists disclosure-policy enforcement as not implemented.

Finding: the platform cannot withhold or coarsen exact coordinates before public output, export, or shadow display. Closed live ingestion is the only current containment.

Blocker: missing disclosure boundary.

Remediation: add a persistence-free classification (`PUBLIC_COARSE`, `EXACT_COORDINATE_WITHHELD`, `SENSITIVITY_UNKNOWN`) that fails closed before any public materialization. Unknown sensitivity is not public. The control does not grant collection permission.

## Off-switch — PASS

Evidence: governance `SUSPENDED` and `REJECTED` fail `evaluateSourceAdmission`. Adapter governance preconditions fail closed. No provider database table exists.

Finding: disablement is a governance state, not a migration. The future HTTP client must check that state before a request. Existing receipts stay immutable.

## Production isolation — PASS

Evidence: no fetch path in the foundational modules. Coordinator: live ingestion stays closed.

Required later stages, not authorized here: fixture, shadow read, live-versus-fixture comparison, quarantine and admission, non-authoritative display, and only then a separate production-decision authorization.

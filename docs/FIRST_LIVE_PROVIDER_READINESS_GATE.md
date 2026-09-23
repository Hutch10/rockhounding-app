# First Live Provider Readiness Gate

**Decision:** `CONDITIONALLY_READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER`

**Phase:** `ROCKHOUNDING_FIRST_LIVE_PROVIDER_READINESS_GATE`

**Starting HEAD:** `706f849f8829f6caf787af2231196f9cbd4a7cd0` on `feat/sprint-4-field-mode`

This document is an audit. It does not select a provider, contact an API, add credentials, or grant production decision authority. Live ingestion stays closed.

## Purpose

The question is whether one live source can enter the existing chain without weakening truth governance, provenance, rights, temporal semantics, replayability, or decision safety.

A live record gets no extra authority because it is live. It must follow the same path as a fixture:

Resource → Governance → Adapter → Truth Clock → Provenance → Candidate → Quarantine or Admission → Decision Contract → Snapshot → Evaluator → Receipt.

## Readiness definitions

Each dimension is `PASS`, `CONDITIONAL`, `FAIL`, or `NOT_APPLICABLE`. There is no numeric score.

| Token                                                   | Meaning                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER`               | No failing dimension and no unresolved control that a live call could skip.                            |
| `CONDITIONALLY_READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER` | The chain holds. One or more bounded, testable controls are still required before the first live call. |
| `NOT_READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER`           | A foundational boundary is missing, or a live source could bypass it.                                  |

This gate is conditional. Provider selection does not start until the remediation phase passes.

## Dimension results

| #   | Dimension                       | Result      |
| --- | ------------------------------- | ----------- |
| 1   | Source governance               | PASS        |
| 2   | Licensing / terms               | CONDITIONAL |
| 3   | Resource identity               | PASS        |
| 4   | Source versioning               | PASS        |
| 5   | Adapter contract                | PASS        |
| 6   | Raw preservation                | PASS        |
| 7   | Temporal semantics              | PASS        |
| 8   | Coverage / absence              | PASS        |
| 9   | Provenance                      | PASS        |
| 10  | Quarantine                      | PASS        |
| 11  | Evidence admission              | PASS        |
| 12  | Decision relevance              | PASS        |
| 13  | Replayability                   | PASS        |
| 14  | Rate / API constraints          | PASS        |
| 15  | Authentication / secrets        | PASS        |
| 16  | Sensitive location / disclosure | CONDITIONAL |
| 17  | Outage / failure behavior       | PASS        |
| 18  | Fixture equivalence             | PASS        |
| 19  | Off-switch / rollback           | PASS        |
| 20  | Production isolation            | PASS        |

No dimension is `FAIL`.

### Source governance — PASS

`evaluateSourceAdmission` fails closed for `CANDIDATE`, `SUSPENDED`, and `REJECTED`. A use must be listed in `allowedUses` and absent from `deniedUses`. Governance cannot authorize collection, elevate authority, interpret law, or generate a UGES assertion.

The adapter precondition `GOVERNANCE_OPERATION_ALLOWED` accepts only a supplied reference whose decision is `ALLOWED` and whose `allowedOperations` contain the requested operation. `UNKNOWN` and `PROHIBITED` stop the adapter. Public accessibility is not an allow decision.

Mechanical operations stay separate: `READ`, `TRANSFORM`, `AUTOMATED_QUERY`, `BULK_DOWNLOAD`, `MODEL_INPUT`, `TRAINING_USE`. Constrained use is a `RESTRICTED` governance status plus limitations and a narrowed operation list. There is no `ALLOWED_WITH_CONSTRAINTS` token.

The schema does not force every adapter definition to list the governance preconditions. The offline fixtures list all eight. The first live adapter must do the same. That is an acceptance rule for the remediation phase, not a missing governance model.

### Licensing / terms — CONDITIONAL

The resource license profile can record `licenseId`, `licenseRef`, attribution, redistribution, offline caching, and derivative use, each as `ALLOWED`, `PROHIBITED`, or `UNKNOWN`. Governance records `reviewState` and `effectiveFrom` / `effectiveTo`.

What is not joined:

- The adapter checks the caller-supplied operation list. It does not read `ResourceLicenseProfile`.
- `MODEL_INPUT` and `TRAINING_USE` are operations. They are not license-profile fields.
- There is no separate terms-basis field or `reviewedAt`. `licenseRef`, `reviewState`, and `effectiveFrom` are the current places.

**Remediation before the first live call:** one governance record and one license profile for the chosen resource; `allowedOperations` is exactly one of `READ` or `AUTOMATED_QUERY`; `BULK_DOWNLOAD`, `MODEL_INPUT`, and `TRAINING_USE` stay out unless the recorded terms explicitly allow them; `reviewState` is `REVIEWED` and `effectiveFrom` is the review time. A redistribution `PROHIBITED` license must not be paired with `BULK_DOWNLOAD`.

### Resource identity — PASS

A `ResourceRecord` id is the catalog identity. `ResourceProvider.id` is the provider. `ResourceIdentifiers` holds `providerRecordId`, DOI, URI, and catalog or version identifiers. The access profile holds the endpoint. Raw records repeat `sourceResourceId` and `sourceRecordId`. Provider identity stays distinct from a Rockhounding entity id.

### Source versioning — PASS

An adapter declares `supportedSourceVersions`. With `tolerantUnsupportedVersion: false`, an unknown version fails as `UNSUPPORTED_SOURCE_VERSION`. Quarantine can hold that record as `SOURCE_VERSION_UNSUPPORTED` without dropping the raw fields. Silent tolerant parsing is an explicit adapter flag. The first live adapter must set that flag to false.

### Adapter contract — PASS

The only executable adapters are the offline fixtures, and they implement `rockhounding:source-adapter-contract`. A result keeps raw and normalized records separate, an authority ceiling, governance context, truth-clock context, provenance, coverage, and quarantine-ready diagnostics. Adapter success creates candidates. It does not admit evidence or emit a decision.

### Raw preservation — PASS

`RawSourceRecord` keeps `rawFields`, source record id, source version, retrieval reference, and optional raw payload reference. Normalization writes a separate record and field mappings. Unmapped source fields are not rewritten into a guessed canonical value. `IGNORED_BY_CONTRACT` must be declared.

### Temporal semantics — PASS

`TruthClock` distinguishes phenomenon time, effective interval, source recorded time, publication time, source update time, retrieval time, verification time, decision use, revalidation, and expiry. Mapping `retrievedAt` onto `sourceUpdatedAt`, or `publishedAt` onto `effectiveFrom`, is rejected unless a mapping declares that equivalence. Freshness policy names its reference timestamp. Retrieval time is not the default currency.

### Coverage / absence — PASS

Coverage can be `COMPLETE`, `PARTIAL`, or `UNKNOWN`, separately for records, geometry, and time, with `knownMissingClasses` and `resultCount`. Availability states include `MISSING`, `FETCH_FAILED`, `COVERAGE_GAP`, and `ACCESS_RESTRICTED`. Adapter results hard-code `confirmedAbsence: false`. Admission treats a zero-result as absence only when coverage is complete and negative-evidence conditions hold. A successful empty response is not “nothing exists here.”

### Provenance — PASS

`SOURCE_RETRIEVAL` is a provenance activity kind. The adapter result records resource id, adapter id, adapter version, raw record id, and normalized record id, and `manufacturesTruth` is false. A snapshot and a receipt cite a provenance activity id. Upstream ids are not invented. A live retrieval that skips this chain is outside the contract.

### Quarantine — PASS

`quarantineFromAdapterResult` is the holding path. Status and reason codes cover unsupported source version, unknown enum, missing required field, temporal ambiguity, coverage ambiguity, provenance deficiency, governance block, and authority elevation. Quarantine does not admit, verify, or establish absence. Disposition `ADMIT_CANDIDATE` does not admit evidence.

### Evidence admission — PASS

Admission is purpose-specific: domain, purpose, role, authority, temporal fitness, coverage, provenance, independence, and contradiction policy. A quarantined candidate is refused unless the policy explicitly allows it. Adapter success is not admission. Admission is not a field outcome.

### Decision relevance — PASS

The decision chain can scope one class and one purpose. The first provider should serve one evidence domain and one decision purpose, with read-only access, explicit versioning, and fixture equivalence. This gate does not choose the source. Multi-domain legal or community mixes are a poor first provider.

### Replayability — PASS

A receipt pins snapshot id and hash, contract version, rule-set version, evaluator id and version, outcome, reasons, limitations, and `evaluatedAt`. A later evaluator or rule set produces a new receipt. The historical receipt is not rewritten. Adapter id and version live on the adapter provenance object; the snapshot cites the provenance activity id and the raw record stays a separate object. External storage of those objects is deferred. Losing them blocks re-derivation. It does not substitute a “latest” adapter.

### Rate / API constraints — PASS

`ResourceAccessProfile.rateLimit`, `ResourceLimitationCode.RATE_LIMITED`, and availability reasons `RATE_LIMITED`, `NETWORK_FAILURE`, and `PROVIDER_ERROR` are distinct from `MISSING`. Coverage may stay `PARTIAL` with a `resultCount`. No retry implementation exists, so none can collapse a failed fetch into missing evidence. A future adapter must emit `PARTIAL` plus `RATE_LIMITED` when a page stops early.

### Authentication / secrets — PASS

Access authentication is `REQUIRED`, `NOT_REQUIRED`, or `UNKNOWN`. Availability can record `AUTH_REQUIRED` and `ACCESS_RESTRICTED`. Provenance records have no credential field. The preferred first provider needs no secret. A broad write or admin credential is out of scope. No secret belongs in source, fixtures, logs, or provenance.

### Sensitive location / disclosure — CONDITIONAL

No contract classifies, coarsens, or withholds coordinates before public materialization, export, or shadow display. The observation model states that disclosure-policy enforcement is not implemented. “Hidden in the UI” is not a control.

Live ingestion is closed, so nothing is leaking today. The chain still cannot stop a later adapter from carrying exact protected coordinates into a public surface.

**Remediation:** a persistence-free disclosure boundary that can mark geometry `PUBLIC_COARSE`, `EXACT_COORDINATE_WITHHELD`, or `SENSITIVITY_UNKNOWN`, and that fails closed before any public, export, or shadow display. Unknown sensitivity does not become public. This boundary does not decide collection permission.

### Outage / failure behavior — PASS

`FETCH_FAILED`, `RATE_LIMITED`, `PROVIDER_ERROR`, `AUTH_REQUIRED`, `COVERAGE_GAP`, `MISSING`, and `UNKNOWN` are different availability states. Incomplete or unresolved decision evidence withholds affirmative outcomes. An outage does not become “site open,” “claim free,” or “collection allowed.”

### Fixture equivalence — PASS

Offline fixture adapters already run local cases through the adapter contract into quarantine, without network, admission, or a decision. `LOCAL_FIXTURE` is an input kind. The first live provider adds its own minimized fixture, expected output, quarantine cases, and admission cases before any live call. The current geology, observation, and sample fixtures are the pattern, not the future provider.

### Off-switch / rollback — PASS

`SUSPENDED` and `REJECTED` governance fail admission. An adapter with the governance preconditions fails closed when the reference is missing, unknown, or prohibited. No database migration exists to undo. No provider is a single point of truth. The future client must consult governance before any request. Disabling the provider must not change receipts already issued.

### Production isolation — PASS

There is no live retrieval path and no production decision authority for provider data. Required stages, in order:

1. Offline fixture.
2. Live shadow read-only retrieval.
3. Compare live bytes with fixture semantics.
4. Quarantine and admission validation.
5. Controlled non-authoritative display, after the disclosure boundary.
6. Production decision use only under a later, separate authorization.

This gate authorizes none of stages 2 through 6.

## Selection criteria

Do not select a provider in this phase. The preferred first source has as many of these as possible:

- one bounded domain and one decision purpose
- authoritative or clearly curated
- read-only documented API or structured download
- clear terms that fit the license profile
- no scraping
- no exact protected coordinates, or coordinates that the disclosure boundary can withhold
- no write credential
- stable identifiers and a versioned schema
- explicit temporal metadata
- manageable rate limits
- a usable fixture sample
- explicit coverage semantics
- low consequence when unavailable

Avoid as the first provider: scraped or database-extraction-restricted sources, broad secrets, dangerous empty-result semantics, mixed legal and community assertions, and sources that require public exact coordinates.

## Staged introduction and fail-closed rules

Fixture first. Shadow read second. Production decision use is not implied by a later shadow success.

Fail closed when governance is unresolved, the source version is unsupported, coverage is partial, retrieval fails, or disclosure sensitivity is unknown. A disabled provider returns no candidate and does not rewrite history.

## Adversarial cases

| Case                                      | Result                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| A. HTTP 200 and zero results              | Held. Empty success is not confirmed absence.                            |
| B. Enum change without a version bump     | Held. Unknown required values quarantine.                                |
| C. Schema version change                  | Held when tolerant parsing is off.                                       |
| D. Provider down                          | Held. `FETCH_FAILED` is not `MISSING`.                                   |
| E. Public data, redistribution prohibited | Conditional. The license field exists; the adapter does not read it yet. |
| F. Geology without legal permission       | Held. Geology does not yield collection `ALLOWED`.                       |
| G. Stale authoritative data               | Held. Stale can require revalidation and is not false.                   |
| H. Exact sensitive coordinates            | Not held by a contract. This is the disclosure condition.                |
| I. Rate limit after a partial page        | Held if the adapter emits `PARTIAL` and `RATE_LIMITED`.                  |
| J. Upstream correction after a receipt    | Held. The old receipt stays. Reanalysis is a new receipt.                |

## Residual blockers before the first live call

1. Public disclosure boundary for exact coordinates.
2. License-profile binding to the single allowed read operation, including an explicit prohibition on bulk redistribution, model input, and training use unless the recorded terms allow them.
3. The first live adapter definition must include every source-adapter precondition, `tolerantUnsupportedVersion: false`, and a fixture module that passes before any network call.

`rockhounding:evidence-availability` remains DRAFT. Truth Clock 1.0.0 already carries the availability states this gate relies on. Do not promote the draft as part of this audit.

## Next phase

The two conditional dimensions are remediated by [Live Read Path Controls R1](LIVE_READ_PATH_CONTROLS.md) (`ROCKHOUNDING_LIVE_READ_PATH_CONTROLS_R1`). This gate decision stays `CONDITIONALLY_READY_FOR_FIRST_LIVE_READ_ONLY_PROVIDER`. The controls phase does not select or contact a provider.

After that phase passes, the next phase is `ROCKHOUNDING_FIRST_LIVE_PROVIDER_SELECTION_R1`.

# Truth Clock / Evidence Availability (R1)

**Status:** Canonical TypeScript / Zod contract (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/truth-clock-availability`  
**Building block:** `rockhounding:truth-clock` STABLE 1.0.0

Evidence availability is part of this block in R1. `rockhounding:evidence-availability` remains a DRAFT placeholder and is not a second schema authority.

## Mission

Truth Clock answers when something happened, was recorded, published, retrieved, verified, used, or became due for revalidation.

Evidence availability answers why the system currently cannot rely on or obtain evidence.

These are not certainty, confidence, authority, or permission.

## Non-goals

Not implemented: persistence, polling, schedulers, live provider checks, a provider-specific freshness registry, Decision Snapshots, automatic UGES mutation, automatic invalidation, a Query Coverage Certificate object, a future-trip scheduler, a temporal database, timezone normalization beyond ISO-8601 validation, legal inference, or an external standards conformance claim.

## Timestamp semantics

All timestamps are optional. Missing values stay missing.

| Field                           | Meaning                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `phenomenonTime`                | When the real-world phenomenon occurred                                                                                                      |
| `effectiveFrom` / `effectiveTo` | When the statement is in force. Open-ended if one side is absent. Equal bounds are allowed. `effectiveTo` before `effectiveFrom` is rejected |
| `sourceRecordedAt`              | When the source recorded the observation or fact                                                                                             |
| `publishedAt`                   | When a source published it. Not inferred from `effectiveFrom`                                                                                |
| `sourceUpdatedAt`               | When the source content was last updated. Not inferred from `retrievedAt`                                                                    |
| `retrievedAt`                   | When Rockhounding retrieved it                                                                                                               |
| `verifiedAt`                    | When Rockhounding verified it                                                                                                                |
| `decisionUsedAt`                | When it was used for a decision                                                                                                              |
| `revalidateAfter`               | When revalidation becomes due                                                                                                                |
| `expiresAt`                     | Policy expiry instant. Expiry does not delete the record                                                                                     |

Future timestamps are allowed.

## Freshness

States: `CURRENT`, `AGING`, `REVALIDATION_REQUIRED`, `STALE`, `UNKNOWN`.

A policy names `referenceTimestampKind` (`SOURCE_UPDATED`, `PUBLISHED`, `RETRIEVED`, `VERIFIED`, `PHENOMENON`, `UNKNOWN`), `maxAgeMs`, optional `warningAgeMs`, `revalidateBeforeUse`, and `useContexts`.

Evaluation at a caller-supplied `now`:

- No reference timestamp → `UNKNOWN`
- Past `expiresAt`, or age ≥ `maxAgeMs` → `STALE`
- `revalidateAfter` reached, or `revalidateBeforeUse` → `REVALIDATION_REQUIRED`
- Age ≥ `warningAgeMs` → `AGING`
- Otherwise → `CURRENT`

`STALE` means not fit for that policy's operational use. The historical record remains. `CURRENT` is not authority. Evaluation does not mutate the clock.

## Availability

States: `AVAILABLE`, `STALE`, `MISSING`, `FETCH_FAILED`, `COVERAGE_GAP`, `UNRESOLVED`, `CONFLICTED`, `NOT_APPLICABLE`, `ACCESS_RESTRICTED`, `UNKNOWN`.

| State               | Meaning                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `MISSING`           | Expected evidence is absent                                       |
| `FETCH_FAILED`      | An attempt failed                                                 |
| `COVERAGE_GAP`      | The source does not cover the case                                |
| `UNRESOLVED`        | Evidence exists but does not settle the question                  |
| `CONFLICTED`        | Credible evidence disagrees                                       |
| `NOT_APPLICABLE`    | The question does not apply                                       |
| `ACCESS_RESTRICTED` | The resource exists but cannot be accessed under current controls |

Reasons include `NO_RECORD_RETURNED`, `NETWORK_FAILURE`, `PROVIDER_ERROR`, `RATE_LIMITED`, `AUTH_REQUIRED`, `LICENSE_RESTRICTION`, geographic/temporal/geometry/record coverage codes, `SOURCE_CONFLICT`, precision/scale limits, `UNVERIFIED_CURRENCY`, `NOT_APPLICABLE`, and `OTHER`, plus optional detail.

`ACCESS_RESTRICTED` is not Source Governance `PROHIBITED`. `availabilityAuthorizesUse` is always false.

## Coverage and negative results

Optional `recordCoverage`, `geometryCoverage`, and `temporalCoverage`: `COMPLETE` | `PARTIAL` | `UNKNOWN`, plus `knownMissingClasses`.

`confirmedAbsenceEstablished` is always false. Zero results with `PARTIAL` or `UNKNOWN` coverage do not prove absence. `COMPLETE` coverage can be represented and still does not prove absence. A future Evidence Admission contract decides whether absence is admissible.

## Temporal fitness

Outcomes: `FIT`, `FIT_WITH_WARNING`, `REVALIDATION_REQUIRED`, `NOT_FIT`, `UNKNOWN`. These are not confidence.

Policies are selected by `useContexts`. A specific context match wins over a policy with an empty context list. No matching policy yields `UNKNOWN`.

The same clock can be `FIT` for `HISTORICAL_REVIEW` and `NOT_FIT` for `COLLECTION_DECISION`. `STALE` freshness maps to `NOT_FIT`. `AGING` maps to `FIT_WITH_WARNING`.

Contexts: `DISCOVERY`, `GEOLOGICAL_CONTEXT`, `FIELD_NAVIGATION`, `COLLECTION_DECISION`, `SAFETY_DECISION`, `ROUTE_DECISION`, `SCIENTIFIC_ANALYSIS`, `HISTORICAL_REVIEW`.

## Resource Catalog

`projectResourceTemporalToTruthClock` copies only present catalog fields: `publishedAt`, `updatedAt` → `sourceUpdatedAt`, `effectiveFrom` / `effectiveTo`, `acquiredOrObservedFrom` → `phenomenonTime`. It does not set `retrievedAt` or copy `publishedAt` into `effectiveFrom`.

## Observation / Sample

`projectObservationTimesToTruthClock` maps `observedAt` → `phenomenonTime` and `recordedAt` → `sourceRecordedAt`. The Observation schema is unchanged. A historical phenomenon time remains valid after operational freshness expires.

## Provenance

`provenanceExecutionIsTruthState` is always false. Activity `startedAt` / `endedAt` are process times. A retrieval activity may coexist with a separately recorded `retrievedAt`. Provenance semantics are unchanged.

## UGES

`truthClockCreatesUgesAssertion` and `truthClockMutatesCertainty` are always false. UGES `STALE` certainty is not redefined. A future assertion phase may consult freshness. This kernel does not write certainty, confidence, or permission.

## Source Governance

Availability records access restriction. Governance still decides whether a use is permitted.

## Future work

Decision Snapshots may store the clock and fitness used at decision time. Query Coverage Certificates may reuse the coverage fields. A revalidation engine may schedule checks. None of those run in R1.

## R1 limitations

- no persistence
- no polling
- no scheduler
- no live provider checks
- no provider-specific freshness policy registry
- no Decision Snapshot implementation
- no automatic UGES mutation
- no automatic invalidation
- no Query Coverage Certificate object
- no future-trip scheduler
- no temporal database
- no external standards conformance claim
- no timezone normalization service beyond ISO-8601 validation
- no legal decision inference

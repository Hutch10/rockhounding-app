# Decision Evaluator (R1)

The Decision Evaluator answers one question: given this immutable snapshot and these exact rules, what outcome follows?

It answers from that context only. A future Decision Receipt freezes the outcome. The snapshot remains the input record.

## Non-goals

No real jurisdiction rule library, Regulation Compiler, persistence, database, live provider, production ingestion, automated rule retrieval, rule scraping, legal certification, probabilistic scoring, machine-learned decisioning, universal safety guarantee, Decision Receipt storage, automated replay engine, or automated reanalysis engine.

## Snapshot boundary

`evaluateDecision` accepts a Decision Snapshot plus a versioned rule set. Raw evidence, an admission receipt alone, and a contract evaluation alone are rejected. The snapshot is validated, including its integrity hash, before any outcome is chosen. The snapshot and the rule set are not mutated.

## Decision classes

R1 evaluates `COLLECTION_PERMISSION`, `SITE_ACCESS`, `ROUTE_ACCESS`, `CLOSURE_STATUS`, and `FIELD_VISIT_READINESS`. Geological opportunity scoring and specimen-identification finality are outside this phase.

## Outcome vocabularies

Collection permission: `ALLOWED`, `ALLOWED_WITH_CONDITIONS`, `PROHIBITED`, `UNRESOLVED`, `REVALIDATION_REQUIRED`, `CONFLICTED`.

Site access: `ACCESSIBLE`, `ACCESSIBLE_WITH_CONDITIONS`, `NOT_ACCESSIBLE`, `UNRESOLVED`, `REVALIDATION_REQUIRED`, `CONFLICTED`.

Route access: `ROUTE_OPEN`, `ROUTE_OPEN_WITH_CONDITIONS`, `ROUTE_CLOSED`, `ROUTE_STATUS_UNRESOLVED`, `REVALIDATION_REQUIRED`, `CONFLICTED`.

Closure status: `OPEN`, `CLOSED`, `RESTRICTED`, `UNKNOWN`, `REVALIDATION_REQUIRED`, `CONFLICTED`.

Field-visit readiness: `READY`, `READY_WITH_LIMITATIONS`, `NOT_READY`, `REVALIDATION_REQUIRED`, `UNRESOLVED`, `CONFLICTED`.

These statuses are evaluator outputs. They are not written back into UGES certainty, Source Governance, Truth Clock, or Evidence Admission. Readiness language is used in place of an absolute safety claim.

## Completeness gate

`COMPLETE` may evaluate. `COMPLETE_WITH_LIMITATIONS` may evaluate when policy allows, and the limitations stay on the result. `INCOMPLETE` and `UNRESOLVED` withhold an affirmative outcome. Strict conflict handling returns `CONFLICTED`. `REVALIDATION_REQUIRED` returns `REVALIDATION_REQUIRED` unless the snapshot records `revalidatedForTarget`. A later permissive rule does not override missing required evidence. Closure with incomplete coverage returns `UNKNOWN`. Route access with incomplete context returns `ROUTE_STATUS_UNRESOLVED`.

## Rules

Each synthetic rule has an id, version, decision class, domain, effect, optional conditions, limitations, coverage, priority, specificity, supersession, and source reference. Effects are `PERMIT`, `PERMIT_WITH_CONDITIONS`, `PROHIBIT`, `RESTRICT`, `CLOSE`, `OPEN`, `WARN`, `REQUIRE_REVALIDATION`, and `UNRESOLVED`. There is no general legal language. A geology-domain rule does not authorize collection. A source-use allowance does not authorize a field action.

Rules are ordered by id and version so input order does not change the result. An explicit `supersedesRuleId` removes the named rule. Higher specificity wins when it is set. Remaining rules with different effects and no explicit precedence return `CONFLICTED`. A higher version number does not win. A more restrictive effect does not win by default.

## Class behavior

Collection permission returns `PROHIBITED` for an explicit synthetic prohibition, `ALLOWED` for an explicit permission on complete evidence, and `ALLOWED_WITH_CONDITIONS` when conditions or snapshot limitations apply. Missing legal evidence, including a geology-only context, stays `UNRESOLVED`.

Site access returns `ACCESSIBLE`, `ACCESSIBLE_WITH_CONDITIONS`, or `NOT_ACCESSIBLE` from explicit synthetic access or closure rules. Missing or stale critical evidence stays non-affirmative.

Route access returns `ROUTE_OPEN`, `ROUTE_OPEN_WITH_CONDITIONS`, or `ROUTE_CLOSED` from explicit rules. Partial or unknown context stays `ROUTE_STATUS_UNRESOLVED`.

Closure status returns `CLOSED`, `RESTRICTED`, or `OPEN` from explicit current evidence. No record with incomplete coverage returns `UNKNOWN`.

Field-visit readiness returns `READY` when required context is complete and no blocker applies, `READY_WITH_LIMITATIONS` when non-blocking limits remain, and `NOT_READY` for a blocking closure or access rule. It is a bounded readiness status, not a guarantee that a visit is safe.

## Time, reasons, and limitations

`evaluatedAt` and `targetDecisionTime` come from the snapshot. The evaluator does not read a wall clock. Every result includes reason codes and retains snapshot limitations on affirmative outcomes. Rule source references are copied onto the applied reason.

## Replay and reanalysis

The same snapshot, rule-set version, and evaluator version `1.0.0` produce the same result. A later rule set is a new evaluation. Requesting an unimplemented evaluator version records that version and withholds an affirmative outcome, leaving the `1.0.0` replay unchanged. Reanalysis is a new result that may name a prior evaluation id.

## Provenance and neighboring contracts

The caller may attach a provenance activity id. Upstream provenance ids are not invented. Source Governance is not called. UGES certainty and confidence are not mutated. The result keeps the snapshot id, hash, contract version, and evidence and receipt ids so a future Decision Receipt can freeze the outcome.

## R1 limitations

- Synthetic rules only
- No real jurisdiction rule library
- No Regulation Compiler
- No persistence
- No database
- No live provider
- No production ingestion
- No automated rule retrieval
- No rule scraping
- No legal certification
- No probabilistic scoring
- No machine-learned decisioning
- No universal safety guarantee
- No Decision Receipt implementation yet
- No automated replay engine
- No automated reanalysis engine

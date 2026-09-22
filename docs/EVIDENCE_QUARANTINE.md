# Evidence Quarantine (R1)

**Status:** Canonical TypeScript / Zod contract (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/evidence-quarantine`  
**Building block:** `rockhounding:evidence-quarantine` STABLE 1.0.0

Unsafe evidence is preserved, explained, and isolated. It is not silently accepted and it is not silently discarded.

## Mission

Hold source material and diagnostics that cannot yet safely enter canonical evidence flow, without rewriting the raw capture.

## Non-goals

Not implemented: persistence, a quarantine table, review UI, live ingestion, provider adapters, Evidence Admission, automated adjudication, AI resolution, automatic duplicate merge, automated reprocessing, legal inference, production ingestion, or external referential-integrity enforcement.

## Architectural position

| System                    | Responsibility                                             |
| ------------------------- | ---------------------------------------------------------- |
| Source Adapter Contract   | Translates supplied material into candidates               |
| Evidence Quarantine       | Holds material that cannot safely proceed                  |
| Future Evidence Admission | Decides whether a valid candidate may support a conclusion |
| Future review             | May resolve a quarantined item                             |

Quarantine is a truth-preserving holding state, not a rejection bin.

## Lifecycle

A record has a current `status` and an immutable `capture`. The capture keeps the original status, reasons, raw source, adapter reference, governance receipt, Truth Clock context, coverage, provenance, diagnostics, and any candidate. Later review appends history, dispositions, resolutions, reprocessing links, or a duplicate assessment. Those appends do not rewrite the capture.

Terminal statuses are `RESOLVED`, `REJECTED`, and `SUPERSEDED`. Leaving a terminal status is rejected. History timestamps are strictly increasing. An actor may be `SYSTEM`.

## Status and reason

Status and reason stay separate. A record may carry more than one reason. `SEMANTICALLY_UNMAPPED` is not `SCHEMA_INVALID`. `GOVERNANCE_BLOCKED` is not `REJECTED`. Resolution does not erase the captured reasons.

Statuses include pending review, schema invalid, semantically unmapped, unsupported source version, authority conflict, temporal ambiguity, coverage ambiguity, incomplete provenance, governance blocked, duplicate suspected, manual review, resolved, rejected, and superseded.

Reason codes include invalid schema, missing fields, unknown enums, unrecognized terms, ambiguous values, unsupported versions, authority elevation, governance unknown or prohibited, invalid or unknown time, partial or unknown coverage, missing provenance, missing source identity, duplicate candidate, normalization failure, unsupported geometry or output, manual review, and other.

## Raw preservation

Every record keeps raw fields or a raw payload reference. `sourceRecordId` may be absent. `sourceResourceId` may be absent only when `SOURCE_IDENTITY_MISSING` is an explicit reason. Unknown enums and unsupported source versions stay in the capture. Normalization output, when present, is stored beside the raw fields.

## Dispositions and resolution

Dispositions are `KEEP_QUARANTINED`, `RETURN_FOR_REPROCESSING`, `ADMIT_CANDIDATE`, `REJECT`, `SUPERSEDE`, and `DEFER`. `ADMIT_CANDIDATE` means the quarantine problem is resolved enough for a future Evidence Admission pass. `admitted` stays false. `verified` stays false. Quarantine never marks evidence verified.

A resolution records kind, why, when, and an optional resolver. It can name a newer governance receipt. The captured receipt stays the one from quarantine time. The original reason remains.

## Reprocessing and duplicates

A reprocessing link names the previous adapter version, the new adapter version, and optional new candidate or quarantine refs. The original record is not rewritten. A newer candidate does not delete quarantine history.

Duplicate state is `SUSPECTED`, `CONFIRMED`, or `DISMISSED`, with structured matching signals. R1 does not merge records and does not use a numeric confidence score.

## Governance, time, coverage, authority, provenance

`UNKNOWN` or `PROHIBITED` governance can quarantine the material and does not authorize downstream use. A later resolution does not replace the historical receipt.

The Truth Clock context at quarantine time is kept. A later temporal resolution is appended. An ambiguous raw value such as `2025` is not guessed into phenomenon, publication, or effective time.

`PARTIAL` and `UNKNOWN` coverage are retained. Zero results with unknown coverage do not become confirmed absence.

An authority elevation attempt is `AUTHORITY_CONFLICT` with `AUTHORITY_ELEVATION_ATTEMPT`. The attempted claim stays visible. Quarantine does not downgrade it into valid authoritative evidence.

Provenance is copied when the upstream result actually has it. A missing provenance context can itself be the quarantine reason. Quarantine does not invent an activity id.

## Source Adapter integration

`quarantineFromAdapterResult` accepts a Source Adapter `QUARANTINED` result and copies adapter id and version, raw fields, diagnostics, source version, governance receipt, coverage, truth-clock candidate, and candidate output. It does not mutate the adapter result.

## R1 limitations

No persistence, quarantine database, review UI, automated adjudication, evidence admission, live adapters, provider-specific logic, AI resolution, automatic duplicate merge, automated reprocessing, legal inference, production ingestion, or external referential-integrity enforcement.

## Later phases

[Offline Fixture Adapters R1](OFFLINE_FIXTURE_ADAPTERS.md) send unsafe fixture translations here. The next phase is `ROCKHOUNDING_EVIDENCE_ADMISSION_ENGINE_R1`. Live ingestion stays closed. Network access stays prohibited.

# Source Governance Contract (R1)

**Status:** Canonical TypeScript / Zod contract (persistence-free)  
**Schema version:** `1`  
**Package export:** `@rockhounding/shared/source-governance-contract`

## Purpose

The Source Governance Contract answers **whether a cataloged source may be admitted** into a downstream workflow, under which uses, and with which hard prohibitions.

It does **not** describe what a resource is, what a geological layer can do, or what a piece of evidence asserts.

## Non-goals

Not implemented: persistence, live retrieval, adapters, authentication, legal-rule execution, collection authorization, UGES assertion generation, authority promotion, referential integrity, health monitoring, or automatic revalidation polling.

## Architecture boundary

| Component                      | Role                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| **UGES**                       | Evidence assertions                                        |
| **Geological Layer Registry**  | Layer semantics and capabilities                           |
| **Resource Catalog**           | Discoverable resources                                     |
| **Source Governance Contract** | Admission / restriction / review policy for those subjects |
| **Building Block Registry**    | Future: reusable processing/building-block catalog         |
| **Adapters**                   | Future: translate resource content into UGES assertions    |

Governance records reference Resource / Layer / Provider IDs. They do not merge those catalogs.

## Authority, collection, and law

Every record must set:

- `authorityPromotion: PROHIBITED`
- `collectionAuthorization: PROHIBITED`
- `legalInterpretation: PROHIBITED`
- `assertionGeneration: PROHIBITED`

`evaluateSourceAdmission` may admit `COLLECTION_DECISION_INPUT` as a **use**. That still does not authorize collecting.

`governanceAuthorizesCollection`, `governanceElevatesAuthority`, `governanceCreatesUgesAssertion`, and `governanceInterpretsLaw` are always `false`.

Community/user subjects cannot receive authority promotion.

## Status and admission

Statuses: `CANDIDATE`, `ADMITTED`, `RESTRICTED`, `SUSPENDED`, `DEPRECATED`, `REJECTED`.

`CANDIDATE`, `SUSPENDED`, and `REJECTED` are not admissible. `DEPRECATED` is limited to `RESEARCH_ONLY` when that use is allowed. `ADMITTED` / `RESTRICTED` admit only uses listed in `allowedUses` and not in `deniedUses`.

Admission classes: `UNGOVERNED`, `GOVERNED_METADATA`, `GOVERNED_DECISION_INPUT`, `RESEARCH_ONLY`.

Revalidation policy is declarative only: `NEVER`, `ON_EXPIRY`, `BEFORE_DECISION_USE`. No polling.

## Temporal window

Optional `effectiveFrom` / `effectiveTo`. Open-ended allowed; `from > to` rejected.

## Identity

Opaque stable governance IDs, distinct from resource IDs and layer IDs. Missing subject IDs are allowed in R1.

## API

```
createSourceGovernanceContract(records?)
validateSourceGovernanceRecord(input)
getSourceGovernanceRecord(id)
listSourceGovernanceRecords(contract)
listGovernanceByStatus(contract, status)
listGovernanceBySubject(contract, kind, id)
evaluateSourceAdmission(record, use)
```

Clone-on-read. Duplicate IDs rejected. Deterministic id order.

## Built-ins

Metadata-only policies for NGMDB, MRDS, 3DEP, MLRS, NWS, FIRMS, example regulation document, local field observations, and derived terrain analysis.

## R1 limitations

- no persistence
- no live retrieval
- no source adapters
- no referential integrity
- no cycle detection
- no health monitoring
- no execution
- no legal-rule interpretation
- no automatic revalidation

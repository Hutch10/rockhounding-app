# Fee-site / pay-to-dig support (Rocky Atlas)

**Contract:** `rockhounding:fee-site-support`  
**Module:** `@rockhounding/shared/fee-site-support`  
**Schema version:** 1

## Purpose

Make fee mines / pay-to-dig sites a first-class **site type** on the canonical location model without a parallel fee-mine application, without inventing legal permission, and without nationwide speculative ingest.

## Invariants

- Site type ≠ VISIT / COLLECT / ROUTE permission
- Operating status ≠ collecting permission
- Operator-advertised material ≠ VERIFIED geology
- Known price ≠ guaranteed current price
- Mapped fee site ≠ currently open
- `TEST_ONLY` fixtures never publish
- Social / secondary directory sources are discovery leads only

## Reused architecture

| Concept                   | Existing                                                    | Product                                       |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| Fee site class            | `LegalTag.LEGAL_FEE_SITE`, Postgres `access_model.FEE_SITE` | `SiteType.FEE_MINE`                           |
| Public collecting         | `LEGAL_PUBLIC` / `PUBLIC_LAND`                              | `PUBLIC_COLLECTING`                           |
| Operating status (legacy) | `Status` enum                                               | Mapped from `OperatingStatus`                 |
| Materials                 | `materials` + `location_materials`                          | Claims with certainty + occurrence type       |
| Field / Quick Log / finds | Existing V1 entities                                        | Same models; location_id + metadata site type |

## Persistence

Immediate: typed `locations.metadata.fee_site` envelope.  
Proposed (not applied to Production): `supabase/migrations_proposed/20260930000000_fee_site_location_columns.sql`.

## Operator claim readiness

`OperatorClaimUpdateSchema` + `applyOperatorClaimUpdateAsProvenanceEvent` — additive provenance only. Full self-service UI is out of scope for this gate.

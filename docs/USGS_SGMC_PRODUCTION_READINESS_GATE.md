# USGS SGMC production readiness gate

**Phase:** `ROCKHOUNDING_SGMC_PRODUCTION_READINESS_GATE_R1`

**Decision:** `ROCKHOUNDING_SGMC_PRODUCTION_READINESS_GATE_R1_CONDITIONALLY_READY`

**Starting HEAD:** `bb549d86089a70c8d8b1b7f136f2308092a1ac60`

**Baseline:** `ROCKHOUNDING_SGMC_BOUNDED_REPEATED_SHADOW_R1_PASS`

This gate is an audit. It does not enable production ingestion, ordinary-user display, or a production geological-context path. Live authority remains `BOUNDED_REPEATED_SHADOW_READ`. No new SGMC feature query was made.

## Evidence basis

The audit uses the offline provider contract, the first shadow read, shadow certification, and the bounded repeated campaign. That campaign planned 4 reads, executed 4, received HTTP 200 on 2, and HTTP 504 on 2. The 504 responses were empty, were not retried, were not treated as zero geology, were not admitted, and were not promoted. The two HTTP 200 responses replayed deterministically on adapter `rockhounding:usgs-sgmc-geology-adapter` 1.0.0.

The sample is too small for an availability estimate. It is not a 50 percent uptime claim. It does show that a production path must stay truthful when the service times out.

## Decision

The architecture can represent SGMC as read-only geological context when the service works, fails, returns nothing, or returns a partial page. One rights prerequisite is still open, so the gate is not `READY`.

`PUBLIC_DISPLAY` is a source-use operation. The reviewed SGMC profile grants `AUTOMATED_QUERY` only. `PUBLIC_DISPLAY` is not in that grant and is not in the explicit ungranted list. Its recorded status is `UNKNOWN`. Disclosure policy that allows `PUBLIC` geometry for `PUBLIC_MAP` does not grant the operation. `AUTOMATED_QUERY` does not grant it either.

Until a later review records `PUBLIC_DISPLAY` as granted or refused, ordinary-user integration stays closed.

## Availability and failure

Observed campaign: 2 successes out of 4 bounded reads. Production must not depend on continuous SGMC availability. SGMC is an enhancement to geological context. Unrelated workflows continue when it is down. The user-visible state for provider failure is `Geological context temporarily unavailable`. That state is not `no geology`.

| Failure                 | User-visible state         | Evidence                   | Retry                | Admission                           | Prior context              | Decisions                |
| ----------------------- | -------------------------- | -------------------------- | -------------------- | ----------------------------------- | -------------------------- | ------------------------ |
| `NETWORK_ERROR`         | temporarily unavailable    | none created               | none in R1           | not admitted                        | withhold live presentation | other workflows continue |
| `TIMEOUT`               | temporarily unavailable    | none created               | none in R1           | not admitted                        | withhold                   | continue                 |
| `HTTP_5XX`              | temporarily unavailable    | failure record only        | none in R1           | not admitted                        | withhold                   | continue                 |
| `HTTP_4XX`              | temporarily unavailable    | failure record only        | none in R1           | not admitted                        | withhold                   | continue                 |
| `RATE_LIMITED`          | temporarily unavailable    | failure record only        | none in R1           | not admitted                        | withhold                   | continue                 |
| `INVALID_RESPONSE`      | temporarily unavailable    | quarantine raw if retained | none                 | not admitted                        | withhold                   | continue                 |
| `SCHEMA_DRIFT`          | temporarily unavailable    | quarantine                 | none                 | stop promotion                      | withhold                   | continue                 |
| `PARTIAL_RESPONSE`      | partial, not complete      | candidate stays partial    | do not page          | admit only if policy allows partial | label partial              | no completeness claim    |
| `EMPTY_RESPONSE`        | `NO_SGMC_POLYGON_RETURNED` | unresolved                 | do not widen the box | not absence                         | no invented geology        | continue                 |
| `AUTHORIZATION_BLOCKED` | temporarily unavailable    | no transport               | none                 | not admitted                        | withhold                   | continue                 |
| `DISCLOSURE_BLOCKED`    | withheld                   | candidate may exist        | none                 | display blocked                     | withhold geometry          | continue                 |
| `STALE_CACHED_CONTEXT`  | not used                   | no durable cache in R1     | none                 | not applicable                      | do not show a cache        | continue                 |
| `PROVIDER_DISABLED`     | temporarily unavailable    | historical records kept    | none                 | no new admission                    | withhold new presentation  | continue                 |

No automatic retry in the first production design. A later policy may allow a bounded retry only with a fixed attempt count, delay, no burst, no fan-out, a log of each attempt, and a visible final failure. Indefinite retry is not approved.

The operational rate remains `UNKNOWN_OPERATIONAL_LIMIT`. The first traffic model is one query on an explicit user request. No polling, prefetch fan-out, viewport carpet, pan-triggered storm, or cache warm-up.

## Query, pagination, coverage, and zero results

The first production query stays at the demonstrated bound: at most 0.02 degrees on a side and at most 5 features, one page. A larger envelope needs its own test phase. Unlimited viewport queries are not authorized.

Map interaction, if added later, needs deduplication, cancellation, sequencing, and rejection of stale responses before pan and zoom can call the service. This gate does not implement that.

`exceededTransferLimit` was not observed live. Pagination is not empirically certified. A page whose completion is unknown is `PARTIAL`. The product does not fetch the next page and does not display that page as complete.

Product coverage is the conterminous United States, with Alaska and Hawaii excluded, mixed scales, unreconciled state boundaries, and compilation-specific bedrock or surficial choices. Outside that geography the state is `OUTSIDE_PROVIDER_COVERAGE`. The product does not query and then treat an empty body as absence. A zero-feature response inside coverage is `NO_SGMC_POLYGON_RETURNED`. It stays unresolved unless some other evidence supplies context.

## Time

`retrievedAt` is the time of the request. It is not the age of the geology and it is not `sourceUpdatedAt`. The compilation citation is August 2017. A retrieval in 2026 does not make the map content current as of 2026. Per-feature `sourceUpdatedAt` stays unknown when the service does not supply it. Geologic `AGE_MIN` and `AGE_MAX` stay geologic text and are not Truth Clock timestamps.

## Rights

USGS-authored material was reviewed on a U.S. public-domain basis, with the embedded-copyright caveat and required USGS attribution. The profile does not imply USGS endorsement.

| Right             | Recorded status            | First-production rule                         |
| ----------------- | -------------------------- | --------------------------------------------- |
| `AUTOMATED_QUERY` | `ALLOWED_WITH_CONSTRAINTS` | still the only granted operation              |
| `PUBLIC_DISPLAY`  | `UNKNOWN`                  | blocks ordinary-user integration              |
| `LOCAL_CACHE`     | `UNKNOWN`                  | no durable provider cache                     |
| `REDISTRIBUTE`    | `UNKNOWN` and ungranted    | no raw proxy, bulk download, or public mirror |
| `OFFLINE_PACKAGE` | ungranted                  | offline SGMC is not promised                  |
| `PUBLIC_API`      | ungranted                  | no public dataset endpoint                    |

Ephemeral handling of one response in memory is not a durable cache. Provider 504s are not solved by storing raw bodies. Offline, the honest state is that SGMC is not available offline. That is different from no geological context.

## Governance path

Each production request re-checks Source Governance and operation authorization. A build must not compile a permanent “USGS allowed” flag. The path is governed transport, raw response, adapter 1.0.0, quarantine, admission, disclosure, then a geological-context projection. The browser does not call SGMC directly.

Admission stays `GEOLOGY` / `GEOLOGICAL_CONTEXT`. The same record cannot satisfy collection permission, site access, route access, closure, mining-claim status, land ownership, or land management. A trust indicator, if one is shown later, stays inside geological context. It must not read as permission to collect. Existing access-colored trust badges are not an SGMC display.

Disclosure still runs before any geometry materialization. `UNKNOWN` sensitivity is withheld. Public geometry does not create an SGMC bypass.

The endpoint, layer id 3, field list, bbox validation, and result limit stay fixed. Users cannot supply a remote URL, extra fields, or an open ArcGIS proxy. DOI `10.5066/F7WH2N65` stays pinned. DOI `10.5066/P1A3DQZK` is a different product and is not followed automatically.

Schema drift quarantines the raw record, stops promotion, and surfaces the unavailable state. Adapter 1.0.0 is not edited to fit one response.

## Operations

Before any ordinary display, production needs counts for requests, successes, failure class, latency, HTTP 5xx, HTTP 429, schema drift, quarantine, admission, and disclosure blocks. Logs do not store raw response bodies or precise private locations. No telemetry vendor is selected here.

`suspendSgmcGovernance` stops later transport and leaves historical provenance in place. Rollback disables the provider, withholds new live presentation, and does not rewrite receipts or invent an empty geology state. No database migration is required to turn the provider off.

If 504s increase, the schema drifts, the service disappears, the terms change, governance is suspended, display rights become uncertain, or disclosure classification changes: stop new live promotion, keep existing evidence, show the unavailable state, and review before re-enabling. Do not substitute another provider as if it were SGMC.

Future tests stay offline in normal CI: unit, contract, replay, and shadow tests. A live smoke test is a separate operator command. CI must not depend on USGS availability.

## Open condition

`ROCKHOUNDING_SGMC_PUBLIC_DISPLAY_RIGHTS_REVIEW_R1` must record `PUBLIC_DISPLAY` as granted or refused on the SGMC source-use profile. That review uses the recorded terms and official documentation. It does not issue a feature query, does not infer the grant from `AUTOMATED_QUERY`, and does not enable a product surface.

Production implementation stays unauthorized until that condition is closed. If the review grants display, the following implementation phase is `ROCKHOUNDING_SGMC_PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT_R1`, still geology-only, read-only, bounded, and fail-closed. If the review refuses display, live authority remains `BOUNDED_REPEATED_SHADOW_READ`.

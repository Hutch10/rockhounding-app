# HutchStack Core — Risk Assessment (Phase 0)

## Risk register

| ID      | Risk                                                   | Likelihood | Impact   | Mitigation                                                                       |
| ------- | ------------------------------------------------------ | ---------- | -------- | -------------------------------------------------------------------------------- |
| R-C0-01 | Breaking certified sync path during Phase 1 extraction | Medium     | Critical | Golden tests against `@rockhounding/shared` schemas; META-001A gate before merge |
| R-C0-02 | Interface drift from Rockhound contracts               | Medium     | High     | Shared golden fixtures; sync-v1 + telemetry golden compatibility tests           |
| R-C0-03 | Premature Rockhound import of Core packages            | Low        | Medium   | Boundary test scans `apps/web`, `packages/shared` for `@hutchstack/core`         |
| R-C0-04 | Over-abstraction before second consumer                | Medium     | Medium   | Phase 0 interfaces only; defer implementations to Phase 2                        |
| R-C0-05 | Harness vs Core confusion                              | Medium     | Low      | Document layering; provenance split from harness hashing                         |
| R-C0-06 | Duplicate type definitions long-term                   | High       | Medium   | Phase 1 re-export shim from `@rockhounding/shared`; single Zod source            |
| R-C0-07 | Ops YAML drift from live dashboards                    | Medium     | Low      | Golden fixtures; Phase 4 CLI evaluator                                           |
| R-C0-08 | Workspace path / pnpm filter issues                    | Low        | Low      | Explicit `packages/hutchstack-core/*` in workspace                               |

## Fail-closed gates

1. **Sync invariant:** Any Phase 1+ PR that changes batch request/response shape requires V1.1 certification gate.
2. **Boundary:** Rockhound production paths must not import `@hutchstack/core-*` until Phase 2 adapter PR explicitly approved.
3. **Golden parity:** Extracted Zod schemas must parse all golden fixtures before Rockhound re-export switch.

## Residual risk (Phase 0)

Phase 0 introduces **no runtime risk** — packages are private, interface-only, and not consumed by Rockhound.

## Sign-off criteria for Phase 0 → Phase 1

- [ ] All `@hutchstack/core-*` placeholder + golden tests pass
- [ ] Boundary test passes (no prod imports)
- [ ] Platform Steward approves package naming and dependency graph
- [ ] Rockhound unit + E2E suite unchanged (baseline run)

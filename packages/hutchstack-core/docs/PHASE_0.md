# HutchStack Core — Phase 0

**Status:** Complete (scaffold only)  
**Date:** 2026-06-07  
**Owner:** HutchStack Core Maintainer

## Objectives delivered

| Objective                                    | Status |
| -------------------------------------------- | ------ |
| Package scaffolding (10 packages)            | Done   |
| Interface definitions                        | Done   |
| Documentation per package + platform docs    | Done   |
| Golden compatibility fixtures                | Done   |
| Placeholder + golden tests                   | Done   |
| Boundary test (no Rockhound runtime imports) | Done   |

## Constraints honored

- No production code migration
- No Rockhound runtime behavior changes
- Certified sync invariant unchanged
- Public contracts in `@rockhounding/shared` unchanged

## Package layout

```
packages/hutchstack-core/
├── README.md
├── tsconfig.base.json
├── fixtures/                    # Shared golden JSON fixtures
├── docs/
│   ├── PHASE_0.md               # This file
│   ├── DEPENDENCY_GRAPH.md
│   ├── RISK_ASSESSMENT.md
│   └── PHASE_1_CHECKLIST.md
├── boundary/
│   └── boundary.test.ts         # No @hutchstack imports in Rockhound prod
├── offline-ledger/              @hutchstack/core-offline-ledger
├── sync-v1/                     @hutchstack/core-sync-v1
├── telemetry/                   @hutchstack/core-telemetry
├── field-telemetry/             @hutchstack/core-field-telemetry
├── provenance/                  @hutchstack/core-provenance
├── ops/                         @hutchstack/core-ops
├── ops-incident/                @hutchstack/core-ops-incident
├── certification/               @hutchstack/core-certification
├── regression/                  @hutchstack/core-regression
└── readiness/                   @hutchstack/core-readiness
```

## Verification commands

```bash
pnpm install
pnpm test:core          # 31 tests — golden + boundary
pnpm build:core         # Compile all Core packages
pnpm type-check:core    # Build + type-check
```

## Next phase

See [PHASE_1_CHECKLIST.md](./PHASE_1_CHECKLIST.md) — **Phase 1 complete**. Phase 2: runtime adapters (META-001A gate).

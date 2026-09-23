# Governance and rights

## Source governance — PASS

Evidence: `SourceGovernanceStatus`, `evaluateSourceAdmission`, and adapter preconditions `GOVERNANCE_CONTEXT_PRESENT` and `GOVERNANCE_OPERATION_ALLOWED` in `packages/shared/src/source-governance-contract.ts` and `packages/shared/src/source-adapter-contract.ts`.

Finding: a source is not usable because it is reachable. `UNKNOWN` and `PROHIBITED` stop a governed adapter. `READ` is not `TRANSFORM`. `AUTOMATED_QUERY` is not `BULK_DOWNLOAD`. Collection authorization cannot be set to `ALLOWED` on a governance record.

Blocker: none.

Usage rule for the first live adapter: `requiredPreconditions` must include all eight adapter preconditions. The schema allows a shorter list. The fixtures do not use a shorter list.

## Licensing / terms — CONDITIONAL

Evidence: `ResourceLicenseProfileSchema` (`licenseId`, `licenseRef`, attribution, redistribution, offline caching, derivative use) and `SourceReviewState` / `effectiveFrom`. Adapter `allowedOperations` are a separate enum and include `MODEL_INPUT` and `TRAINING_USE`.

Finding: the recording places exist. The adapter does not consult the license profile. A caller can mark `BULK_DOWNLOAD` allowed while redistribution is `PROHIBITED`.

Blocker: no automatic join from license profile to requested operation. No `reviewedAt` or terms-basis field beyond `licenseRef` and `effectiveFrom`.

Remediation: before the first live call, author one governance record and one license profile; allow exactly one of `READ` or `AUTOMATED_QUERY`; keep bulk, model-input, and training operations out unless the recorded terms allow them; set `reviewState` to `REVIEWED`.

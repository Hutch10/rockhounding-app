# Implementation

Disclosure: `packages/shared/src/disclosure-governance.ts`

- Classifications, purposes, modes, precision classes, and fail-closed unknown sensitivity.
- `projectForDisclosure` copies geometry and emits exact, coarse-reference, or withheld output.
- `materializeDisclosureRelease` rejects raw geometry and recomputes the decision.
- Provenance descriptor uses existing `DISCLOSURE_TRANSFORMATION`.
- Building block `rockhounding:disclosure-governance` STABLE 1.0.0 in `DISCLOSURE_MODEL`.

Operation binding: `packages/shared/src/source-operation-authorization.ts`

- Binds resource id, review state, governance receipt, license profile, explicit grants, and one requested operation.
- `guardFirstLiveAdapterExecution` runs only for `READ` or `AUTOMATED_QUERY`, with every adapter precondition and tolerant parsing off.
- Not a new building block. Source Governance and Source Adapter Contract versions stay 1.0.0.

No fetch, axios, credentials, or provider endpoint.

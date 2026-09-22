# Implementation

Persistence-free contract in `packages/shared/src/source-adapter-contract.ts`.

The translator clones inputs, checks declared preconditions, preserves raw fields, applies declared mappings, and rejects authority elevation, coverage promotion, temporal inference, and confirmed absence.

No network, persistence, fixture adapter, or live provider adapter.

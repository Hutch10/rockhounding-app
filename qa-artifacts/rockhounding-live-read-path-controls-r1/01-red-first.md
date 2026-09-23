# Red-first

Command:

`pnpm exec vitest run packages/shared/src/disclosure-governance.test.ts packages/shared/src/source-operation-authorization.test.ts`

Result: 2 suites failed, 0 tests ran.

Cause: `./disclosure-governance` does not exist yet. The operation-authorization suite imports that module as well.

No provider was contacted.

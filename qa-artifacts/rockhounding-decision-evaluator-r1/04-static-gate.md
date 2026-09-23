# Static gate

- shared type-check: exit 0
- targeted eslint on `decision-evaluator.ts` and `building-block-registry.ts`: exit 0
- `pnpm test:ci`: 64 files, 821 tests, exit 0
- `pnpm build:core`: exit 0
- `pnpm --filter @rockhounding/shared build`: exit 0
- `pnpm --filter web run build`: exit 0
- `git diff --check`: exit 0
- root `pnpm lint`: exit 1, 285 problems (271 errors, 14 warnings) expected from the pre-existing debt. No `decision-evaluator` hits. Not repaired.

Node engine warning (wanted 20.x, running 24) is expected.

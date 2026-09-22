# Offline Fixture Adapters R1 — static gate

- Shared type-check: exit 0
- Targeted eslint on `packages/shared/src/offline-fixture-adapters.ts`: exit 0
- `pnpm build:core`: exit 0
- `pnpm --filter @rockhounding/shared build`: exit 0
- `pnpm --filter web run build`: exit 0 (Next.js 14.2.35). Service worker files were regenerated and left unstaged.
- `git diff --check`: exit 0
- Root `pnpm lint`: exit 1, 285 problems (271 errors, 14 warnings). No hits in the fixture adapter files. Unrelated debt was not repaired.
- Node engine warning (wanted 20.x, running 24) is expected.

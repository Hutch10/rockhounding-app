# 04 Static gate

- shared `type-check`: pass
- `pnpm build:core`: pass
- `@rockhounding/shared` build: pass
- `pnpm --filter web run build`: pass (Next.js 14.2.35 production)
- eslint `packages/shared/src/building-block-registry.ts`: pass (exit 0)
- eslint test file ignored by repo ignore pattern (expected)
- `git diff --check` on phase files: pass
- `pnpm lint`: fail with pre-existing 271 errors / 14 warnings; **no** `building-block-registry` hits

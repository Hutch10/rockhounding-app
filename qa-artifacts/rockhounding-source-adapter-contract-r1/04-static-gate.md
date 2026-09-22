# Static gate

- Shared type-check: pass (re-run after eslint fixes)
- `pnpm build:core`: pass
- Shared build: pass before the final eslint edit; dist is not committed
- `pnpm --filter web run build`: pass
- Targeted eslint on the adapter and registry sources: pass after the boolean and optional-coverage fixes
- `git diff --check`: pass
- Root `pnpm lint`: exit 1, 285 problems (271 errors, 14 warnings). No `source-adapter` or `building-block-registry` hits. Pre-existing debt, not repaired.

# Static gate

- Shared type-check: pass
- Shared build: pass
- `pnpm build:core`: pass
- `pnpm --filter web run build`: pass
- Targeted eslint on quarantine and registry sources: pass
- Root `pnpm lint`: exit 1, 285 problems (271 errors, 14 warnings). No `evidence-quarantine` hits. Pre-existing debt, not repaired.

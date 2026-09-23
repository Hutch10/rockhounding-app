# Static gates

- `pnpm test:ci`: 67 files, 847 tests, exit 0
- shared type-check: exit 0
- `pnpm build:core`: exit 0
- shared build: exit 0
- `pnpm --filter web run build`: exit 0
- targeted eslint on disclosure, operation authorization, and the building-block registry: exit 0
- `git diff --check` on phase files: exit 0
- root `pnpm lint`: 285 problems (271 errors, 14 warnings). No hits in the new modules. Not repaired.

Node 24 versus the engine's requested 20.x is the usual warning.

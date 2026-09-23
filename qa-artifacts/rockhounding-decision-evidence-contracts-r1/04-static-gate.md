# Decision Evidence Contracts R1 — static gate

- `@rockhounding/shared` type-check: exit 0
- Targeted eslint on `decision-evidence-contracts.ts` and `building-block-registry.ts`: exit 0
- `pnpm build:core`: exit 0
- `@rockhounding/shared` build: exit 0
- `pnpm --filter web run build`: exit 0
- `git diff --check` on phase files: exit 0
- Root `pnpm lint`: exit 1, 285 problems (271 errors, 14 warnings). No hits in decision-evidence-contract files. Unrelated debt left unrepaired.

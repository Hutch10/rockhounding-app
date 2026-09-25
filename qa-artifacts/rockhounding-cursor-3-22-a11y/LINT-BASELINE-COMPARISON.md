# Root lint baseline comparison — Cursor 3.22 freeze

## Method

Isolated detached worktree at starting SHA (does not disturb main working tree):

```text
git worktree add --detach C:\Users\hetfw\Rockhounding-lint-baseline-2553d733 2553d733aa5e4999051ae9bcb8a5dbe4c2ae3558
cd C:\Users\hetfw\Rockhounding-lint-baseline-2553d733
pnpm install --frozen-lockfile
pnpm lint
```

Current tree (same command from `C:\Users\hetfw\Rockhounding Project`):

```text
pnpm lint
```

Canonical script: `"lint": "eslint . --ext .ts,.tsx && pnpm --filter web run lint"`

## Summaries (authoritative footer lines)

| Tree                     | Command     | Exit | Problems | Errors  | Warnings |
| ------------------------ | ----------- | ---- | -------- | ------- | -------- |
| Starting SHA `2553d733…` | `pnpm lint` | 1    | **304**  | **290** | **14**   |
| Current dirty tree       | `pnpm lint` | 1    | **285**  | **271** | **14**   |
| Phase delta (introduced) | —           | —    | **−19**  | **−19** | **0**    |

Raw logs: `lint-baseline-2553d733-clean.txt`, `lint-current-tree.txt`.

## File|rule signature comparison

Normalized keys: `relativePath|rule|severity` (line numbers ignored).

| Metric                                 | Value |
| -------------------------------------- | ----- |
| Unique keys at baseline                | 41    |
| Unique keys at current                 | 35    |
| **Only in current (phase-introduced)** | **0** |
| Only in baseline (absent on current)   | 6     |

Only-in-baseline keys (cleared / no longer reported; not phase files):

- `packages/hutchstack-core/field-telemetry/src/catalog-links.ts` ×3 unsafe-\* rules
- `packages/shared/src/telemetry.ts` ×3 unsafe-\* rules

Likely type-resolution variance after dependency/lockfile refresh vs starting SHA install — **not** new findings in phase-owned paths.

## Phase-owned files in current root lint

**Zero** hits. Phase ESLint on TS/JS phase paths: exit **0** (one ignored-test warning for `permit-validation.test.ts` ignore pattern).

## Classification

- **A identical inherited:** no — totals differ (304 → 285).
- **B inherited count/location changed:** yes — warnings stable at 14; errors decreased; telemetry/catalog-links signatures dropped.
- **C phase-introduced findings:** **none** (0 only-in-current keys; 0 phase-file hits).

**Verdict:** Zero phase-introduced canonical lint failures. Root lint remains inherited baseline debt.

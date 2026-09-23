# Regression

Provider tests live in `packages/shared/src/usgs-sgmc-provider.test.ts` (7 tests). A follow-up run after the route, ownership, management, and unknown-lithology assertions passed those 7 tests.

The module source contains no `fetch(`, `axios`, `XMLHttpRequest`, or `FeatureServer/query`. Root lint output contains no `usgs-sgmc` hits.

Suspended governance blocks `guardFirstLiveAdapterExecution`. The fixture object and the original governance record stay unchanged.

| Gate                                                                                           | Result                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm test:ci`                                                                                 | exit 0, 68 files, 854 tests                                                 |
| `pnpm exec vitest run packages/shared/src/usgs-sgmc-provider.test.ts` (after extra assertions) | exit 0, 7 tests                                                             |
| `pnpm --filter @rockhounding/shared type-check`                                                | exit 0                                                                      |
| `pnpm --filter @rockhounding/shared build`                                                     | exit 0                                                                      |
| `pnpm run build:core`                                                                          | exit 0                                                                      |
| `pnpm --filter web run build`                                                                  | exit 0                                                                      |
| targeted eslint on the provider, resource catalog, and source governance                       | exit 0                                                                      |
| `git diff --check` on phase paths                                                              | exit 0                                                                      |
| root `pnpm lint`                                                                               | exit 1, 285 problems (271 errors, 14 warnings), pre-existing, no SGMC files |

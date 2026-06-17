# @hutchstack/core-regression

## Responsibility

Pre-promote and weekly regression watchlist: automated + manual checks, block-promote flags, owner assignment.

**Phase 0:** Interface definitions only.

## Public interfaces

| Symbol            | Description                 |
| ----------------- | --------------------------- |
| `WatchlistItem`   | Single regression check     |
| `WatchlistSpec`   | Full watchlist with extends |
| `WatchlistReport` | Run result summary          |
| `WatchlistRunner` | Execute checks              |

## Dependencies

| Package                          | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `@hutchstack/core-certification` | Optional gate linkage for block-promote |

## Extension points

| Extension         | Purpose                       |
| ----------------- | ----------------------------- |
| `WatchlistMerger` | Merge Core base + domain YAML |
| `AutomatedCheck`  | CI test tag binding           |
| `ManualCheck`     | Field playbook reference      |

## Golden fixtures

- [`../fixtures/regression-watchlist.golden.json`](../fixtures/regression-watchlist.golden.json)

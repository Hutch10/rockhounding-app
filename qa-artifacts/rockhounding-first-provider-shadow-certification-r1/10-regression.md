# Regression

`pnpm test:ci` exit 0: 70 files, 862 tests. Shared type-check, shared build, and `build:core` exit 0. Targeted eslint on the certification and shadow-read modules exit 0. `git diff --check` exit 0.

Web production build exit 0 on retry. The first attempt stopped with `ENOSPC` while the disk was full. Removing the local Next build cache freed space, and the retry compiled.

Root `pnpm lint` exit 1: 285 problems (271 errors, 14 warnings). That debt is pre-existing. No SGMC certification file is in it. The shadow-read pre-commit lint failure remains intermediate evidence fixed in `df09267`.

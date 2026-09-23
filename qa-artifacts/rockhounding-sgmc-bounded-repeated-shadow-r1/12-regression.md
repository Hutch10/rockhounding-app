# Regression

Campaign tests live in `packages/shared/src/usgs-sgmc-repeated-shadow.test.ts`. They use a mock transport. The provider host is not called from tests.

The live script is `packages/shared/src/usgs-sgmc-repeated-shadow-campaign.ts`. Tests do not import it.

Suite at validation: 71 files, 864 tests. Root lint remains the pre-existing 285 problems (271 errors, 14 warnings), with no repeated-shadow files in that output.

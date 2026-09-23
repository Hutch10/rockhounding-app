# Temporal behavior and coverage

Truth Clock PASS. `retrievedAt` is the successful retrieval. Source-update time, phenomenon time, and the effective interval were not set. `AGE_MIN` and `AGE_MAX` stayed geologic attributes.

Query bounding PASS. Pagination PASS for the observed page: `COMPLETE`, count 1, limit 5, transfer limit not set. An unobserved transfer limit remains fail-closed as `PARTIAL`. Coverage PASS: this bbox is not comprehensive geology, and coverage semantics stay `UNKNOWN`. Zero-result PASS: `NO_SGMC_POLYGON_RETURNED`, `confirmedAbsence` false. Rate observation is `UNKNOWN_OPERATIONAL_LIMIT`; the repeated-shadow budget is manual, one request per action, no polling, and no automatic retry.

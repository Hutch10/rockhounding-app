# Disclosure and governance

Each successful feature was disclosed before QA materialization. Decision `ALLOWED` for `PUBLIC` and `SHADOW_DISPLAY`. Disclosure result: `CONSISTENT`.

Explore, Field Mode, Site Detail, the public map, and the public API stayed closed.

`evaluateSourceOperationAuthorization` and `guardFirstLiveAdapterExecution` ran before every transport call. All four feature queries and both metadata calls were `ALLOWED_WITH_CONSTRAINTS`.

`suspendSgmcGovernance` blocked a no-send probe before the campaign and again after READ D. Both results were `AUTHORIZATION_BLOCKED`. Governance result: `CONSISTENT`.

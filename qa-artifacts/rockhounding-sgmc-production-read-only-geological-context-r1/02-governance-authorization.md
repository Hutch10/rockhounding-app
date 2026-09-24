# Governance

Every request evaluates Source Governance and `AUTOMATED_QUERY` before transport through `evaluateSourceOperationAuthorization` and `guardFirstLiveAdapterExecution`. Suspended, unreviewed, wrong-resource, and READ-only requests do not call the provider.

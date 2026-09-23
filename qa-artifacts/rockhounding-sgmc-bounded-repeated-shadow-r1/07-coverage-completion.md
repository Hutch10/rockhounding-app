# Coverage and completion

READ C returned 2 features and READ D returned 1. `exceededTransferLimit` was not true, and both counts are under the cap of 5, so completion is `COMPLETE`. No next page was requested.

READ A and READ B returned HTTP 504 with empty bodies. Their completion is `UNKNOWN` because there was no feature envelope. They are not zero-feature geology results and they are not confirmed absence.

Completion behavior for the campaign: `CLEAR` on successful reads, with transport failures kept separate.

Four envelopes do not establish service coverage. Product-level completeness stays unknown.

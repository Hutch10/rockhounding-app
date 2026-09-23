# Operational observations

Planned feature queries: 4. Executed: 4. Successful: 2. Failed: 2.

Failures are `HTTP_ERROR` (HTTP 504, empty body) on READ A and READ B. They were recorded and not retried. Failure behavior: `SAFE`.

No HTTP 429. No `Retry-After`. Cache-Control was present and is not a rate grant. Operational limit: `UNKNOWN_OPERATIONAL_LIMIT`.

Pauses were at least 5 seconds. READ B started about two minutes after READ A because the first timeout was classified before the resume. READ C followed READ B after the pause. READ D followed READ C after the pause.

Metadata: one service document and one layer document, both HTTP 200, before READ A. They were not repeated on resume.

The campaign did not stop early. `stoppedEarly` is null.

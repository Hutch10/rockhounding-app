# Availability and failure

Observed campaign: 2 HTTP 200 and 2 HTTP 504 out of 4 bounded reads. The sample is too small for an availability percentage. No uptime figure is inferred.

The 504 bodies were empty. Classification was `HTTP_ERROR`. `geologicalAbsence` stayed false. Replay at HTTP 504 matched. Those reads created no admission.

Provider availability: `PASS` with the limitation that production must treat outage as a normal, visible condition. Failure safety: `PASS`. Failure presentation is specified as `Geological context temporarily unavailable`.

Retry for the first production design: no automatic retry. Rate: `UNKNOWN_OPERATIONAL_LIMIT`, with traffic limited to an explicit user request.

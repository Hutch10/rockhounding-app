# Provenance and replay

Metadata calls did not create feature provenance.

READ A and READ B created no `SOURCE_RETRIEVAL` because the bodies were empty gateway errors.

READ C and READ D each created one `SOURCE_RETRIEVAL` and one import activity. The reads were not collapsed into one retrieval.

Offline replay of both HTTP 200 bodies matched the live normalized fields and did not fabricate a retrieval. Same-status replay of the HTTP 504 bodies matched `HTTP_ERROR` and did not invent a retrieval graph.

Replay result: `DETERMINISTIC`.

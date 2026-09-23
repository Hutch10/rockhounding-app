# Request manifest

Extent: National Mall, Washington, District of Columbia, `-77.0365,38.889,-77.03,38.8915`, WGS84 envelope, result limit 5, `outSR=102100`, JSON. Fields are the pinned core fields plus `OBJECTID`.

Calls:

1. ScienceBase item JSON, before the feature query.
2. Feature service metadata, HTTP 200, then layer 3 metadata, HTTP 200.
3. Feature query aborted at 20 seconds. No body retained.
4. One recorded retry: service metadata, layer metadata, then the feature query at a 60 second timeout. HTTP 200. One feature. Retrieved `2026-09-23T21:42:11.147Z`.

No credential. No paging. No product UI.

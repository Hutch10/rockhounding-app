# Selection

`SELECTED_FIRST_LIVE_PROVIDER`

U.S. Geological Survey State Geologic Map Compilation geology polygons, DOI `10.5066/F7WH2N65`, layer `SGMC_Geology`.

Purpose: `GEOLOGICAL_CONTEXT`.

Operation: `AUTOMATED_QUERY`.

Elimination:

- MLRS loses on documented missing geometries and on legal consequence.
- NWS loses on life-safety consequence and on zone filters that omit warnings, despite the best API contract.
- FIRMS loses on the required map key, sensor-version change, and the gap between a hotspot and a fire boundary.
- USMIN loses because it is a developing subset of important deposits and because exact deposit points invite a discovery or collecting reading.
- SGMC remains. It is one map-unit domain, public-domain USGS authorship with a credit duty, no key, polygon geometry that is already a map generalization, and a wrong answer that does not authorize collection or safety.

The 2026 GeMS geodatabase is not selected. It is a downloadable successor-style product, and the provider says it can differ from other GeMS state maps. The first contract must refuse to treat it as the same source version.

No production authority follows from this choice.

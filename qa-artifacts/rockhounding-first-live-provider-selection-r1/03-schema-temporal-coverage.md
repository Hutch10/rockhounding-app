# Schema, time, and coverage

Retrieval date: 2026-09-23.

## SGMC

Documented fields include `STATE`, `SGMC_LABEL`, `ORIG_LABEL`, `UNIT_LINK`, `UNIT_NAME`, `AGE_MIN`, `AGE_MAX`, `GENERALIZED_LITH`, major and minor lithology fields, `REFERENCE`, and `NGMDB1` through `NGMDB3`. Geometry is polygon. The service description says the layer was reprojected for web display. Spatial reference on that description is Web Mercator. Max record count is 2000. GeoJSON is a supported query format.

`AGE_MIN` and `AGE_MAX` are geologic age text. They are not `sourceUpdatedAt`. No per-feature publication timestamp was documented. The compilation vintage is the 2017 data-series citation. Retrieval time would be assigned by a later adapter, not copied from age.

Coverage is the conterminous state maps, at mixed scales, with bedrock preferred where both bedrock and surficial maps exist, and with units unreconciled at state lines. A query can miss geology because of extent, scale, the record cap, or a state-boundary seam. Zero polygons do not mean no rock.

## NWS

API times are documented as ISO-8601. Alerts are available as JSON-LD and CAP. Active alerts are a filtered view. The seven-day `/alerts` set is not the long-term archive. A zone query does not return county-based polygon warnings. An empty active-alert response means no alert matched that filter. It does not mean the place is safe, and a failed request is a different state.

## FIRMS

Requests are by source, area, and day range. A detection time belongs to the satellite observation. It is not the time the platform retrieves the row. Missing detections can mean cloud, swath, sensor, or quota. A hotspot is not a burned perimeter.

## USMIN

WFS 1.1.0 and WMS 1.3.0 are documented. The subject is important deposits, mines, and districts. Absence from this database is not absence of minerals.

## MLRS

Claim polygons, max 2000 records, pagination supported. Some claims exist in the case system and have no geometry. An empty map is not a claim-free result.

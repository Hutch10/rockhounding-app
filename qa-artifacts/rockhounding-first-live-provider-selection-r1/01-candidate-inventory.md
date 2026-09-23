# Candidate inventory

Research retrieval date: 2026-09-23.

## A. USGS SGMC geology

- Owner: U.S. Geological Survey.
- Product used for selection: State Geologic Map Compilation, DOI `10.5066/F7WH2N65`, Data Series 1052 version 1.1 (August 2017).
- Service description read: ScienceBase feature layer `SGMC_Geology`, layer 3, catalog item `5888bf4fe4b05ccb964bab9d`.
- Access: ArcGIS feature query, GeoJSON, max record count 2000. No key on the service description.
- Sibling product not selected: GeMS SGMC geodatabase, DOI `10.5066/P1A3DQZK`, published 2026-06-08, CC0. That release is a downloadable geodatabase, and the page says it can differ from the Cooperative National Geologic Map.
- Status: the 2017 compilation service description was available. The 2026 release is a separate published dataset.

## B. USGS USMIN

- Pages: https://mrdata.usgs.gov/deposit/ and the MRData catalog record.
- Owner: U.S. Geological Survey.
- Access: WMS 1.3.0 and WFS 1.1.0. No key shown.
- Scope: developing national database of the most important mines, deposits, and districts.
- Status: public documentation describes an ongoing database, not a finished occurrence census.

## C. National Weather Service alerts

- Page: https://www.weather.gov/documentation/services-web-api , updated 2026-03-24 on that page.
- Alerts guide: https://www.weather.gov/documentation/services-web-alerts
- Geolocation guide: NWS Alerts Geolocation Guide PDF.
- Access: `https://api.weather.gov`, JSON-LD, GeoJSON, and CAP. User-Agent required. No key today. The same page says a key may replace the User-Agent later.
- Rate: unpublished numeric limit. Alerts documentation recommends no more than about every 30 seconds. Exceeding the limit returns an error and can be retried after the window, often described as about 5 seconds.
- Status: operational public API.

## D. NASA FIRMS

- Pages: https://firms.modaps.eosdis.nasa.gov/api/map_key and the FIRMS API use notes.
- Earthdata FAQ: https://www.earthdata.nasa.gov/data/tools/firms/faq
- Access: area, country, and WFS/WMS style services after a free emailed `MAP_KEY`.
- Quota: 5000 transactions per key per 10 minutes. A multi-day request may count as more than one transaction.
- Terms: NASA asks for a FIRMS citation and a disclaimer when data or imagery are shared. Data are provided for open use.
- Status: operational, key-gated.

## E. BLM MLRS mining claims

- Service description: `HUB/BLM_Natl_MLRS_Mining_Claims_Not_Closed` on `gis.blm.gov`.
- Owner: Bureau of Land Management.
- Access: ArcGIS feature query, GeoJSON, max record count 2000, pagination supported.
- Geometry: primarily geocoded from legal land descriptions through PLSS. The service text says some cases have no geometry when they cannot be geocoded.
- Status: public map service. Not a complete staked-boundary survey.

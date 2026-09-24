# USGS SGMC public display rights

**Phase:** `ROCKHOUNDING_SGMC_PUBLIC_DISPLAY_RIGHTS_REVIEW_R1`

**Decision:** `ROCKHOUNDING_SGMC_PUBLIC_DISPLAY_RIGHTS_REVIEW_R1_PASS`

**Rights result:** `SGMC_PUBLIC_DISPLAY_ALLOWED_WITH_CONSTRAINTS`

**Review date:** 2026-09-23

**Resource:** `res-usgs-sgmc-geology`, DOI `10.5066/F7WH2N65`, Data Series 1052 version 1.1, layer `SGMC_Geology` id 3

This review decides source permission to show bounded, transformed geological context to an ordinary user. It does not issue a feature query, change the adapter, or enable a product surface.

## Evidence reviewed

Retrieved 2026-09-23:

- USGS data-release page for this product, `https://www.usgs.gov/data/state-geologic-map-compilation-sgmc-geodatabase-conterminous-united-states`. The rights field says this work is marked with CC0 1.0 Universal. The DOI on that page is `10.5066/F7WH2N65`.
- USGS Science Data Catalog record `USGS:5888bf4fe4b05ccb964bab9d`, `https://data.usgs.gov/datacatalog/data/USGS:5888bf4fe4b05ccb964bab9d`. Access is public. The license label is `http://www.usa.gov/publicdomain/label/1.0/`.
- USGS Copyrights and Credits, `https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits`.
- USGS acknowledgment guidance, `https://www.usgs.gov/information-policies-and-instructions/acknowledging-or-crediting-usgs`.

The catalog and the data-release page both point at the 2026 GeMS release, DOI `10.5066/P1A3DQZK`, as a newer product. That pointer was not followed. This grant does not apply to it.

## SGMC-specific rights

The selected data release is marked CC0 1.0 Universal on the official USGS page for that DOI. The catalog labels the same record public, with the U.S. public-domain label. That designation is for this SGMC release. It is not a designation for every USGS product, every linked state publication, or the 2026 GeMS release.

USGS-authored or produced data are treated as U.S. public domain. USGS asks for credit. Not every illustration on a USGS website is public domain. Separately copyrighted material, when marked, needs the copyright holder's permission. The trademarked USGS identifier is not a credit line and is not available for this product to use.

## Third-party caveat

The generic website caveat is not evidence that SGMC polygons contain copyrighted material. The reviewed records also do not prove the absence of a restriction on every underlying state map that was compiled. No source-specific copyright mark was found on this data release's rights field or on the catalog license label. The grant therefore covers the USGS-marked SGMC data release `10.5066/F7WH2N65`. It does not re-license a separate state publication.

## What PUBLIC_DISPLAY means

`PUBLIC_DISPLAY` is rendering provider-derived geological context after a governed `AUTOMATED_QUERY`, the source adapter, Evidence Admission, Disclosure Governance, and a geological-context projection. It may include the map-unit polygon, unit name, generalized lithology, geologic age labels, USGS and SGMC attribution, and a source link.

It does not include a raw API proxy, a bulk download, a public ArcGIS mirror, raw-response distribution, a downloadable archive, a public API, or an offline package.

Display of a transformed bounded projection is not redistribution of the raw dataset. `REDISTRIBUTE` stays `UNKNOWN` and ungranted. `PUBLIC_API`, `LOCAL_CACHE`, `OFFLINE_PACKAGE`, `MODEL_INPUT`, `AI_PROCESSING`, and `TRAINING_USE` stay ungranted. `AUTOMATED_QUERY` remains its own grant and does not authorize display.

## Constraints

The explicit grant is `PUBLIC_DISPLAY` on `res-usgs-sgmc-geology` only.

- Credit the U.S. Geological Survey.
- Name the State Geologic Map Compilation and DOI `10.5066/F7WH2N65` where a source link is shown.
- Do not imply USGS endorsement.
- Do not use the trademarked USGS identifier.
- Evidence Admission is still required.
- Disclosure Governance is still required. A display right does not disclose every geometry at every precision.
- The record remains geological context only. It does not decide collection permission, access, route, closure, claim, ownership, or management.
- A superseded or unreviewed profile does not authorize display.

## Production-readiness condition

The readiness gate's open condition was `PUBLIC_DISPLAY` = `UNKNOWN`. This review closes that condition. The historical gate decision stays `ROCKHOUNDING_SGMC_PRODUCTION_READINESS_GATE_R1_CONDITIONALLY_READY`. The condition is satisfied by this phase.

`ROCKHOUNDING_SGMC_PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT_R1` uses this grant on Site Detail. Production ingestion stays closed. The display grant still does not admit evidence or authorize collection.

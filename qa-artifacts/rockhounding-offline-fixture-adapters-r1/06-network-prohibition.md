# Offline Fixture Adapters R1 — network prohibition

Scanned `packages/shared/src/offline-fixture-adapters.ts` for `fetch(`, axios, http/https URLs, XMLHttpRequest, `process.env`, and provider names (USGS, BLM, NWS, NASA, Macrostrat, Mindat). No matches.

The suite asserts `fixtureAdaptersContactNetwork()`, `fixtureInvokesEvidenceAdmission()`, `fixtureInvokesDecisionSnapshot()`, and `fixtureLiveIngestionPath()` are false.

No network behavior was introduced.

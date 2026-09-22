# 02 Implementation

Added `@rockhounding/shared/building-block-registry` as a persistence-free architectural catalog.

- Types: identity, version `{major,minor,patch}`, lifecycle, dependencies, compatibility, conformance, validators, examples, implementation, deprecation
- Built-in STABLE: UGES 1.1.0, Geological Layer Registry 1.0.0, Resource Catalog 1.0.0, Source Governance 1.0.0
- Built-in DRAFT v0.1.0: observation, sample, sampling-event, provenance-activity, truth-clock, evidence-availability, decision-snapshot
- STABLE requires implementation descriptor
- Cycle detection on REQUIRES/EXTENDS
- Clone-on-read; no mutable singleton
- Does not import domain modules at runtime (higher-order registry)

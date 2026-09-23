# Disclosure Governance (R1)

**Status:** Canonical TypeScript / Zod contract (persistence-free)
**Schema version:** `1`
**Package export:** `@rockhounding/shared/disclosure-governance`
**Building block:** `rockhounding:disclosure-governance` STABLE 1.0.0

## Purpose

Decide what spatial precision may leave the trusted evidence graph for one disclosure purpose. The check happens before a public map, public API, export, share link, or shadow display is materialized. Hiding a marker after exact coordinates are already in a public payload is not this boundary.

## Non-goals

No live provider, network request, persistence, sensitive-location database, public API implementation, production display authorization, random jitter, or a full inference-attack analysis.

## Classifications

`PUBLIC`, `PERSONAL_PRIVATE`, `SCIENTIFIC_SENSITIVE`, `CULTURAL_SENSITIVE`, `COMMERCIAL_RESTRICTED`, `AUTHORITY_RESTRICTED`, `UNKNOWN`.

Unknown sensitivity is not `PUBLIC`.

## Purposes

`INTERNAL_ANALYSIS`, `FIELD_USE_PRIVATE`, `PUBLIC_MAP`, `PUBLIC_API`, `EXPORT`, `SHARE_LINK`, `SHADOW_DISPLAY`, `MODEL_CONTEXT`, `RESEARCH_EXPORT`, `OTHER`.

## Release modes and precision

Modes are `EXACT`, `COARSE`, `WITHHELD`, and `NOT_APPLICABLE`.

Precision classes are `EXACT_POINT`, `PRECISE_GEOMETRY`, `SITE_SCALE`, `LOCALITY_SCALE`, `REGIONAL_SCALE`, and `WITHHELD`. R1 does not define universal meter thresholds.

Decision statuses are `ALLOWED`, `ALLOWED_WITH_TRANSFORMATION`, `WITHHELD`, and `UNKNOWN_FAIL_CLOSED`.

## Fail-closed public release

`UNKNOWN` sensitivity is withheld from `PUBLIC_MAP`, `PUBLIC_API`, `EXPORT`, `SHARE_LINK`, `SHADOW_DISPLAY`, and `RESEARCH_EXPORT`.

`PERSONAL_PRIVATE` is withheld from those external purposes unless a policy rule sets `explicitPermit`.

`SCIENTIFIC_SENSITIVE` on a public map follows the policy. A coarse rule emits a caller-supplied coarse reference and drops coordinates. R1 does not round coordinates and does not claim that rounding is anonymity. If a coarse release has no coarse reference, the geometry is withheld.

`INTERNAL_ANALYSIS` may keep an exact copy when the policy says so. That copy is a projection. The source geometry object is not modified.

## Model context

`MODEL_CONTEXT` does not receive exact coordinates unless a `PUBLIC` rule explicitly allows that mode. The default and the sensitive cases stay at a coarse reference or are withheld. Least precision is purpose-driven. It is not an automatic exact dump into a model.

## Materialization guard

`materializeDisclosureRelease` accepts only a projection produced by `projectForDisclosure`. It recomputes the decision from the stored inputs. A raw geometry object is rejected. Withheld and unknown-fail-closed results are rejected for materialization.

## Provenance

A projection records a `DISCLOSURE_TRANSFORMATION` descriptor: source entity, purpose, policy id and version, method (`identity-release-v1`, `coarse-reference-v1`, or `withhold-v1`), and projection id. There is no provenance store. The activity kind already exists on the Provenance Activity kernel. This module does not change that kernel.

## Inference limitation

Derived labels, maps, and model context can still reveal a place after raw coordinates are withheld. `inferenceDisclosureHook` is `NOT_IMPLEMENTED`.

## What disclosure does not do

It does not authorize collection, admit evidence, or allow a source operation. A public-safe geometry still needs a separate license and governance decision.

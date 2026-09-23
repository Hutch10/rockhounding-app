# Documentation

Contracts, specifications, and policies.

## Purpose

This directory contains all project documentation:

- API contracts and specifications
- Database schema documentation
- Legal and compliance policies
- Architecture decision records (ADRs)
- Development guidelines

## Key Documents

### API Contracts

- Endpoint specifications (Step 5-10)
- Request/response schemas
- Error handling standards
- Authentication requirements

### Database Schemas

- Table relationships and ERD
- Index strategy documentation
- RLS policy explanations
- Migration guidelines

### Legal Policies

- Data provenance requirements
- Moderation workflows
- Legal gating enforcement
- User content policies

### Development Guidelines

- Code style and standards
- Testing requirements
- Git workflow
- Deployment procedures

## Build Document

The Build Document (provided by user) is the master specification. All implementation must follow it exactly.

## Non-Negotiable Rules

1. Postgres + PostGIS is single source of truth
2. Thin pins endpoint for map browsing (bbox queries)
3. Full detail only on pin click
4. Legal gating enforced by logic
5. All public locations require legal_tag, legal_confidence, source_tier, verification_date
6. User submissions never publish directly (staging → approval → public)
7. Offline support is vector-only (no tiles)
8. Small, testable commits
9. No unnecessary libraries
10. Use shared enums and Zod schemas
11. Geological and access _facts_ that need provenance use [UGES R1](UNIVERSAL_GEOLOGICAL_EVIDENCE_SCHEMA.md); do not invent parallel assertion types in adapters
12. Data-source / layer catalogs use the [Geological Layer Registry R1](GEOLOGICAL_LAYER_REGISTRY.md); it does not replace UGES assertions or authorize collection
13. Discoverable datasets/APIs/documents use the [Resource Catalog R1](RESOURCE_CATALOG.md); it does not fetch, execute, or become UGES assertions
14. Source admission/restriction uses the [Source Governance Contract R1](SOURCE_GOVERNANCE_CONTRACT.md); it does not authorize collection, elevate authority, or generate assertions
15. Independently versioned domain contracts are cataloged by the [Building Block Registry R1](BUILDING_BLOCK_REGISTRY.md); it does not redefine UGES, layers, resources, or governance semantics
16. Field observations, sampling events, and specimens use the [Observation / Sample Model R1](OBSERVATION_SAMPLE_MODEL.md); they are not UGES assertions and do not authorize collection
17. Creation and transformation lineage uses the [Provenance Activity Kernel R1](PROVENANCE_ACTIVITY_KERNEL.md); it does not establish truth, authority, or permission
18. Freshness and evidence availability use the [Truth Clock / Evidence Availability R1](TRUTH_CLOCK_AVAILABILITY.md); freshness is not truth, authority, or permission
19. Source translation uses the [Source Adapter Contract R1](SOURCE_ADAPTER_CONTRACT.md); an adapter may normalize representation and may not manufacture authority, certainty, permission, currency, or absence
20. Material that cannot safely proceed uses [Evidence Quarantine R1](EVIDENCE_QUARANTINE.md); quarantine preserves and explains, and it does not accept, discard, or verify evidence
21. The first executable source translation is [Offline Fixture Adapters R1](OFFLINE_FIXTURE_ADAPTERS.md); fixtures are local and deterministic, and they do not open live ingestion
22. Purpose-specific eligibility uses [Evidence Admission Engine R1](EVIDENCE_ADMISSION_ENGINE.md); admission is not truth, permission, or a field decision
23. Decision completeness uses [Decision Evidence Contracts R1](DECISION_EVIDENCE_CONTRACTS.md); a complete evidence set is not a permission, access, closure, or safety result
24. Decision context is frozen by [Decision Snapshot R1](DECISION_SNAPSHOT.md); the snapshot records what was evaluated and does not produce an outcome
25. Decision outcomes use [Decision Evaluator R1](DECISION_EVALUATOR.md); an outcome follows only from a valid snapshot and an exact synthetic rule set
26. Decision outcomes are frozen by [Decision Receipt R1](DECISION_RECEIPT.md); the receipt records the produced outcome and does not re-evaluate
27. The [First Live Provider Readiness Gate](FIRST_LIVE_PROVIDER_READINESS_GATE.md) is an audit, not a provider; live ingestion stays closed until the recorded conditions pass
28. [Live Read Path Controls R1](LIVE_READ_PATH_CONTROLS.md) and [Disclosure Governance R1](DISCLOSURE_GOVERNANCE.md) decide operation authorization and spatial release separately
29. [First Live Provider Selection R1](FIRST_LIVE_PROVIDER_SELECTION.md) names one candidate source and does not authorize a live call
30. [USGS SGMC Provider Contract](USGS_SGMC_PROVIDER_CONTRACT.md) proves that candidate offline with documentation-derived fixtures
31. [USGS SGMC Shadow Read](USGS_SGMC_SHADOW_READ.md) records the first bounded non-production read
32. [USGS SGMC Shadow Certification](USGS_SGMC_SHADOW_CERTIFICATION.md) authorizes only a bounded repeated shadow read
33. [USGS SGMC Bounded Repeated Shadow](USGS_SGMC_BOUNDED_REPEATED_SHADOW.md) records four operator-triggered reads and does not authorize production
34. [USGS SGMC Production Readiness Gate](USGS_SGMC_PRODUCTION_READINESS_GATE.md) is conditionally ready and leaves ordinary-user display closed
35. [USGS SGMC Public Display Rights](USGS_SGMC_PUBLIC_DISPLAY_RIGHTS.md) grants constrained display of this SGMC release and does not enable a product surface

## Architecture Constraints

- Next.js App Router (TypeScript)
- Supabase (Postgres + PostGIS)
- Mapbox GL JS (abstracted for MapLibre)
- pnpm monorepo with project references

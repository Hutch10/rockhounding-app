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

## Architecture Constraints

- Next.js App Router (TypeScript)
- Supabase (Postgres + PostGIS)
- Mapbox GL JS (abstracted for MapLibre)
- pnpm monorepo with project references

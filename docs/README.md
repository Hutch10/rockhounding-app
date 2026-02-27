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

## Architecture Constraints

- Next.js App Router (TypeScript)
- Supabase (Postgres + PostGIS)
- Mapbox GL JS (abstracted for MapLibre)
- pnpm monorepo with project references

# Rockhounding + Geologist Web Application

Production-grade geospatial web app for rockhounding locations and professional geologist field observations.

## Architecture

This is a pnpm monorepo with TypeScript project references and strict quality gates.

### Workspace Structure

- `/apps/web` - Next.js PWA (App Router, TypeScript)
- `/packages/shared` - Shared enums, types, and Zod validators
- `/supabase/migrations` - Postgres + PostGIS schema migrations
- `/supabase/functions` - Background jobs (exports, state packs)
- `/scripts/ingest` - Data ingestion and seeding scripts
- `/docs` - Contracts, specifications, and policies

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting and formatting
pnpm lint
pnpm format
```

## Quality Gates

- TypeScript strict mode with project references
- ESLint + Prettier with pre-commit hooks
- Vitest for unit testing
- Husky + lint-staged for pre-commit validation

## Stack

- Next.js (TypeScript, App Router)
- Supabase (Postgres + PostGIS)
- Mapbox GL JS
- VS Code + GitHub Copilot

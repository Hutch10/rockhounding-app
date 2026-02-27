# Ingestion Scripts

Data seeding and bulk ingestion tools.

## Purpose

This directory contains Node.js/TypeScript scripts for:

- Seeding reference data (materials, rulesets)
- Bulk ingestion of location data
- CSV/JSON import utilities
- Data transformation pipelines
- Testing data generation

## Key Scripts

Scripts will be implemented in Step 4:

### Seed Materials

- Load reference data for minerals, rocks, fossils
- Include common rockhounding collectibles
- Standardized names and categories

### Seed Rulesets

- Load federal, state, county, and private land rules
- Include ruleset URLs ("Why?" links)
- Legal confidence scores

### Seed Staging Locations

- Load initial location data into locations_staging
- Require manual admin approval
- Test moderation workflow

## Usage

```bash
# Run seed script
pnpm --filter @rockhounding/ingest seed-materials
pnpm --filter @rockhounding/ingest seed-rulesets
pnpm --filter @rockhounding/ingest seed-locations
```

## Data Requirements

All ingested data MUST include:

- legal_tag
- legal_confidence (0-100)
- source_tier
- verification_date OR status=RESEARCH_REQUIRED
- primary_ruleset_id

## Constraints

- User submissions go to locations_staging (never direct to locations)
- All seeded data follows Build Document schemas exactly
- Use @rockhounding/shared enums (no string literals)

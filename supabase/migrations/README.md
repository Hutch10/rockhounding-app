# Supabase Migrations

Postgres + PostGIS schema migrations.

## Purpose

This directory contains all SQL migration files that define:

- Table schemas (locations, materials, rulesets, observations, etc.)
- PostGIS geography columns and spatial indexes
- RLS (Row Level Security) policies
- Database constraints and validation rules
- Indexes for performance

## Key Requirements

From the Build Document:

- `locations.geom` = geography(Point, 4326)
- GIST index on locations.geom
- Btree indexes on state, legal_tag, access_model, updated_at
- Constraints: legal_confidence BETWEEN 0 AND 100, difficulty BETWEEN 1 AND 5

## Tables Required

- `locations` - Public rockhounding locations
- `locations_staging` - Pending moderation queue
- `materials` - Minerals, rocks, fossils reference table
- `location_materials` - Many-to-many relationship
- `rulesets` - Legal rulesets with URLs
- `location_rulesets` - Location-to-ruleset associations
- `sources` - Data source provenance
- `geounits` - State/county boundaries
- `observations` - Geologist field observations (RLS owner-only)
- `observation_photos` - Photo attachments
- `exports` - Export job tracking
- `state_packs` - Offline state pack metadata

## Migration Files

Migration files will be created in Step 3.

## Running Migrations

```bash
supabase db reset
supabase db push
```

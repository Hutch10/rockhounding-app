# Supabase Edge Functions

Background jobs and serverless functions.

## Purpose

This directory contains Supabase Edge Functions (Deno runtime) for:

- Export job processing (GeoJSON, KML, CSV)
- State pack generation (vector-only offline bundles)
- Scheduled tasks and background processing
- Email notifications
- Webhook handlers

## Key Functions

Functions will be implemented in later steps:

### Export Jobs (Step 10)

- Process queued export requests
- Generate GeoJSON/KML/CSV files
- Upload to Supabase Storage
- Return signed download URLs

### State Pack Generator (Step 11)

- Generate vector-only JSON state packs
- Include locations, materials, rulesets for a state
- Compress and store in Supabase Storage
- Track pack versions and metadata

## Development

```bash
# Serve functions locally
supabase functions serve

# Deploy function
supabase functions deploy function-name
```

## Constraints

- All functions run on Deno runtime
- No map tiles in state packs (vector-only)
- Enforce same legal gating rules as web app
- Log all processing for audit trail

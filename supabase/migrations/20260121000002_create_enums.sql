-- Create database enums matching TypeScript enums from @rockhounding/shared
-- LOCKED: These values must match the Build Document exactly

-- Legal status for collecting at a location
-- Drives legal gating UI logic
CREATE TYPE legal_tag AS ENUM (
  'LEGAL_PUBLIC',
  'LEGAL_FEE_SITE',
  'LEGAL_CLUB_SUPERVISED',
  'GRAY_AREA',
  'RESEARCH_ONLY'
);

-- Data source provenance tier
CREATE TYPE source_tier AS ENUM (
  'OFFICIAL',
  'OPERATOR',
  'SECONDARY',
  'COMMUNITY_STAGED'
);

-- Operational status of a location
CREATE TYPE status AS ENUM (
  'OPEN',
  'SEASONAL',
  'CLOSED',
  'UNKNOWN',
  'RESEARCH_REQUIRED'
);

-- Visibility level for user-generated content
CREATE TYPE visibility AS ENUM (
  'PRIVATE',
  'SHARED_LINK',
  'TEAM'
);

-- Access model for locations (not in locked enums, but required per API contract)
CREATE TYPE access_model AS ENUM (
  'PUBLIC_LAND',
  'FEE_SITE',
  'CLUB_ONLY',
  'PERMISSION_REQUIRED',
  'UNKNOWN'
);

-- Moderation status for staging tables
CREATE TYPE moderation_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- Export job status
CREATE TYPE export_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- Export format types
CREATE TYPE export_format AS ENUM (
  'GEOJSON',
  'KML',
  'CSV'
);

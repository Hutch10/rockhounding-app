/**
 * Locked enums from Build Document
 * DO NOT modify these values without updating the Build Document
 */

/**
 * Legal status for collecting at a location
 * Drives legal gating UI logic
 */
export enum LegalTag {
  LEGAL_PUBLIC = 'LEGAL_PUBLIC',
  LEGAL_FEE_SITE = 'LEGAL_FEE_SITE',
  LEGAL_CLUB_SUPERVISED = 'LEGAL_CLUB_SUPERVISED',
  GRAY_AREA = 'GRAY_AREA',
  RESEARCH_ONLY = 'RESEARCH_ONLY',
}

/**
 * Data source provenance tier
 * Indicates reliability and authority of location data
 */
export enum SourceTier {
  OFFICIAL = 'OFFICIAL',
  OPERATOR = 'OPERATOR',
  SECONDARY = 'SECONDARY',
  COMMUNITY_STAGED = 'COMMUNITY_STAGED',
}

/**
 * Operational status of a location
 * Indicates whether the site is currently accessible
 */
export enum Status {
  OPEN = 'OPEN',
  SEASONAL = 'SEASONAL',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN',
  RESEARCH_REQUIRED = 'RESEARCH_REQUIRED',
}

/**
 * Visibility level for user-generated content
 * Used for observations and user submissions
 */
export enum Visibility {
  PRIVATE = 'PRIVATE',
  SHARED_LINK = 'SHARED_LINK',
  TEAM = 'TEAM',
}

/**
 * Locked enums from Build Document
 * DO NOT modify these values without updating the Build Document
 */

/**
 * Recorded location tag from the build document.
 * A tag is not current collecting permission or entry authorization.
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
 * Recorded operational status of a location.
 * OPEN is not collecting permission. CLOSED is not a collecting verdict.
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

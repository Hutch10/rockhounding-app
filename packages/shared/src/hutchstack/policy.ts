/**
 * HutchStack policy constants — versioned and deterministic.
 * Bump policy_version when weights or thresholds change (requires fixture re-approval).
 */
export const HUTCHSTACK_POLICY_VERSION = 'hutchstack-v1.1.0';
export const HUTCHSTACK_HARNESS_VERSION = '1.1.0';

export const LEGAL_DISCLAIMER =
  'Rockhound provides informational access guidance only, not legal advice. ' +
  'Collection rules change by agency, season, and material. Verify current regulations ' +
  'with the managing authority before collecting.';

export const CONFIDENCE_THRESHOLDS = {
  BLOCK_AUTO_PROMOTION: 40,
  STANDARD_QUEUE: 40,
  FAST_TRACK: 70,
  VERIFIED_BADGE: 85,
} as const;

export const SUBMISSION_COMPLETENESS = {
  MINIMUM_STAGING: 50,
  FAST_TRACK: 70,
} as const;

export const SITE_VERIFICATION = {
  GPS_ACCURACY_MAX_M: 50,
  MIN_VISITS_FOR_VERIFIED: 2,
  STALE_VERIFICATION_DAYS: 180,
  MIN_CONFIDENCE_FOR_BADGE: 85,
} as const;

export const PERMIT_STALENESS_DAYS = {
  CROWDSOURCED: 90,
  OFFICIAL: 365,
} as const;

export const TRUST_TIER_WEIGHTS: Record<number, number> = {
  1: 0.2,
  2: 0.5,
  3: 0.8,
  4: 1.0,
};

export const REPUTATION_DELTAS = {
  APPROVED: 10,
  REJECTED: -20,
  EXPERT_VALIDATION: 5,
  SPAM_CONFIRMED: -50,
} as const;

/** Trust decay — effective reputation halves over DECAY_HALF_LIFE_DAYS without validated action. */
export const TRUST_DECAY = {
  DECAY_HALF_LIFE_DAYS: 180,
  WILSON_UPPER_BOUND_N: 50,
  ZERO_HISTORY_APPROVAL_RATE: 0,
} as const;

export const DUPLICATE_DETECTION = {
  GEOHASH_PREFIX_LENGTH: 7,
  PROXIMITY_THRESHOLD_M: 200,
  NAME_SIMILARITY_THRESHOLD: 0.85,
  CONFIDENCE_PENALTY: 15,
  ESCALATE_PENALTY: 25,
} as const;

export const LOCATION_CONFIDENCE_WEIGHTS = {
  sourceTier: 0.3,
  evidence: 0.25,
  permitFreshness: 0.2,
  contributorTrust: 0.15,
  machineAgreement: 0.1,
} as const;

export const MATERIAL_CONFIDENCE_WEIGHTS = {
  machine: 0.4,
  visual: 0.35,
  expert: 0.4,
  consensus: 0.25,
} as const;

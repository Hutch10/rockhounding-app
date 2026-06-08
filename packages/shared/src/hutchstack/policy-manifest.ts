import { CANONICAL_SERIALIZATION_VERSION } from './canonical';
import {
  CONFIDENCE_THRESHOLDS,
  HUTCHSTACK_HARNESS_VERSION,
  HUTCHSTACK_POLICY_VERSION,
  LOCATION_CONFIDENCE_WEIGHTS,
  MATERIAL_CONFIDENCE_WEIGHTS,
  PERMIT_STALENESS_DAYS,
  REPUTATION_DELTAS,
  SITE_VERIFICATION,
  SUBMISSION_COMPLETENESS,
  TRUST_DECAY,
  TRUST_TIER_WEIGHTS,
} from './policy';

/** Immutable policy bundle for replay verification (client-safe, no hash). */
export interface PolicyManifest {
  policy_version: string;
  harness_version: string;
  canonical_version: string;
  weights: {
    location: typeof LOCATION_CONFIDENCE_WEIGHTS;
    material: typeof MATERIAL_CONFIDENCE_WEIGHTS;
    trust_tiers: typeof TRUST_TIER_WEIGHTS;
  };
  thresholds: {
    confidence: typeof CONFIDENCE_THRESHOLDS;
    submission: typeof SUBMISSION_COMPLETENESS;
    site_verification: typeof SITE_VERIFICATION;
    permit_staleness_days: typeof PERMIT_STALENESS_DAYS;
  };
  reputation_deltas: typeof REPUTATION_DELTAS;
  trust_decay: typeof TRUST_DECAY;
}

export function buildPolicyManifest(): PolicyManifest {
  return {
    policy_version: HUTCHSTACK_POLICY_VERSION,
    harness_version: HUTCHSTACK_HARNESS_VERSION,
    canonical_version: CANONICAL_SERIALIZATION_VERSION,
    weights: {
      location: LOCATION_CONFIDENCE_WEIGHTS,
      material: MATERIAL_CONFIDENCE_WEIGHTS,
      trust_tiers: TRUST_TIER_WEIGHTS,
    },
    thresholds: {
      confidence: CONFIDENCE_THRESHOLDS,
      submission: SUBMISSION_COMPLETENESS,
      site_verification: SITE_VERIFICATION,
      permit_staleness_days: PERMIT_STALENESS_DAYS,
    },
    reputation_deltas: REPUTATION_DELTAS,
    trust_decay: TRUST_DECAY,
  };
}

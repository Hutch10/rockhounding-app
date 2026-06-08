import { TRUST_DECAY, TRUST_TIER_WEIGHTS } from '../policy';
import type { TrustScoringInput, TrustScoringResult } from '../types';

/**
 * Wilson score lower bound for binomial proportion (z = 1.96).
 */
export function wilsonLowerBound(successes: number, total: number): number {
  if (total === 0) return TRUST_DECAY.ZERO_HISTORY_APPROVAL_RATE;
  const z = 1.96;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return Math.max(0, (center - margin) / denom);
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Exponential decay on reputation based on inactivity since last moderation action. */
export function computeEffectiveReputation(
  reputation_score: number,
  days_since_last_moderation_action?: number
): number {
  if (days_since_last_moderation_action === undefined) {
    return reputation_score * 0.85;
  }
  const lambda = Math.LN2 / TRUST_DECAY.DECAY_HALF_LIFE_DAYS;
  const decayFactor = Math.exp(-lambda * days_since_last_moderation_action);
  return Math.max(0, reputation_score * decayFactor);
}

function tierLabel(level: number): TrustScoringResult['trust_tier'] {
  switch (level) {
    case 4:
      return 'admin';
    case 3:
      return 'expert';
    case 2:
      return 'trusted';
    default:
      return 'novice';
  }
}

function privilegesForTier(level: number): string[] {
  const base = ['submit_locations'];
  if (level >= 2) base.push('fast_track_eligible');
  if (level >= 3) base.push('expert_material_validation');
  if (level >= 4) base.push('moderate_submissions', 'override_harness');
  return base;
}

function resolveApprovalRate(approvals: number, rejections: number): number {
  const total = approvals + rejections;
  if (total === 0) return TRUST_DECAY.ZERO_HISTORY_APPROVAL_RATE;
  if (total < TRUST_DECAY.WILSON_UPPER_BOUND_N) {
    return wilsonLowerBound(approvals, total);
  }
  return approvals / total;
}

export function evaluateCommunityTrust(input: TrustScoringInput): TrustScoringResult {
  const flags: string[] = [];
  const totalDecisions = input.approvals_90d + input.rejections_90d;
  const approvalRate = resolveApprovalRate(input.approvals_90d, input.rejections_90d);

  const reputationNorm = normalize(input.effective_reputation_score, 0, 300);
  const tierWeight = TRUST_TIER_WEIGHTS[input.trust_level] ?? TRUST_TIER_WEIGHTS[1] ?? 0.2;
  const evidenceNorm = normalize(input.evidence_quality_avg_90d, 0, 100);
  const ageFactor = normalize(input.account_age_days, 0, 365);

  const trust_score = Math.min(
    1,
    0.15 * reputationNorm +
      0.25 * tierWeight +
      0.3 * approvalRate +
      0.2 * evidenceNorm +
      0.1 * ageFactor
  );

  if (input.effective_reputation_score < 80) flags.push('low_reputation');
  if (approvalRate < 0.3 && totalDecisions >= 5) flags.push('low_approval_rate');
  if (totalDecisions > 10 && input.account_age_days < 7) {
    flags.push('high_velocity_new_account');
  }
  if (
    input.days_since_last_moderation_action !== undefined &&
    input.days_since_last_moderation_action > TRUST_DECAY.DECAY_HALF_LIFE_DAYS
  ) {
    flags.push('reputation_decayed');
  }

  return {
    trust_score,
    trust_tier: tierLabel(input.trust_level),
    privileges: privilegesForTier(input.trust_level),
    flags,
    effective_reputation_score: input.effective_reputation_score,
  };
}

/** Alias used by trust-adapter for submitter score derivation. */
export function applyTrustDecay(input: TrustScoringInput): TrustScoringResult {
  return evaluateCommunityTrust(input);
}

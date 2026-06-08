import { applyTrustDecay, computeEffectiveReputation } from './components/community-trust';
import type { ContributorModerationHistory, TrustScoringInput } from './types';

export interface TrustAdapterProfile {
  reputation_score: number;
  trust_level: number;
  created_at: string;
}

/**
 * Build trust scoring input from real profile + moderation history.
 * Never uses the current submission's harness output as evidence input.
 */
export function buildTrustScoringInput(params: {
  profile: TrustAdapterProfile;
  moderation_history: ContributorModerationHistory;
  now?: Date;
}): TrustScoringInput {
  const now = params.now ?? new Date();
  const createdAt = new Date(params.profile.created_at);
  const account_age_days = Math.max(
    0,
    Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  let days_since_last_moderation_action: number | undefined;
  if (
    params.moderation_history.last_moderation_action_at != null &&
    params.moderation_history.last_moderation_action_at !== ''
  ) {
    const lastAction = new Date(params.moderation_history.last_moderation_action_at);
    days_since_last_moderation_action = Math.floor(
      (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const effective_reputation_score = computeEffectiveReputation(
    params.profile.reputation_score,
    days_since_last_moderation_action
  );

  return {
    reputation_score: params.profile.reputation_score,
    effective_reputation_score,
    trust_level: params.profile.trust_level,
    approvals_90d: params.moderation_history.approvals_90d,
    rejections_90d: params.moderation_history.rejections_90d,
    evidence_quality_avg_90d: params.moderation_history.avg_approved_confidence_90d,
    account_age_days,
    days_since_last_moderation_action,
  };
}

/**
 * Compute submitter_trust_score for submission routing from decayed reputation + history.
 * Isolated from current submission completeness to prevent self-reinforcement.
 */
export function computeSubmitterTrustScore(trust: TrustScoringInput): number {
  const decayed = applyTrustDecay(trust);
  return Math.min(1, Math.max(0, decayed.trust_score));
}

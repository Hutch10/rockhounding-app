import { evaluateCommunityTrust } from '../components/community-trust';
import { evaluateMaterialIdentification } from '../components/material-identification';
import { evaluateModerationGate } from '../components/moderation';
import { evaluatePermitValidation } from '../components/permit-validation';
import { evaluateSiteVerification } from '../components/site-verification';
import { evaluateUserSubmission } from '../components/user-submissions';
import { detectDuplicateSite } from '../duplicate-detection';
import {
  CONFIDENCE_THRESHOLDS,
  HUTCHSTACK_HARNESS_VERSION,
  HUTCHSTACK_POLICY_VERSION,
  LEGAL_DISCLAIMER,
} from '../policy';
import type {
  HarnessComponentResults,
  HarnessEvaluationRequest,
  HarnessEvaluationResponse,
  RiskTier,
} from '../types';

import { buildProvenanceRecord } from './provenance';

function deriveRiskTier(components: HarnessComponentResults, confidence: number): RiskTier {
  if (components.user_submission?.route === 'block') return 'T0';
  if (components.permit_validation?.permit_status === 'prohibited') return 'T0';
  if (components.site_verification?.verification_status === 'DISPUTED') return 'T0';

  if (components.permit_validation?.fail_closed === true) return 'T1';
  if (confidence < CONFIDENCE_THRESHOLDS.STANDARD_QUEUE) return 'T1';

  if (
    components.user_submission?.route === 'fast_track' &&
    confidence >= CONFIDENCE_THRESHOLDS.FAST_TRACK
  ) {
    return 'T3';
  }

  if (
    components.site_verification?.eligible_for_verified_badge === true &&
    confidence >= CONFIDENCE_THRESHOLDS.VERIFIED_BADGE
  ) {
    return 'T4';
  }

  return 'T2';
}

function computeOverallConfidence(components: HarnessComponentResults): number {
  const scores: number[] = [];

  if (components.site_verification != null) scores.push(components.site_verification.confidence);
  if (components.user_submission != null) {
    scores.push(components.user_submission.adjusted_confidence);
  }
  if (components.material_identification != null) {
    scores.push(components.material_identification.confidence_breakdown.total * 100);
  }
  if (components.community_trust != null) scores.push(components.community_trust.trust_score * 100);

  if (components.permit_validation != null) {
    const permitScore = Math.max(0, 100 - components.permit_validation.confidence_penalty * 100);
    scores.push(permitScore);
  }

  if (
    components.duplicate_detection != null &&
    components.duplicate_detection.confidence_penalty > 0
  ) {
    scores.push(Math.max(0, 100 - components.duplicate_detection.confidence_penalty));
  }

  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function buildRecommendations(components: HarnessComponentResults): string[] {
  const recs: string[] = [];

  if (components.user_submission?.route === 'block') {
    recs.push('Submission blocked: improve completeness before staging.');
  }
  if ((components.site_verification?.gaps.length ?? 0) > 0) {
    recs.push(`Site gaps: ${components.site_verification!.gaps.join(', ')}`);
  }
  if (components.permit_validation?.fail_closed === true) {
    recs.push('Permit fail-closed: apply caution advisory until resolved.');
  }
  if (components.moderation != null && !components.moderation.ready) {
    recs.push(`Moderation blockers: ${components.moderation.blockers.join(', ')}`);
  }
  if (components.material_identification?.identification_state === 'PENDING_USER_VALIDATION') {
    recs.push('Material ID requires user validation before canon linkage.');
  }
  if ((components.community_trust?.flags.length ?? 0) > 0) {
    recs.push(`Trust flags: ${components.community_trust?.flags.join(', ') ?? ''}`);
  }
  if (components.duplicate_detection?.is_duplicate_candidate === true) {
    recs.push('Duplicate site candidate detected: review before promotion.');
  }

  return recs;
}

function resolveLegalDisclaimer(components: HarnessComponentResults): string {
  return components.permit_validation?.legal_disclaimer ?? LEGAL_DISCLAIMER;
}

/** Server-only harness orchestrator (requires provenance hashing). */
export function runHarnessEvaluation(request: HarnessEvaluationRequest): HarnessEvaluationResponse {
  if (
    request.policy_version != null &&
    request.policy_version !== '' &&
    request.policy_version !== HUTCHSTACK_POLICY_VERSION
  ) {
    throw new Error(
      `Unsupported policy version: ${request.policy_version}. Expected ${HUTCHSTACK_POLICY_VERSION}`
    );
  }

  const components: HarnessComponentResults = {};

  if (request.site != null) {
    components.site_verification = evaluateSiteVerification(request.site);
  }
  if (request.permit != null) {
    components.permit_validation = evaluatePermitValidation(request.permit);
  }
  if (request.submission != null) {
    components.user_submission = evaluateUserSubmission(request.submission);
    if (components.user_submission.duplicate_signal != null) {
      components.duplicate_detection = components.user_submission.duplicate_signal;
    }
  }
  const submission = request.submission;
  if (
    (submission?.nearby_sites?.length ?? 0) > 0 &&
    components.duplicate_detection == null &&
    submission != null
  ) {
    components.duplicate_detection = detectDuplicateSite({
      latitude: submission.latitude,
      longitude: submission.longitude,
      name: submission.name,
      state: submission.state,
      geohash: submission.geohash,
      nearby_sites: submission.nearby_sites ?? [],
    });
  }
  if (request.material != null) {
    components.material_identification = evaluateMaterialIdentification(request.material);
  }
  if (request.moderation != null) {
    components.moderation = evaluateModerationGate(request.moderation);
  }
  if (request.trust != null) {
    components.community_trust = evaluateCommunityTrust(request.trust);
  }

  const overall_confidence = computeOverallConfidence(components);
  const overall_risk_tier = deriveRiskTier(components, overall_confidence);
  const legal_disclaimer = resolveLegalDisclaimer(components);
  const recommendations = buildRecommendations(components);
  const evaluated_at = new Date().toISOString();

  const outputPreimage = {
    overall_risk_tier,
    overall_confidence,
    components,
    recommendations,
    legal_disclaimer,
  };

  const provenance = buildProvenanceRecord({
    request,
    outputPreimage,
    entity_id: request.entity_id ?? 'anonymous',
    occurred_at: evaluated_at,
    actor_id: request.actor_id,
    chain: request.chain,
  });

  return {
    policy_version: HUTCHSTACK_POLICY_VERSION,
    harness_version: HUTCHSTACK_HARNESS_VERSION,
    evaluated_at,
    overall_risk_tier,
    overall_confidence,
    components,
    provenance,
    recommendations,
    legal_disclaimer,
  };
}

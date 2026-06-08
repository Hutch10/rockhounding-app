import { SITE_VERIFICATION } from '../policy';
import type { SiteVerificationInput, SiteVerificationResult } from '../types';

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function evaluateSiteVerification(input: SiteVerificationInput): SiteVerificationResult {
  const gaps: string[] = [];
  let score = 30;

  if (input.is_disputed === true) {
    return {
      verification_status: 'DISPUTED',
      confidence: 20,
      gaps: ['site_disputed'],
      eligible_for_verified_badge: false,
    };
  }

  if (
    input.last_verified_at != null &&
    input.last_verified_at !== '' &&
    daysSince(input.last_verified_at) > SITE_VERIFICATION.STALE_VERIFICATION_DAYS
  ) {
    return {
      verification_status: 'REVERIFICATION_REQUIRED',
      confidence: 45,
      gaps: ['verification_stale'],
      eligible_for_verified_badge: false,
    };
  }

  if (input.has_official_source) {
    score += 35;
  } else {
    gaps.push('no_official_source');
  }

  if (input.photo_count >= 1) {
    score += 15;
  } else {
    gaps.push('missing_photo_evidence');
  }

  if (input.visit_count >= SITE_VERIFICATION.MIN_VISITS_FOR_VERIFIED) {
    score += 20;
  } else if (!input.has_official_source) {
    gaps.push('insufficient_visit_corroboration');
  }

  if (input.gps_accuracy_m !== undefined) {
    if (input.gps_accuracy_m <= SITE_VERIFICATION.GPS_ACCURACY_MAX_M) {
      score += 10;
    } else {
      gaps.push('gps_accuracy_poor');
      score -= 10;
    }
  } else {
    gaps.push('gps_accuracy_unknown');
  }

  score = Math.max(0, Math.min(100, score));

  const eligible =
    score >= SITE_VERIFICATION.MIN_CONFIDENCE_FOR_BADGE &&
    (input.has_official_source || input.visit_count >= SITE_VERIFICATION.MIN_VISITS_FOR_VERIFIED) &&
    input.photo_count >= 1;

  let verification_status: SiteVerificationResult['verification_status'];
  if (eligible) {
    verification_status = 'VERIFIED';
  } else if (score >= 60) {
    verification_status = 'PARTIALLY_VERIFIED';
  } else {
    verification_status = 'UNVERIFIED';
  }

  return {
    verification_status,
    confidence: score,
    gaps,
    eligible_for_verified_badge: eligible,
  };
}

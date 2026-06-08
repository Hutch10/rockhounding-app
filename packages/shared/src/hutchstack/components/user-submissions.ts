import { detectDuplicateSite } from '../duplicate-detection';
import { SUBMISSION_COMPLETENESS } from '../policy';
import type {
  DuplicateSiteSignal,
  SubmissionRoute,
  UserSubmissionInput,
  UserSubmissionResult,
} from '../types';

export function scoreSubmissionCompleteness(input: UserSubmissionInput): number {
  let score = 0;

  if (
    input.name.length >= 3 &&
    input.state != null &&
    input.state !== '' &&
    input.legal_tag != null &&
    input.legal_tag !== ''
  ) {
    score += 40;
  }

  if (input.description != null && input.description !== '' && input.description.length >= 50) {
    score += 15;
  }

  if (
    (input.directions != null && input.directions !== '') ||
    (input.parking_info != null && input.parking_info !== '')
  ) {
    score += 15;
  }

  if (
    (input.season_info != null && input.season_info !== '') ||
    (input.fees_cost != null && input.fees_cost !== '')
  ) {
    score += 10;
  }

  if (input.evidence_attachment_count >= 1) {
    score += 20;
  }

  return Math.min(100, score);
}

export function evaluateUserSubmission(input: UserSubmissionInput): UserSubmissionResult {
  const flags: string[] = [];
  const completeness_score = scoreSubmissionCompleteness(input);

  let duplicate_signal: DuplicateSiteSignal | undefined;
  if (input.nearby_sites != null && input.nearby_sites.length > 0) {
    duplicate_signal = detectDuplicateSite({
      latitude: input.latitude,
      longitude: input.longitude,
      name: input.name,
      state: input.state,
      geohash: input.geohash,
      nearby_sites: input.nearby_sites,
    });
    flags.push(...duplicate_signal.flags);
  }

  const is_duplicate_candidate =
    input.is_duplicate_candidate ?? duplicate_signal?.is_duplicate_candidate ?? false;
  const is_name_collision = input.is_name_collision ?? duplicate_signal?.is_name_collision ?? false;

  if (is_duplicate_candidate) flags.push('DUPLICATE_CANDIDATE');
  if (is_name_collision) flags.push('NAME_COLLISION');
  if (input.access_status === 'prohibited') flags.push('PROHIBITED_ACCESS');

  const duplicate_penalty =
    input.duplicate_confidence_penalty ?? duplicate_signal?.confidence_penalty ?? 0;
  const adjusted_confidence = Math.max(0, completeness_score - duplicate_penalty);

  let route: SubmissionRoute = 'standard';

  if (completeness_score < SUBMISSION_COMPLETENESS.MINIMUM_STAGING) {
    route = 'block';
  } else if (is_duplicate_candidate || is_name_collision || input.access_status === 'prohibited') {
    route = 'escalate';
  } else if (
    adjusted_confidence >= SUBMISSION_COMPLETENESS.FAST_TRACK &&
    input.submitter_trust_level >= 2 &&
    input.submitter_trust_score >= 0.6 &&
    !flags.includes('DUPLICATE_CANDIDATE')
  ) {
    route = 'fast_track';
  }

  return {
    completeness_score,
    route,
    flags: [...new Set(flags)],
    duplicate_signal,
    adjusted_confidence,
  };
}

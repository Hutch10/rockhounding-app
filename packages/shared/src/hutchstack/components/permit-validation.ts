import { LEGAL_DISCLAIMER, PERMIT_STALENESS_DAYS } from '../policy';
import type {
  HarnessAdvisoryLevel,
  PermitStatus,
  PermitValidationInput,
  PermitValidationResult,
} from '../types';

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_TO_PERMIT: Record<string, PermitStatus> = {
  allowed: 'clear',
  caution: 'caution',
  restricted: 'restricted',
  prohibited: 'prohibited',
  unknown: 'unknown',
};

const PERMIT_TO_ADVISORY: Record<PermitStatus, HarnessAdvisoryLevel> = {
  clear: 'safe',
  caution: 'caution',
  restricted: 'warning',
  prohibited: 'critical',
  unknown: 'caution',
};

export function evaluatePermitValidation(input: PermitValidationInput): PermitValidationResult {
  const reason_codes: string[] = [];
  let confidence_penalty = 0;

  const permit_status = STATUS_TO_PERMIT[input.access_status] ?? 'unknown';
  let advisory_level = PERMIT_TO_ADVISORY[permit_status];

  if (input.boundary_match === 'none') {
    reason_codes.push('blank_slate_exposure');
    confidence_penalty += 0.4;
    advisory_level = 'caution';
  } else if (input.boundary_match === 'region') {
    reason_codes.push('region_intercept_only');
    confidence_penalty += 0.1;
  } else if (input.boundary_match === 'parcel') {
    reason_codes.push('parcel_intercept');
  }

  if (input.has_access_conflict === true) {
    reason_codes.push('access_conflict');
    confidence_penalty += 0.25;
  }

  if (input.severity_gap !== undefined && input.severity_gap >= 2) {
    reason_codes.push('severity_gap');
    confidence_penalty += 0.15;
  }

  if (
    (input.authority_url == null || input.authority_url === '') &&
    (permit_status === 'restricted' || permit_status === 'prohibited')
  ) {
    reason_codes.push('missing_authority_url');
    confidence_penalty += 0.2;
  }

  const source_type = input.source_type ?? 'crowdsourced';
  const stale_threshold_days =
    source_type === 'official'
      ? PERMIT_STALENESS_DAYS.OFFICIAL
      : PERMIT_STALENESS_DAYS.CROWDSOURCED;

  let days_since_verified: number | undefined;
  let is_stale = false;

  if (input.last_verified_at != null && input.last_verified_at !== '') {
    days_since_verified = daysSince(input.last_verified_at);
    if (days_since_verified > stale_threshold_days) {
      reason_codes.push('rule_stale');
      is_stale = true;
      confidence_penalty += source_type === 'official' ? 0.05 : 0.15;
    }
  } else {
    reason_codes.push('never_verified');
    is_stale = true;
    confidence_penalty += 0.2;
  }

  if (input.material_restricted === true) {
    reason_codes.push('material_restricted');
  }

  const fail_closed =
    permit_status === 'prohibited' ||
    permit_status === 'unknown' ||
    input.has_access_conflict === true;

  return {
    permit_status,
    advisory_level,
    reason_codes,
    confidence_penalty: Math.min(1, confidence_penalty),
    fail_closed,
    legal_disclaimer: LEGAL_DISCLAIMER,
    authority_metadata: {
      authority_url: input.authority_url,
      source_type,
      managing_agency: input.managing_agency,
    },
    staleness_metadata: {
      last_verified_at: input.last_verified_at,
      days_since_verified,
      is_stale,
      stale_threshold_days,
    },
  };
}

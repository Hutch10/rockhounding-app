import {
  buildHarnessChainFromSubmission,
  buildTrustScoringInput,
  computeSubmitterTrustScore,
  detectDuplicateSite,
  type ContributorModerationHistory,
  type HarnessEvaluationRequest,
  type PermitValidationInput,
  type SiteVerificationInput,
  TrustAdapterProfile,
} from '@rockhounding/shared/hutchstack';

/** Map staging row + profile + real moderation history to harness submission request. */
export function stagingToHarnessRequest(
  staging: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    state: string;
    legal_tag: string;
    geohash?: string | null;
    description?: string | null;
    directions?: string | null;
    parking_info?: string | null;
    season_info?: string | null;
    fees_cost?: string | null;
  },
  profile: TrustAdapterProfile,
  moderation_history: ContributorModerationHistory,
  options?: {
    evidence_count?: number;
    access_status?: string;
    nearby_sites?: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      geohash?: string;
      source: 'canon' | 'staging';
    }>;
    submission_event_id?: string;
    actor_id?: string;
  }
): HarnessEvaluationRequest {
  const trust = buildTrustScoringInput({ profile, moderation_history });
  const submitter_trust_score = computeSubmitterTrustScore(trust);

  const nearby_sites = options?.nearby_sites ?? [];
  const duplicate_signal =
    nearby_sites.length > 0
      ? detectDuplicateSite({
          latitude: Number(staging.lat),
          longitude: Number(staging.lon),
          name: staging.name,
          state: staging.state,
          geohash: staging.geohash ?? undefined,
          nearby_sites,
        })
      : undefined;

  const chain =
    options?.submission_event_id != null && options.submission_event_id !== ''
      ? buildHarnessChainFromSubmission({
          submission_event_id: options.submission_event_id,
          staging_id: staging.id,
        })
      : undefined;

  return {
    evaluation_type: 'submission',
    entity_id: staging.id,
    entity_type: 'staging',
    actor_id: options?.actor_id,
    chain,
    submission: {
      name: staging.name,
      latitude: Number(staging.lat),
      longitude: Number(staging.lon),
      state: staging.state,
      legal_tag: staging.legal_tag,
      geohash: staging.geohash ?? undefined,
      description: staging.description ?? undefined,
      directions: staging.directions ?? undefined,
      parking_info: staging.parking_info ?? undefined,
      season_info: staging.season_info ?? undefined,
      fees_cost: staging.fees_cost ?? undefined,
      evidence_attachment_count: options?.evidence_count ?? 0,
      submitter_trust_level: profile.trust_level,
      submitter_trust_score,
      nearby_sites,
      is_duplicate_candidate: duplicate_signal?.is_duplicate_candidate,
      is_name_collision: duplicate_signal?.is_name_collision,
      duplicate_confidence_penalty: duplicate_signal?.confidence_penalty,
      access_status: options?.access_status,
    },
    trust,
  };
}

/** Map access check RPC response to permit validation input. */
export function accessCheckToPermitInput(
  lat: number,
  lon: number,
  accessResponse: {
    status?: string;
    confidence?: { total?: number };
    reason_codes?: string[];
    boundary_match?: string;
    last_verified_at?: string;
    authority_url?: string;
    source_type?: 'official' | 'crowdsourced' | 'derived';
    managing_agency?: string;
    severity_gap?: number;
  }
): PermitValidationInput {
  const status = (accessResponse.status ?? 'unknown') as PermitValidationInput['access_status'];
  return {
    latitude: lat,
    longitude: lon,
    access_status: status,
    boundary_match: accessResponse.boundary_match as PermitValidationInput['boundary_match'],
    last_verified_at: accessResponse.last_verified_at,
    authority_url: accessResponse.authority_url,
    source_type: accessResponse.source_type,
    managing_agency: accessResponse.managing_agency,
    severity_gap: accessResponse.severity_gap,
    has_access_conflict: (accessResponse.reason_codes ?? []).includes('access_conflict'),
  };
}

/** Map location fields to site verification input. */
export function locationToSiteInput(
  location: {
    latitude: number;
    longitude: number;
    is_verified?: boolean;
    source_tier?: string;
    last_verified_at?: string | null;
  },
  evidence?: { photo_count?: number; visit_count?: number; gps_accuracy_m?: number }
): SiteVerificationInput {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    gps_accuracy_m: evidence?.gps_accuracy_m,
    photo_count: evidence?.photo_count ?? 0,
    visit_count: evidence?.visit_count ?? 0,
    has_official_source: location.source_tier === 'OFFICIAL',
    last_verified_at: location.last_verified_at ?? undefined,
  };
}

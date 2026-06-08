import type { ConfidenceBreakdown } from '../v1-contract';

export type RiskTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
export type EvaluationType = 'submission' | 'site' | 'find' | 'full';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'REVERIFICATION_REQUIRED';

export type SubmissionRoute = 'block' | 'standard' | 'fast_track' | 'escalate';

export type IdentificationState =
  | 'PENDING_CLASSIFICATION'
  | 'PENDING_USER_VALIDATION'
  | 'USER_VALIDATED'
  | 'EXPERT_REVIEW'
  | 'DISPUTED'
  | 'CORRECTION_PENDING';

export type MaterialIdentificationTier =
  | 'VISUAL_GUESS'
  | 'COMMUNITY_SUPPORTED'
  | 'EXPERT_REVIEWED'
  | 'LAB_CONFIRMED';

export type PermitStatus = 'clear' | 'caution' | 'restricted' | 'prohibited' | 'unknown';
export type HarnessAdvisoryLevel = 'safe' | 'caution' | 'warning' | 'critical';

export type RootEventType =
  | 'submission.created'
  | 'capture.session_created'
  | 'access.rule_matched';

export interface ProvenanceChainContext {
  parent_event_id?: string;
  root_event_type?: RootEventType;
  root_event_id?: string;
  chain_sequence?: number;
}

export interface ProvenanceHashes {
  hash_alg: 'sha256-v1';
  harness_version: string;
  policy_version: string;
  policy_hash: string;
  input_hash: string;
  output_hash: string;
  evaluation_hash: string;
}

// --- Component Inputs ---

export interface SiteVerificationInput {
  latitude: number;
  longitude: number;
  gps_accuracy_m?: number;
  photo_count: number;
  visit_count: number;
  has_official_source: boolean;
  last_verified_at?: string;
  is_disputed?: boolean;
}

export interface PermitAuthorityMetadata {
  authority_url?: string;
  source_type?: 'official' | 'crowdsourced' | 'derived';
  managing_agency?: string;
}

export interface PermitStalenessMetadata {
  last_verified_at?: string;
  days_since_verified?: number;
  is_stale: boolean;
  stale_threshold_days: number;
}

export interface PermitValidationInput {
  latitude: number;
  longitude: number;
  access_status: 'allowed' | 'caution' | 'restricted' | 'prohibited' | 'unknown';
  source_type?: 'official' | 'crowdsourced' | 'derived';
  last_verified_at?: string;
  authority_url?: string;
  managing_agency?: string;
  has_access_conflict?: boolean;
  severity_gap?: number;
  boundary_match?: 'parcel' | 'region' | 'none';
  material_restricted?: boolean;
}

export interface NearbySiteRef {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geohash?: string;
  source: 'canon' | 'staging';
}

export interface DuplicateDetectionInput {
  latitude: number;
  longitude: number;
  name: string;
  state: string;
  geohash?: string;
  nearby_sites: NearbySiteRef[];
}

export interface UserSubmissionInput {
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  legal_tag: string;
  description?: string;
  directions?: string;
  parking_info?: string;
  season_info?: string;
  fees_cost?: string;
  evidence_attachment_count: number;
  submitter_trust_level: number;
  submitter_trust_score: number;
  is_duplicate_candidate?: boolean;
  is_name_collision?: boolean;
  duplicate_confidence_penalty?: number;
  access_status?: string;
  geohash?: string;
  nearby_sites?: NearbySiteRef[];
}

export interface MaterialIdentificationInput {
  classification_confidence: number;
  has_user_validation: boolean;
  user_action?:
    | 'ACCEPT'
    | 'REJECT_WITH_CORRECTION'
    | 'REJECT_UNCERTAIN'
    | 'REQUEST_EXPERT'
    | 'SKIP';
  is_expert_validation?: boolean;
  expert_validation_count?: number;
  consensus_count?: number;
  user_confidence?: number;
  is_lab_confirmed?: boolean;
  is_self_validation?: boolean;
}

export interface ModerationGateInput {
  moderation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderation_enabled: boolean;
  has_access_conflict?: boolean;
  has_unresolved_duplicate?: boolean;
  reject_reason_length?: number;
  intended_action?: 'APPROVE' | 'REJECT';
}

export interface TrustScoringInput {
  reputation_score: number;
  effective_reputation_score: number;
  trust_level: number;
  approvals_90d: number;
  rejections_90d: number;
  evidence_quality_avg_90d: number;
  account_age_days: number;
  days_since_last_moderation_action?: number;
}

export interface ContributorModerationHistory {
  approvals_90d: number;
  rejections_90d: number;
  avg_approved_confidence_90d: number;
  last_moderation_action_at?: string;
}

// --- Component Outputs ---

export interface SiteVerificationResult {
  verification_status: VerificationStatus;
  confidence: number;
  gaps: string[];
  eligible_for_verified_badge: boolean;
}

export interface PermitValidationResult {
  permit_status: PermitStatus;
  advisory_level: HarnessAdvisoryLevel;
  reason_codes: string[];
  confidence_penalty: number;
  fail_closed: boolean;
  legal_disclaimer: string;
  authority_metadata: PermitAuthorityMetadata;
  staleness_metadata: PermitStalenessMetadata;
}

export interface DuplicateSiteSignal {
  is_duplicate_candidate: boolean;
  is_name_collision: boolean;
  nearest_match_id?: string;
  nearest_distance_m?: number;
  geohash_prefix_match?: string;
  confidence_penalty: number;
  flags: string[];
}

export interface UserSubmissionResult {
  completeness_score: number;
  route: SubmissionRoute;
  flags: string[];
  duplicate_signal?: DuplicateSiteSignal;
  adjusted_confidence: number;
}

export interface MaterialIdentificationResult {
  identification_state: IdentificationState;
  identification_tier: MaterialIdentificationTier;
  confidence_breakdown: ConfidenceBreakdown;
  ground_truth_eligible: boolean;
}

export interface ModerationGateResult {
  ready: boolean;
  blockers: string[];
  recommended_action?: 'APPROVE' | 'REJECT' | 'HOLD';
}

export interface TrustScoringResult {
  trust_score: number;
  trust_tier: 'novice' | 'trusted' | 'expert' | 'admin';
  privileges: string[];
  flags: string[];
  effective_reputation_score: number;
}

export interface ProvenanceRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  actor_id: string;
  actor_role: 'user' | 'moderator' | 'harness' | 'system';
  hashes: ProvenanceHashes;
  parent_event_id?: string;
  chain_sequence?: number;
  root_event_type?: RootEventType;
  root_event_id?: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface HarnessComponentResults {
  site_verification?: SiteVerificationResult;
  permit_validation?: PermitValidationResult;
  user_submission?: UserSubmissionResult;
  material_identification?: MaterialIdentificationResult;
  moderation?: ModerationGateResult;
  community_trust?: TrustScoringResult;
  duplicate_detection?: DuplicateSiteSignal;
}

export interface HarnessEvaluationRequest {
  evaluation_type: EvaluationType;
  policy_version?: string;
  entity_id?: string;
  entity_type?: string;
  actor_id?: string;
  chain?: ProvenanceChainContext;
  site?: SiteVerificationInput;
  permit?: PermitValidationInput;
  submission?: UserSubmissionInput;
  material?: MaterialIdentificationInput;
  moderation?: ModerationGateInput;
  trust?: TrustScoringInput;
}

export interface HarnessEvaluationResponse {
  policy_version: string;
  harness_version: string;
  evaluated_at: string;
  overall_risk_tier: RiskTier;
  overall_confidence: number;
  components: HarnessComponentResults;
  provenance: ProvenanceRecord;
  recommendations: string[];
  legal_disclaimer: string;
}

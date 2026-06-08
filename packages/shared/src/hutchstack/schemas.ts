import { z } from 'zod';

export const ProvenanceHashesSchema = z.object({
  hash_alg: z.literal('sha256-v1'),
  harness_version: z.string(),
  policy_version: z.string(),
  policy_hash: z.string(),
  input_hash: z.string(),
  output_hash: z.string(),
  evaluation_hash: z.string(),
});

export const ProvenanceChainContextSchema = z.object({
  parent_event_id: z.string().optional(),
  root_event_type: z
    .enum(['submission.created', 'capture.session_created', 'access.rule_matched'])
    .optional(),
  root_event_id: z.string().optional(),
  chain_sequence: z.number().int().optional(),
});

export const NearbySiteRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  geohash: z.string().optional(),
  source: z.enum(['canon', 'staging']),
});

export const SiteVerificationInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  gps_accuracy_m: z.number().optional(),
  photo_count: z.number().int().nonnegative(),
  visit_count: z.number().int().nonnegative(),
  has_official_source: z.boolean(),
  last_verified_at: z.string().datetime().optional(),
  is_disputed: z.boolean().optional(),
});

export const PermitValidationInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  access_status: z.enum(['allowed', 'caution', 'restricted', 'prohibited', 'unknown']),
  source_type: z.enum(['official', 'crowdsourced', 'derived']).optional(),
  last_verified_at: z.string().datetime().optional(),
  authority_url: z.string().url().optional(),
  managing_agency: z.string().optional(),
  has_access_conflict: z.boolean().optional(),
  severity_gap: z.number().int().optional(),
  boundary_match: z.enum(['parcel', 'region', 'none']).optional(),
  material_restricted: z.boolean().optional(),
});

export const UserSubmissionInputSchema = z.object({
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  state: z.string().min(2),
  legal_tag: z.string(),
  description: z.string().optional(),
  directions: z.string().optional(),
  parking_info: z.string().optional(),
  season_info: z.string().optional(),
  fees_cost: z.string().optional(),
  evidence_attachment_count: z.number().int().nonnegative(),
  submitter_trust_level: z.number().int().min(1).max(4),
  submitter_trust_score: z.number().min(0).max(1),
  is_duplicate_candidate: z.boolean().optional(),
  is_name_collision: z.boolean().optional(),
  duplicate_confidence_penalty: z.number().optional(),
  access_status: z.string().optional(),
  geohash: z.string().optional(),
  nearby_sites: z.array(NearbySiteRefSchema).optional(),
});

export const MaterialIdentificationInputSchema = z.object({
  classification_confidence: z.number().min(0).max(1),
  has_user_validation: z.boolean(),
  user_action: z
    .enum(['ACCEPT', 'REJECT_WITH_CORRECTION', 'REJECT_UNCERTAIN', 'REQUEST_EXPERT', 'SKIP'])
    .optional(),
  is_expert_validation: z.boolean().optional(),
  expert_validation_count: z.number().int().optional(),
  consensus_count: z.number().int().optional(),
  user_confidence: z.number().int().min(1).max(5).optional(),
  is_lab_confirmed: z.boolean().optional(),
  is_self_validation: z.boolean().optional(),
});

export const ModerationGateInputSchema = z.object({
  moderation_status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  moderation_enabled: z.boolean(),
  has_access_conflict: z.boolean().optional(),
  has_unresolved_duplicate: z.boolean().optional(),
  reject_reason_length: z.number().int().optional(),
  intended_action: z.enum(['APPROVE', 'REJECT']).optional(),
});

export const TrustScoringInputSchema = z.object({
  reputation_score: z.number().nonnegative(),
  effective_reputation_score: z.number().nonnegative(),
  trust_level: z.number().int().min(1).max(4),
  approvals_90d: z.number().int().nonnegative(),
  rejections_90d: z.number().int().nonnegative(),
  evidence_quality_avg_90d: z.number().min(0).max(100),
  account_age_days: z.number().int().nonnegative(),
  days_since_last_moderation_action: z.number().int().nonnegative().optional(),
});

export const HarnessEvaluationRequestSchema = z.object({
  evaluation_type: z.enum(['submission', 'site', 'find', 'full']),
  policy_version: z.string().optional(),
  entity_id: z.string().optional(),
  entity_type: z.string().optional(),
  actor_id: z.string().optional(),
  chain: ProvenanceChainContextSchema.optional(),
  site: SiteVerificationInputSchema.optional(),
  permit: PermitValidationInputSchema.optional(),
  submission: UserSubmissionInputSchema.optional(),
  material: MaterialIdentificationInputSchema.optional(),
  moderation: ModerationGateInputSchema.optional(),
  trust: TrustScoringInputSchema.optional(),
});

export const HarnessEvaluationResponseSchema = z.object({
  policy_version: z.string(),
  harness_version: z.string(),
  evaluated_at: z.string().datetime(),
  overall_risk_tier: z.enum(['T0', 'T1', 'T2', 'T3', 'T4']),
  overall_confidence: z.number().min(0).max(100),
  components: z.record(z.string(), z.unknown()),
  provenance: z.object({
    id: z.string(),
    entity_type: z.string(),
    entity_id: z.string(),
    event_type: z.string(),
    actor_id: z.string(),
    actor_role: z.enum(['user', 'moderator', 'harness', 'system']),
    hashes: ProvenanceHashesSchema,
    parent_event_id: z.string().optional(),
    chain_sequence: z.number().int().optional(),
    root_event_type: z
      .enum(['submission.created', 'capture.session_created', 'access.rule_matched'])
      .optional(),
    root_event_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()),
    occurred_at: z.string().datetime(),
  }),
  recommendations: z.array(z.string()),
  legal_disclaimer: z.string().min(1),
});

/**
 * Partner tenancy — site-scoped operator authority.
 *
 * Partners may maintain only allowlisted operational fields for sites they
 * have a VERIFIED claim on. They never gain geology, legal, certainty,
 * observation, or provenance-deletion authority. Paid listing tiers never
 * alter trust/legal/certainty (see OperatorListingTier / paidTierDoesNotAlterTrust).
 *
 * Extends fee-site OperatorClaimState; does not create a parallel site database.
 */

import { z } from 'zod';

import {
  FeeSiteSourceAuthority,
  OperatorClaimState,
  type FeeSiteMetadataEnvelope,
  type OperatorClaimState as FeeOperatorClaimState,
} from './fee-site-support';
import { OperatorListingTier, paidTierDoesNotAlterTrust } from './trust-field-kernel';

// ---------------------------------------------------------------------------
// Phase 1 — Tenancy scopes (site-specific; never global over unrelated sites)
// ---------------------------------------------------------------------------

export const PartnerTenancyRole = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  SITE_OPERATOR: 'SITE_OPERATOR',
  SHOP_OPERATOR: 'SHOP_OPERATOR',
  CLUB_OPERATOR: 'CLUB_OPERATOR',
  MUSEUM_OPERATOR: 'MUSEUM_OPERATOR',
  IDENTIFICATION_RESOURCE_OPERATOR: 'IDENTIFICATION_RESOURCE_OPERATOR',
  READ_ONLY_PARTNER: 'READ_ONLY_PARTNER',
} as const;

export type PartnerTenancyRole = (typeof PartnerTenancyRole)[keyof typeof PartnerTenancyRole];

export const PartnerTenancyRoleSchema = z.enum([
  'PLATFORM_ADMIN',
  'SITE_OPERATOR',
  'SHOP_OPERATOR',
  'CLUB_OPERATOR',
  'MUSEUM_OPERATOR',
  'IDENTIFICATION_RESOURCE_OPERATOR',
  'READ_ONLY_PARTNER',
]);

export const MUTATING_PARTNER_ROLES: ReadonlySet<PartnerTenancyRole> = new Set([
  PartnerTenancyRole.SITE_OPERATOR,
  PartnerTenancyRole.SHOP_OPERATOR,
  PartnerTenancyRole.CLUB_OPERATOR,
  PartnerTenancyRole.MUSEUM_OPERATOR,
  PartnerTenancyRole.IDENTIFICATION_RESOURCE_OPERATOR,
]);

// ---------------------------------------------------------------------------
// Phase 2 — Claim model
// ---------------------------------------------------------------------------

export const PartnerClaimStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;

export type PartnerClaimStatus = (typeof PartnerClaimStatus)[keyof typeof PartnerClaimStatus];

export const PartnerClaimStatusSchema = z.enum([
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'REVOKED',
  'EXPIRED',
]);

/** Map partner claim status ↔ fee-site OperatorClaimState where overlapping. */
export function partnerClaimStatusToOperatorClaimState(
  status: PartnerClaimStatus
): FeeOperatorClaimState {
  switch (status) {
    case PartnerClaimStatus.PENDING:
      return OperatorClaimState.PENDING;
    case PartnerClaimStatus.VERIFIED:
      return OperatorClaimState.VERIFIED;
    case PartnerClaimStatus.REVOKED:
      return OperatorClaimState.REVOKED;
    case PartnerClaimStatus.REJECTED:
    case PartnerClaimStatus.EXPIRED:
      return OperatorClaimState.UNCLAIMED;
    default:
      return OperatorClaimState.UNCLAIMED;
  }
}

export const PartnerClaimBasis = {
  OPERATOR_DIRECT: 'OPERATOR_DIRECT',
  DOMAIN_EMAIL: 'DOMAIN_EMAIL',
  OFFICIAL_WEBSITE: 'OFFICIAL_WEBSITE',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  DOCUMENTATION: 'DOCUMENTATION',
  OTHER: 'OTHER',
} as const;

export type PartnerClaimBasis = (typeof PartnerClaimBasis)[keyof typeof PartnerClaimBasis];

export const PartnerClaimBasisSchema = z.enum([
  'OPERATOR_DIRECT',
  'DOMAIN_EMAIL',
  'OFFICIAL_WEBSITE',
  'PHONE_VERIFICATION',
  'DOCUMENTATION',
  'OTHER',
]);

/** Social / public contact alone must never auto-approve. */
export const AUTO_APPROVE_FORBIDDEN_BASES: ReadonlySet<string> = new Set([
  'SOCIAL_MEDIA',
  'PUBLIC_CONTACT_SCRAPE',
  'DIRECTORY_LISTING',
]);

export const PartnerSiteClaimSchema = z.object({
  claim_id: z.string().uuid(),
  site_id: z.string().uuid(),
  user_id: z.string().uuid(),
  organization_name: z.string().min(1).optional(),
  requested_role: PartnerTenancyRoleSchema,
  claim_basis: PartnerClaimBasisSchema,
  evidence: z.string().min(1),
  status: PartnerClaimStatusSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  verified_at: z.string().datetime({ offset: true }).optional(),
  verified_by: z.string().uuid().optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
  revocation_reason: z.string().optional(),
  /** Public/state sites may be platform-managed and not claimable. */
  claimable: z.boolean().default(true),
});

export type PartnerSiteClaim = z.infer<typeof PartnerSiteClaimSchema>;

export const SubmitPartnerClaimInputSchema = z.object({
  site_id: z.string().uuid(),
  organization_name: z.string().min(1).optional(),
  requested_role: PartnerTenancyRoleSchema.refine((r) => r !== PartnerTenancyRole.PLATFORM_ADMIN, {
    message: 'Cannot self-request PLATFORM_ADMIN',
  }),
  claim_basis: PartnerClaimBasisSchema,
  evidence: z.string().min(8),
});

export type SubmitPartnerClaimInput = z.infer<typeof SubmitPartnerClaimInputSchema>;

// ---------------------------------------------------------------------------
// Phase 3 — Mutation allowlist (explicit; not UI convention)
// ---------------------------------------------------------------------------

export const PartnerEditableField = {
  hours: 'hours',
  season: 'season',
  pricing: 'pricing',
  contact_info: 'contact_info',
  website: 'website',
  reservation_info: 'reservation_info',
  waiver_requirements: 'waiver_requirements',
  tool_rules: 'tool_rules',
  take_home_rules: 'take_home_rules',
  amenities: 'amenities',
  temporary_closure: 'temporary_closure',
  operator_notes: 'operator_notes',
  events: 'events',
  access_instructions_on_property: 'access_instructions_on_property',
} as const;

export type PartnerEditableField = (typeof PartnerEditableField)[keyof typeof PartnerEditableField];

export const PARTNER_EDITABLE_FIELDS: ReadonlySet<PartnerEditableField> = new Set(
  Object.values(PartnerEditableField)
);

export const PartnerProhibitedField = {
  independent_geology: 'independent_geology',
  material_certainty: 'material_certainty',
  land_ownership_outside_site: 'land_ownership_outside_site',
  government_legal_rules: 'government_legal_rules',
  route_legality_outside_operator_access: 'route_legality_outside_operator_access',
  third_party_evidence: 'third_party_evidence',
  historical_provenance: 'historical_provenance',
  user_observations: 'user_observations',
  specimen_records: 'specimen_records',
  platform_certainty: 'platform_certainty',
  conflict_resolution: 'conflict_resolution',
  source_authority_class: 'source_authority_class',
  trust_state: 'trust_state',
  paid_trust_boost: 'paid_trust_boost',
} as const;

export type PartnerProhibitedField =
  (typeof PartnerProhibitedField)[keyof typeof PartnerProhibitedField];

export const PARTNER_PROHIBITED_FIELDS: ReadonlySet<string> = new Set(
  Object.values(PartnerProhibitedField)
);

// ---------------------------------------------------------------------------
// Phase 5 — Moderation classes
// ---------------------------------------------------------------------------

export const PartnerUpdateModerationClass = {
  DIRECT_APPLY: 'DIRECT_APPLY',
  MODERATION_REQUIRED: 'MODERATION_REQUIRED',
  PROHIBITED: 'PROHIBITED',
} as const;

export type PartnerUpdateModerationClass =
  (typeof PartnerUpdateModerationClass)[keyof typeof PartnerUpdateModerationClass];

const DIRECT_APPLY_FIELDS: ReadonlySet<PartnerEditableField> = new Set([
  PartnerEditableField.hours,
  PartnerEditableField.contact_info,
  PartnerEditableField.website,
  PartnerEditableField.pricing,
  PartnerEditableField.temporary_closure,
  PartnerEditableField.reservation_info,
  PartnerEditableField.amenities,
  PartnerEditableField.season,
  PartnerEditableField.events,
  PartnerEditableField.operator_notes,
]);

const MODERATION_REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  PartnerEditableField.waiver_requirements,
  PartnerEditableField.tool_rules,
  PartnerEditableField.take_home_rules,
  PartnerEditableField.access_instructions_on_property,
  'material_claims',
  'collecting_rule_interpretation',
  'route_statements',
  'legal_access_claims',
  'geology_descriptions',
  'permanent_closure',
  'ownership_change',
]);

export function classifyPartnerFieldUpdate(field: string): PartnerUpdateModerationClass {
  if (PARTNER_PROHIBITED_FIELDS.has(field)) {
    return PartnerUpdateModerationClass.PROHIBITED;
  }
  if (DIRECT_APPLY_FIELDS.has(field as PartnerEditableField)) {
    return PartnerUpdateModerationClass.DIRECT_APPLY;
  }
  if (MODERATION_REQUIRED_FIELDS.has(field)) {
    return PartnerUpdateModerationClass.MODERATION_REQUIRED;
  }
  if (PARTNER_EDITABLE_FIELDS.has(field as PartnerEditableField)) {
    return PartnerUpdateModerationClass.MODERATION_REQUIRED;
  }
  return PartnerUpdateModerationClass.PROHIBITED;
}

// ---------------------------------------------------------------------------
// Phase 4 — Provenance on every partner update
// ---------------------------------------------------------------------------

export const PartnerProvenanceEventSchema = z.object({
  event_id: z.string().uuid(),
  actor_user_id: z.string().uuid(),
  site_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
  field: z.string().min(1),
  old_value: z.unknown(),
  new_value: z.unknown(),
  field_scope: z.enum(['partner_operational', 'moderation_pending', 'prohibited_blocked']),
  source_type: z.literal(FeeSiteSourceAuthority.OPERATOR_DIRECT),
  reason: z.string().optional(),
  moderation_class: z.enum(['DIRECT_APPLY', 'MODERATION_REQUIRED', 'PROHIBITED']),
});

export type PartnerProvenanceEvent = z.infer<typeof PartnerProvenanceEventSchema>;

export function buildPartnerProvenanceEvent(input: {
  event_id: string;
  actor_user_id: string;
  site_id: string;
  claim_id: string;
  timestamp: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  reason?: string;
}): PartnerProvenanceEvent {
  const moderation = classifyPartnerFieldUpdate(input.field);
  const field_scope =
    moderation === PartnerUpdateModerationClass.PROHIBITED
      ? 'prohibited_blocked'
      : moderation === PartnerUpdateModerationClass.MODERATION_REQUIRED
        ? 'moderation_pending'
        : 'partner_operational';

  return PartnerProvenanceEventSchema.parse({
    ...input,
    field_scope,
    source_type: FeeSiteSourceAuthority.OPERATOR_DIRECT,
    moderation_class: moderation,
  });
}

// ---------------------------------------------------------------------------
// Phase 6 — Authorization (fail-closed)
// ---------------------------------------------------------------------------

export type PartnerAuthzDecision =
  | { allowed: true; moderation: PartnerUpdateModerationClass }
  | { allowed: false; code: string; reason: string };

export function claimGrantsMutation(claim: PartnerSiteClaim | null | undefined): boolean {
  if (claim == null) return false;
  if (claim.claimable !== true) return false;
  if (claim.status !== PartnerClaimStatus.VERIFIED) return false;
  if (!MUTATING_PARTNER_ROLES.has(claim.requested_role)) return false;
  if (
    claim.expires_at != null &&
    claim.expires_at !== '' &&
    Date.parse(claim.expires_at) < Date.now()
  ) {
    return false;
  }
  return true;
}

export function authorizePartnerFieldMutation(input: {
  claim: PartnerSiteClaim | null | undefined;
  actor_user_id: string;
  site_id: string;
  field: string;
  is_platform_admin?: boolean;
}): PartnerAuthzDecision {
  if (input.is_platform_admin === true) {
    const moderation = classifyPartnerFieldUpdate(input.field);
    if (moderation === PartnerUpdateModerationClass.PROHIBITED) {
      // Even admins must not use partner path for prohibited semantics;
      // platform admin uses separate admin surfaces.
      return {
        allowed: false,
        code: 'PROHIBITED_FIELD',
        reason: 'Field is not mutable via partner tenancy path',
      };
    }
    return { allowed: true, moderation };
  }

  const claim = input.claim;
  if (claim == null) {
    return { allowed: false, code: 'NO_CLAIM', reason: 'No partner claim for site' };
  }
  if (claim.user_id !== input.actor_user_id) {
    return { allowed: false, code: 'SPOOFED_TENANT', reason: 'Claim belongs to another user' };
  }
  if (claim.site_id !== input.site_id) {
    return { allowed: false, code: 'SPOOFED_SITE', reason: 'Claim site_id mismatch' };
  }
  if (claim.status === PartnerClaimStatus.PENDING) {
    return { allowed: false, code: 'CLAIM_PENDING', reason: 'Pending claims cannot mutate' };
  }
  if (claim.status === PartnerClaimStatus.REVOKED) {
    return { allowed: false, code: 'CLAIM_REVOKED', reason: 'Revoked claims cannot mutate' };
  }
  if (claim.status === PartnerClaimStatus.REJECTED) {
    return { allowed: false, code: 'CLAIM_REJECTED', reason: 'Rejected claims cannot mutate' };
  }
  if (claim.status === PartnerClaimStatus.EXPIRED) {
    return { allowed: false, code: 'CLAIM_EXPIRED', reason: 'Expired claims cannot mutate' };
  }
  if (!claim.claimable) {
    return {
      allowed: false,
      code: 'SITE_NOT_CLAIMABLE',
      reason: 'Platform-managed site; partner claim edits disabled',
    };
  }
  if (!MUTATING_PARTNER_ROLES.has(claim.requested_role)) {
    return {
      allowed: false,
      code: 'READ_ONLY_ROLE',
      reason: 'Role cannot mutate partner fields',
    };
  }
  if (claim.requested_role === PartnerTenancyRole.PLATFORM_ADMIN) {
    return {
      allowed: false,
      code: 'ROLE_ESCALATION',
      reason: 'Partner claim cannot carry PLATFORM_ADMIN',
    };
  }

  const moderation = classifyPartnerFieldUpdate(input.field);
  if (moderation === PartnerUpdateModerationClass.PROHIBITED) {
    return {
      allowed: false,
      code: 'PROHIBITED_FIELD',
      reason: `Field "${input.field}" is prohibited for partners`,
    };
  }

  if (!claimGrantsMutation(claim)) {
    return { allowed: false, code: 'CLAIM_INACTIVE', reason: 'Claim does not grant mutation' };
  }

  return { allowed: true, moderation };
}

export function authorizeClaimSubmission(input: {
  actor_user_id: string | null | undefined;
  site_claimable: boolean;
  requested_role: PartnerTenancyRole;
  claim_basis: PartnerClaimBasis;
}): PartnerAuthzDecision {
  if (input.actor_user_id == null || input.actor_user_id === '') {
    return { allowed: false, code: 'UNAUTHENTICATED', reason: 'Authentication required' };
  }
  if (!input.site_claimable) {
    return {
      allowed: false,
      code: 'SITE_NOT_CLAIMABLE',
      reason: 'Public/state platform-managed sites are not self-claimable',
    };
  }
  if (input.requested_role === PartnerTenancyRole.PLATFORM_ADMIN) {
    return {
      allowed: false,
      code: 'ROLE_ESCALATION',
      reason: 'Cannot request PLATFORM_ADMIN via claim',
    };
  }
  if (AUTO_APPROVE_FORBIDDEN_BASES.has(String(input.claim_basis))) {
    return {
      allowed: false,
      code: 'WEAK_CLAIM_BASIS',
      reason: 'Social/public scrape alone cannot form a claim basis',
    };
  }
  return { allowed: true, moderation: PartnerUpdateModerationClass.MODERATION_REQUIRED };
}

// ---------------------------------------------------------------------------
// Phase 11 — Paid features boundary
// ---------------------------------------------------------------------------

export const PAID_FEATURE_ALLOWLIST = [
  'enhanced_presentation',
  'booking_links',
  'events_promotion',
  'analytics',
  'promoted_placement',
] as const;

export const NEVER_PAID_TRUST_CONTROLS = [
  'VERIFIED_status',
  'legal_permission',
  'geology_certainty',
  'source_authority',
  'conflict_resolution',
  'trust_score',
  'moderation_bypass',
] as const;

export function assertPaidNeverBuysTrust(tier: OperatorListingTier): {
  paidDoesNotAlterTrust: true;
  neverPaidControls: typeof NEVER_PAID_TRUST_CONTROLS;
} {
  paidTierDoesNotAlterTrust(tier);
  return {
    paidDoesNotAlterTrust: true,
    neverPaidControls: NEVER_PAID_TRUST_CONTROLS,
  };
}

// ---------------------------------------------------------------------------
// Phase 13 — Public UX copy
// ---------------------------------------------------------------------------

export const OPERATOR_CONFIRMED_LABEL = 'Operator-confirmed business information';

export function publicOperatorConfirmedVisible(
  claimStatus: PartnerClaimStatus | FeeOperatorClaimState
): boolean {
  return claimStatus === 'VERIFIED';
}

export function operatorConfirmedDoesNotImply(endorsements: {
  platformEndorsement?: boolean;
  geologyVerification?: boolean;
  legalVerification?: boolean;
}): boolean {
  return (
    endorsements.platformEndorsement !== true &&
    endorsements.geologyVerification !== true &&
    endorsements.legalVerification !== true
  );
}

// ---------------------------------------------------------------------------
// Fixtures — Cowee (claim-ready) + Crater (platform-managed control)
// ---------------------------------------------------------------------------

/** Claim-ready fixture only — does not fabricate a verified partner user. */
export const COWEE_PARTNER_TENANCY_FIXTURE = {
  site_key: 'cowee-gift-shop-mason-mountain-mine',
  display_name: 'Cowee Gift Shop & Mason Mountain Mine',
  claimable: true,
  recommended_role: PartnerTenancyRole.SITE_OPERATOR,
  claim_basis_example: PartnerClaimBasis.OPERATOR_DIRECT,
  provenance_notes: [
    'Verbal inclusion permission: site may be listed in Rocky Atlas with public business identity.',
    'Permission scope (exact): listing name, location, and publicly stated business facts only — not paid placement, not geology verification, not legal authorization.',
    'Public business identity: Cowee Gift Shop & Mason Mountain Mine (public-facing trade name).',
    'Follow-up requested: operator interested in a future conversation (not an account grant).',
    'No logo, photo, or endorsement permission unless separately granted.',
  ],
  /** No verified operator user_id assigned — claim-ready only. */
  verified_user_id: null as string | null,
  claim_status: PartnerClaimStatus.PENDING,
} as const;

/** Public/state park — platform-managed; not self-claimable the same way. */
export const CRATER_PARTNER_TENANCY_CONTROL = {
  site_key: 'crater-of-diamonds-state-park',
  display_name: 'Crater of Diamonds State Park',
  claimable: false,
  management: 'PLATFORM_MANAGED_PUBLIC_INSTITUTION',
  reason:
    'Public/state operator sites remain platform-managed; partner tenancy does not assume all sites are equally self-claimable.',
} as const;

export function applyPartnerDirectUpdate(input: {
  envelope: FeeSiteMetadataEnvelope;
  field: PartnerEditableField;
  value: unknown;
  claim: PartnerSiteClaim;
  actor_user_id: string;
  event_id: string;
  timestamp: string;
  reason?: string;
}): {
  decision: PartnerAuthzDecision;
  next?: FeeSiteMetadataEnvelope;
  provenance?: PartnerProvenanceEvent;
} {
  const decision = authorizePartnerFieldMutation({
    claim: input.claim,
    actor_user_id: input.actor_user_id,
    site_id: input.claim.site_id,
    field: input.field,
  });
  if (!decision.allowed) {
    return { decision };
  }

  const profile = { ...(input.envelope.feeProfile ?? {}) };
  const old_value = (profile as Record<string, unknown>)[mapFieldToProfileKey(input.field)];

  if (decision.moderation === PartnerUpdateModerationClass.DIRECT_APPLY) {
    applyFieldToProfile(profile as Record<string, unknown>, input.field, input.value);
  }

  const next: FeeSiteMetadataEnvelope = {
    ...input.envelope,
    feeProfile: {
      ...profile,
      operatorClaimState: partnerClaimStatusToOperatorClaimState(input.claim.status),
      lastOperatorConfirmationAt: input.timestamp,
    } as FeeSiteMetadataEnvelope['feeProfile'],
  };

  const provenance = buildPartnerProvenanceEvent({
    event_id: input.event_id,
    actor_user_id: input.actor_user_id,
    site_id: input.claim.site_id,
    claim_id: input.claim.claim_id,
    timestamp: input.timestamp,
    field: input.field,
    old_value,
    new_value: input.value,
    reason: input.reason,
  });

  return { decision, next, provenance };
}

function mapFieldToProfileKey(field: PartnerEditableField): string {
  switch (field) {
    case PartnerEditableField.hours:
      return 'hours';
    case PartnerEditableField.season:
      return 'seasonality';
    case PartnerEditableField.pricing:
      return 'pricingSummary';
    case PartnerEditableField.contact_info:
      return 'contactDetails';
    case PartnerEditableField.amenities:
      return 'amenities';
    case PartnerEditableField.temporary_closure:
      return 'temporaryClosureNote';
    case PartnerEditableField.waiver_requirements:
      return 'waiverRequired';
    case PartnerEditableField.tool_rules:
      return 'toolPolicy';
    default:
      return field;
  }
}

function applyFieldToProfile(
  profile: Record<string, unknown>,
  field: PartnerEditableField,
  value: unknown
): void {
  const key = mapFieldToProfileKey(field);
  profile[key] = value;
}

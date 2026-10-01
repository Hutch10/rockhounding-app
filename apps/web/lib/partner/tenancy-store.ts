/**
 * In-process partner tenancy store (test + Preview).
 * Persistence migration is proposed only — not applied to Production.
 */

import { randomUUID } from 'crypto';

import {
  PartnerClaimStatus,
  PartnerSiteClaimSchema,
  SubmitPartnerClaimInputSchema,
  authorizeClaimSubmission,
  authorizePartnerFieldMutation,
  applyPartnerDirectUpdate,
  buildPartnerProvenanceEvent,
  type PartnerEditableField,
  type PartnerProvenanceEvent,
  type PartnerSiteClaim,
  type SubmitPartnerClaimInput,
  COWEE_PARTNER_TENANCY_FIXTURE,
  CRATER_PARTNER_TENANCY_CONTROL,
} from '@rockhounding/shared/partner-tenancy';
import {
  FeeSiteMetadataEnvelopeSchema,
  type FeeSiteMetadataEnvelope,
} from '@rockhounding/shared/fee-site-support';

export type SiteClaimability = {
  site_id: string;
  claimable: boolean;
  site_key?: string;
};

const claims = new Map<string, PartnerSiteClaim>();
const provenanceLog: PartnerProvenanceEvent[] = [];
const siteClaimability = new Map<string, boolean>();
const siteEnvelopes = new Map<string, FeeSiteMetadataEnvelope>();

/** Seed Cowee (claim-ready) + Crater (not claimable) fixtures — no fabricated user ownership. */
export function seedPartnerTenancyFixtures(ids?: {
  coweeSiteId?: string;
  craterSiteId?: string;
}): void {
  const coweeId = ids?.coweeSiteId ?? 'a0000000-0000-4000-8000-00000000c0ee';
  const craterId = ids?.craterSiteId ?? 'a0000000-0000-4000-8000-00000000c7a7';
  siteClaimability.set(coweeId, COWEE_PARTNER_TENANCY_FIXTURE.claimable);
  siteClaimability.set(craterId, CRATER_PARTNER_TENANCY_CONTROL.claimable);
}

export function resetPartnerTenancyStoreForTests(): void {
  claims.clear();
  provenanceLog.length = 0;
  siteClaimability.clear();
  siteEnvelopes.clear();
}

export function setSiteClaimable(siteId: string, claimable: boolean): void {
  siteClaimability.set(siteId, claimable);
}

export function isSiteClaimable(siteId: string): boolean {
  return siteClaimability.get(siteId) ?? true;
}

export function getClaimsForUser(userId: string): PartnerSiteClaim[] {
  return [...claims.values()].filter((c) => c.user_id === userId);
}

export function getVerifiedClaimForSiteUser(
  siteId: string,
  userId: string
): PartnerSiteClaim | undefined {
  return [...claims.values()].find(
    (c) => c.site_id === siteId && c.user_id === userId && c.status === PartnerClaimStatus.VERIFIED
  );
}

export function getPublicClaimStatusForSite(siteId: string): PartnerClaimStatus | null {
  const verified = [...claims.values()].find(
    (c) => c.site_id === siteId && c.status === PartnerClaimStatus.VERIFIED
  );
  return verified?.status ?? null;
}

export function submitPartnerClaim(
  userId: string,
  input: SubmitPartnerClaimInput
): { ok: true; claim: PartnerSiteClaim } | { ok: false; code: string; reason: string } {
  const parsed = SubmitPartnerClaimInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_INPUT', reason: parsed.error.message };
  }

  const authz = authorizeClaimSubmission({
    actor_user_id: userId,
    site_claimable: isSiteClaimable(parsed.data.site_id),
    requested_role: parsed.data.requested_role,
    claim_basis: parsed.data.claim_basis,
  });
  if (!authz.allowed) {
    return { ok: false, code: authz.code, reason: authz.reason };
  }

  const now = new Date().toISOString();
  const claim = PartnerSiteClaimSchema.parse({
    claim_id: randomUUID(),
    site_id: parsed.data.site_id,
    user_id: userId,
    organization_name: parsed.data.organization_name,
    requested_role: parsed.data.requested_role,
    claim_basis: parsed.data.claim_basis,
    evidence: parsed.data.evidence,
    status: PartnerClaimStatus.PENDING,
    created_at: now,
    updated_at: now,
    claimable: isSiteClaimable(parsed.data.site_id),
  });
  claims.set(claim.claim_id, claim);
  return { ok: true, claim };
}

/** Moderator/admin verification — not self-service. */
export function verifyPartnerClaim(
  claimId: string,
  verifierUserId: string
): { ok: true; claim: PartnerSiteClaim } | { ok: false; code: string; reason: string } {
  const claim = claims.get(claimId);
  if (!claim) return { ok: false, code: 'NOT_FOUND', reason: 'Claim not found' };
  if (claim.status !== PartnerClaimStatus.PENDING) {
    return { ok: false, code: 'INVALID_STATE', reason: 'Only PENDING claims can be verified' };
  }
  const now = new Date().toISOString();
  const next = PartnerSiteClaimSchema.parse({
    ...claim,
    status: PartnerClaimStatus.VERIFIED,
    verified_at: now,
    verified_by: verifierUserId,
    updated_at: now,
  });
  claims.set(claimId, next);
  return { ok: true, claim: next };
}

export function revokePartnerClaim(
  claimId: string,
  reason: string
): { ok: true; claim: PartnerSiteClaim } | { ok: false; code: string; reason: string } {
  const claim = claims.get(claimId);
  if (!claim) return { ok: false, code: 'NOT_FOUND', reason: 'Claim not found' };
  const now = new Date().toISOString();
  const next = PartnerSiteClaimSchema.parse({
    ...claim,
    status: PartnerClaimStatus.REVOKED,
    revocation_reason: reason,
    updated_at: now,
  });
  claims.set(claimId, next);
  return { ok: true, claim: next };
}

export function mutatePartnerSiteField(input: {
  userId: string;
  siteId: string;
  field: PartnerEditableField;
  value: unknown;
  reason?: string;
  envelope?: FeeSiteMetadataEnvelope;
}):
  | {
      ok: true;
      provenance: PartnerProvenanceEvent;
      envelope?: FeeSiteMetadataEnvelope;
      moderation: string;
    }
  | { ok: false; code: string; reason: string } {
  const claim =
    getVerifiedClaimForSiteUser(input.siteId, input.userId) ??
    [...claims.values()].find((c) => c.site_id === input.siteId && c.user_id === input.userId);

  const decision = authorizePartnerFieldMutation({
    claim,
    actor_user_id: input.userId,
    site_id: input.siteId,
    field: input.field,
  });
  if (!decision.allowed) {
    return { ok: false, code: decision.code, reason: decision.reason };
  }
  if (!claim) {
    return { ok: false, code: 'NO_CLAIM', reason: 'No claim' };
  }

  const envelope =
    input.envelope ?? siteEnvelopes.get(input.siteId) ?? FeeSiteMetadataEnvelopeSchema.parse({});

  const result = applyPartnerDirectUpdate({
    envelope,
    field: input.field,
    value: input.value,
    claim,
    actor_user_id: input.userId,
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    reason: input.reason,
  });

  if (!result.decision.allowed || !result.provenance) {
    return {
      ok: false,
      code: !result.decision.allowed ? result.decision.code : 'UPDATE_FAILED',
      reason: !result.decision.allowed ? result.decision.reason : 'Update failed',
    };
  }

  provenanceLog.push(result.provenance);
  if (result.next) {
    siteEnvelopes.set(input.siteId, result.next);
  }

  return {
    ok: true,
    provenance: result.provenance,
    envelope: result.next,
    moderation: decision.moderation,
  };
}

export function listPartnerProvenance(): PartnerProvenanceEvent[] {
  return [...provenanceLog];
}

/** Guard: partners never get a path that deletes provenance. */
export function attemptDeleteProvenance(_actorUserId: string): {
  ok: false;
  code: 'PROHIBITED_FIELD';
  reason: string;
} {
  return {
    ok: false,
    code: 'PROHIBITED_FIELD',
    reason: 'Partners cannot delete provenance history',
  };
}

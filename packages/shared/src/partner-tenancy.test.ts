/**
 * Partner tenancy — authorization, allowlist, fixtures, paid boundary.
 */

import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { OperatorClaimState, SiteType } from './fee-site-support';
import { OperatorListingTier } from './trust-field-kernel';
import {
  AUTO_APPROVE_FORBIDDEN_BASES,
  COWEE_PARTNER_TENANCY_FIXTURE,
  CRATER_PARTNER_TENANCY_CONTROL,
  NEVER_PAID_TRUST_CONTROLS,
  OPERATOR_CONFIRMED_LABEL,
  PARTNER_EDITABLE_FIELDS,
  PARTNER_PROHIBITED_FIELDS,
  PartnerClaimBasis,
  PartnerClaimStatus,
  PartnerEditableField,
  PartnerProhibitedField,
  PartnerTenancyRole,
  PartnerUpdateModerationClass,
  applyPartnerDirectUpdate,
  assertPaidNeverBuysTrust,
  authorizeClaimSubmission,
  authorizePartnerFieldMutation,
  buildPartnerProvenanceEvent,
  claimGrantsMutation,
  classifyPartnerFieldUpdate,
  operatorConfirmedDoesNotImply,
  partnerClaimStatusToOperatorClaimState,
  publicOperatorConfirmedVisible,
  type PartnerSiteClaim,
} from './partner-tenancy';

function verifiedClaim(overrides?: Partial<PartnerSiteClaim>): PartnerSiteClaim {
  const now = '2026-09-30T18:00:00.000Z';
  return {
    claim_id: randomUUID(),
    site_id: randomUUID(),
    user_id: randomUUID(),
    organization_name: 'Test Fee Mine LLC',
    requested_role: PartnerTenancyRole.SITE_OPERATOR,
    claim_basis: PartnerClaimBasis.OPERATOR_DIRECT,
    evidence: 'Phone verification with site manager on 2026-09-01',
    status: PartnerClaimStatus.VERIFIED,
    created_at: now,
    updated_at: now,
    verified_at: now,
    claimable: true,
    ...overrides,
  };
}

describe('partner-tenancy principles + allowlist', () => {
  it('defines site-scoped mutating roles without global authority', () => {
    expect(PartnerTenancyRole.SITE_OPERATOR).toBe('SITE_OPERATOR');
    expect(PartnerTenancyRole.SHOP_OPERATOR).toBe('SHOP_OPERATOR');
    expect(PartnerTenancyRole.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
  });

  it('exposes explicit editable allowlist and prohibited set', () => {
    expect(PARTNER_EDITABLE_FIELDS.has(PartnerEditableField.hours)).toBe(true);
    expect(PARTNER_EDITABLE_FIELDS.has(PartnerEditableField.pricing)).toBe(true);
    expect(PARTNER_PROHIBITED_FIELDS.has(PartnerProhibitedField.independent_geology)).toBe(true);
    expect(PARTNER_PROHIBITED_FIELDS.has(PartnerProhibitedField.user_observations)).toBe(true);
    expect(PARTNER_PROHIBITED_FIELDS.has(PartnerProhibitedField.material_certainty)).toBe(true);
  });

  it('classifies moderation for hours vs geology vs observations', () => {
    expect(classifyPartnerFieldUpdate('hours')).toBe(PartnerUpdateModerationClass.DIRECT_APPLY);
    expect(classifyPartnerFieldUpdate('geology_descriptions')).toBe(
      PartnerUpdateModerationClass.MODERATION_REQUIRED
    );
    expect(classifyPartnerFieldUpdate('independent_geology')).toBe(
      PartnerUpdateModerationClass.PROHIBITED
    );
    expect(classifyPartnerFieldUpdate('paid_trust_boost')).toBe(
      PartnerUpdateModerationClass.PROHIBITED
    );
  });
});

describe('partner-tenancy claim verification states', () => {
  it('maps statuses onto fee-site OperatorClaimState without inventing geology authority', () => {
    expect(partnerClaimStatusToOperatorClaimState(PartnerClaimStatus.VERIFIED)).toBe(
      OperatorClaimState.VERIFIED
    );
    expect(partnerClaimStatusToOperatorClaimState(PartnerClaimStatus.PENDING)).toBe(
      OperatorClaimState.PENDING
    );
    expect(partnerClaimStatusToOperatorClaimState(PartnerClaimStatus.REJECTED)).toBe(
      OperatorClaimState.UNCLAIMED
    );
  });

  it('forbids auto-approve from social scrape bases', () => {
    expect(AUTO_APPROVE_FORBIDDEN_BASES.has('SOCIAL_MEDIA')).toBe(true);
    const denied = authorizeClaimSubmission({
      actor_user_id: randomUUID(),
      site_claimable: true,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: 'SOCIAL_MEDIA',
    });
    expect(denied.allowed).toBe(false);
  });
});

describe('partner-tenancy authorization (negative controls)', () => {
  it('1. verified operator may edit own hours', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerEditableField.hours,
    });
    expect(d.allowed).toBe(true);
  });

  it('2. verified operator may edit own pricing', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerEditableField.pricing,
    });
    expect(d.allowed).toBe(true);
  });

  it('3. operator cannot edit another site pricing', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: randomUUID(),
      field: PartnerEditableField.pricing,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('SPOOFED_SITE');
  });

  it('4. operator cannot set geology certainty', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerProhibitedField.material_certainty,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('PROHIBITED_FIELD');
  });

  it('5. operator cannot set trust state', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerProhibitedField.trust_state,
    });
    expect(d.allowed).toBe(false);
  });

  it('6. operator cannot delete historical provenance', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerProhibitedField.historical_provenance,
    });
    expect(d.allowed).toBe(false);
  });

  it('7. revoked operator cannot edit', () => {
    const claim = verifiedClaim({ status: PartnerClaimStatus.REVOKED });
    expect(claimGrantsMutation(claim)).toBe(false);
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerEditableField.hours,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('CLAIM_REVOKED');
  });

  it('8. pending claim cannot edit', () => {
    const claim = verifiedClaim({ status: PartnerClaimStatus.PENDING });
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      field: PartnerEditableField.hours,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('CLAIM_PENDING');
  });

  it('9. spoofed user_id fails closed', () => {
    const claim = verifiedClaim();
    const d = authorizePartnerFieldMutation({
      claim,
      actor_user_id: randomUUID(),
      site_id: claim.site_id,
      field: PartnerEditableField.hours,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('SPOOFED_TENANT');
  });

  it('10. role escalation to PLATFORM_ADMIN blocked on claim submit', () => {
    const d = authorizeClaimSubmission({
      actor_user_id: randomUUID(),
      site_claimable: true,
      requested_role: PartnerTenancyRole.PLATFORM_ADMIN,
      claim_basis: PartnerClaimBasis.OPERATOR_DIRECT,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('ROLE_ESCALATION');
  });

  it('11. stale session (null actor) fails closed', () => {
    const d = authorizeClaimSubmission({
      actor_user_id: null,
      site_claimable: true,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.PHONE_VERIFICATION,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('UNAUTHENTICATED');
  });

  it('12. direct API-style prohibited field bypass fails closed', () => {
    const claim = verifiedClaim();
    for (const field of [
      'user_observations',
      'specimen_records',
      'source_authority_class',
      'conflict_resolution',
    ]) {
      const d = authorizePartnerFieldMutation({
        claim,
        actor_user_id: claim.user_id,
        site_id: claim.site_id,
        field,
      });
      expect(d.allowed).toBe(false);
    }
  });
});

describe('partner-tenancy provenance', () => {
  it('builds OPERATOR_DIRECT provenance with old/new values for every update', () => {
    const claim = verifiedClaim();
    const event = buildPartnerProvenanceEvent({
      event_id: randomUUID(),
      actor_user_id: claim.user_id,
      site_id: claim.site_id,
      claim_id: claim.claim_id,
      timestamp: '2026-09-30T19:00:00.000Z',
      field: 'hours',
      old_value: 'UNKNOWN',
      new_value: '9am–5pm',
      reason: 'Seasonal hours update',
    });
    expect(event.source_type).toBe('OPERATOR_DIRECT');
    expect(event.old_value).toBe('UNKNOWN');
    expect(event.new_value).toBe('9am–5pm');
    expect(event.moderation_class).toBe('DIRECT_APPLY');
  });

  it('applyPartnerDirectUpdate appends provenance and refuses prohibited fields', () => {
    const claim = verifiedClaim();
    const ok = applyPartnerDirectUpdate({
      envelope: { siteType: SiteType.FEE_MINE, materialClaims: [], sources: [] },
      field: PartnerEditableField.hours,
      value: '10:00–16:00',
      claim,
      actor_user_id: claim.user_id,
      event_id: randomUUID(),
      timestamp: '2026-09-30T19:00:00.000Z',
    });
    expect(ok.decision.allowed).toBe(true);
    expect(ok.provenance?.source_type).toBe('OPERATOR_DIRECT');
    expect(ok.next?.feeProfile?.hours).toBe('10:00–16:00');

    const bad = applyPartnerDirectUpdate({
      envelope: { siteType: SiteType.FEE_MINE, materialClaims: [], sources: [] },
      field: PartnerEditableField.hours,
      value: 'x',
      claim: { ...claim, status: PartnerClaimStatus.PENDING },
      actor_user_id: claim.user_id,
      event_id: randomUUID(),
      timestamp: '2026-09-30T19:00:00.000Z',
    });
    expect(bad.decision.allowed).toBe(false);
    expect(bad.next).toBeUndefined();
  });
});

describe('partner-tenancy Cowee + Crater fixtures', () => {
  it('Cowee is claim-ready without fabricated verified user ownership', () => {
    expect(COWEE_PARTNER_TENANCY_FIXTURE.claimable).toBe(true);
    expect(COWEE_PARTNER_TENANCY_FIXTURE.verified_user_id).toBeNull();
    expect(COWEE_PARTNER_TENANCY_FIXTURE.provenance_notes.join(' ')).toMatch(
      /No logo, photo, or endorsement permission/i
    );
    expect(COWEE_PARTNER_TENANCY_FIXTURE.provenance_notes.join(' ')).toMatch(
      /Permission scope \(exact\)/i
    );
    expect(COWEE_PARTNER_TENANCY_FIXTURE.provenance_notes.join(' ')).toMatch(
      /Follow-up requested/i
    );
  });

  it('Crater remains platform-managed / not self-claimable', () => {
    expect(CRATER_PARTNER_TENANCY_CONTROL.claimable).toBe(false);
    const d = authorizeClaimSubmission({
      actor_user_id: randomUUID(),
      site_claimable: CRATER_PARTNER_TENANCY_CONTROL.claimable,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.OFFICIAL_WEBSITE,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('SITE_NOT_CLAIMABLE');
  });
});

describe('partner-tenancy paid boundary + UX', () => {
  it('paid tier never buys VERIFIED/legal/geology/trust controls', () => {
    const result = assertPaidNeverBuysTrust(OperatorListingTier.ENHANCED_PAID);
    expect(result.paidDoesNotAlterTrust).toBe(true);
    expect(NEVER_PAID_TRUST_CONTROLS).toContain('VERIFIED_status');
    expect(NEVER_PAID_TRUST_CONTROLS).toContain('trust_score');
    expect(NEVER_PAID_TRUST_CONTROLS).toContain('moderation_bypass');
  });

  it('Operator Confirmed only when VERIFIED and does not imply endorsement', () => {
    expect(publicOperatorConfirmedVisible(PartnerClaimStatus.VERIFIED)).toBe(true);
    expect(publicOperatorConfirmedVisible(PartnerClaimStatus.PENDING)).toBe(false);
    expect(OPERATOR_CONFIRMED_LABEL).toMatch(/Operator-confirmed business information/);
    expect(
      operatorConfirmedDoesNotImply({
        platformEndorsement: false,
        geologyVerification: false,
        legalVerification: false,
      })
    ).toBe(true);
  });
});

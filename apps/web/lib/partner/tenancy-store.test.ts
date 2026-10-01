/**
 * Partner tenancy API/store authorization — fail-closed abuse suite.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import {
  PartnerClaimBasis,
  PartnerEditableField,
  PartnerTenancyRole,
  COWEE_PARTNER_TENANCY_FIXTURE,
  CRATER_PARTNER_TENANCY_CONTROL,
} from '@rockhounding/shared/partner-tenancy';

import {
  handleDeleteProvenanceAttempt,
  handlePartnerFieldUpdate,
  handlePublicOperatorConfirmed,
  handleSubmitClaim,
  handleVerifyClaim,
} from '@/lib/partner/handlers';
import {
  getClaimsForUser,
  resetPartnerTenancyStoreForTests,
  revokePartnerClaim,
  seedPartnerTenancyFixtures,
  setSiteClaimable,
} from '@/lib/partner/tenancy-store';

const COWEE_ID = 'a0000000-0000-4000-8000-00000000c0ee';
const CRATER_ID = 'a0000000-0000-4000-8000-00000000c7a7';
const OTHER_SITE = 'b0000000-0000-4000-8000-00000000b111';

describe('partner tenancy store + handlers', () => {
  beforeEach(() => {
    resetPartnerTenancyStoreForTests();
    seedPartnerTenancyFixtures({ coweeSiteId: COWEE_ID, craterSiteId: CRATER_ID });
    setSiteClaimable(OTHER_SITE, true);
  });

  afterEach(() => {
    resetPartnerTenancyStoreForTests();
  });

  it('Cowee claim-ready fixture; Crater not claimable', () => {
    expect(COWEE_PARTNER_TENANCY_FIXTURE.verified_user_id).toBeNull();
    const crater = handleSubmitClaim(randomUUID(), {
      site_id: CRATER_ID,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.OFFICIAL_WEBSITE,
      evidence: 'State park website listing',
    });
    expect(crater.ok).toBe(false);
    if (!crater.ok) expect(crater.code).toBe('SITE_NOT_CLAIMABLE');
    expect(CRATER_PARTNER_TENANCY_CONTROL.claimable).toBe(false);
  });

  it('claim flow: pending → admin verify → edit hours/pricing', () => {
    const operatorId = randomUUID();
    const adminId = randomUUID();
    const submitted = handleSubmitClaim(operatorId, {
      site_id: COWEE_ID,
      organization_name: 'Cowee Gift Shop & Mason Mountain Mine',
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.OPERATOR_DIRECT,
      evidence: 'Direct phone permission for inclusion; claim pending verification',
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const pendingEdit = handlePartnerFieldUpdate({
      userId: operatorId,
      siteId: COWEE_ID,
      field: PartnerEditableField.hours,
      value: '9–5',
    });
    expect(pendingEdit.ok).toBe(false);

    const verified = handleVerifyClaim(submitted.claim.claim_id, adminId);
    expect(verified.ok).toBe(true);

    const hours = handlePartnerFieldUpdate({
      userId: operatorId,
      siteId: COWEE_ID,
      field: PartnerEditableField.hours,
      value: '9am–5pm',
    });
    expect(hours.ok).toBe(true);
    if (hours.ok) {
      expect(hours.provenance.source_type).toBe('OPERATOR_DIRECT');
    }

    const pricing = handlePartnerFieldUpdate({
      userId: operatorId,
      siteId: COWEE_ID,
      field: PartnerEditableField.pricing,
      value: '$25/bucket',
    });
    expect(pricing.ok).toBe(true);

    const publicBadge = handlePublicOperatorConfirmed(COWEE_ID);
    expect(publicBadge.operator_confirmed).toBe(true);
    expect(publicBadge.label).toMatch(/Operator-confirmed business information/);
  });

  it('blocks cross-site edit, geology, trust, provenance delete, spoofed site', () => {
    const operatorId = randomUUID();
    const adminId = randomUUID();
    const submitted = handleSubmitClaim(operatorId, {
      site_id: COWEE_ID,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.PHONE_VERIFICATION,
      evidence: 'Phone verification log 2026-09-01',
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(handleVerifyClaim(submitted.claim.claim_id, adminId).ok).toBe(true);

    expect(
      handlePartnerFieldUpdate({
        userId: operatorId,
        siteId: OTHER_SITE,
        field: PartnerEditableField.pricing,
        value: 'x',
      }).ok
    ).toBe(false);

    expect(
      handlePartnerFieldUpdate({
        userId: operatorId,
        siteId: COWEE_ID,
        field: 'material_certainty',
        value: 'CONFIRMED',
      }).ok
    ).toBe(false);

    expect(
      handlePartnerFieldUpdate({
        userId: operatorId,
        siteId: COWEE_ID,
        field: 'trust_state',
        value: 'HIGH',
      }).ok
    ).toBe(false);

    const del = handleDeleteProvenanceAttempt(operatorId);
    expect(del.ok).toBe(false);
    expect(del.code).toBe('PROHIBITED_FIELD');
  });

  it('role escalation on claim submit fails closed', () => {
    const result = handleSubmitClaim(randomUUID(), {
      site_id: COWEE_ID,
      requested_role: PartnerTenancyRole.PLATFORM_ADMIN,
      claim_basis: PartnerClaimBasis.DOCUMENTATION,
      evidence: 'Attempting admin escalation',
    });
    expect(result.ok).toBe(false);
  });

  it('/partner dashboard claim list reflects PENDING → VERIFIED → REVOKED', () => {
    const operatorId = randomUUID();
    const adminId = randomUUID();
    const submitted = handleSubmitClaim(operatorId, {
      site_id: COWEE_ID,
      organization_name: COWEE_PARTNER_TENANCY_FIXTURE.display_name,
      requested_role: PartnerTenancyRole.SITE_OPERATOR,
      claim_basis: PartnerClaimBasis.OPERATOR_DIRECT,
      evidence: 'Dashboard status reflection — not a fabricated operator account',
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    expect(getClaimsForUser(operatorId)[0]?.status).toBe('PENDING');

    expect(handleVerifyClaim(submitted.claim.claim_id, adminId).ok).toBe(true);
    expect(getClaimsForUser(operatorId)[0]?.status).toBe('VERIFIED');

    const revoked = revokePartnerClaim(submitted.claim.claim_id, 'dashboard reflection revoke');
    expect(revoked.ok).toBe(true);
    expect(getClaimsForUser(operatorId)[0]?.status).toBe('REVOKED');
    expect(
      handlePartnerFieldUpdate({
        userId: operatorId,
        siteId: COWEE_ID,
        field: PartnerEditableField.hours,
        value: 'after-revoke',
      }).ok
    ).toBe(false);
  });
});

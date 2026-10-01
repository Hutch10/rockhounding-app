/**
 * Partner claim + field mutation handlers (authz fail-closed).
 * Persistence: in-process store until proposed migration is applied non-prod.
 */

import {
  PartnerEditableField,
  type PartnerEditableField as PartnerEditableFieldType,
  type SubmitPartnerClaimInput,
} from '@rockhounding/shared/partner-tenancy';

import {
  attemptDeleteProvenance,
  getClaimsForUser,
  getPublicClaimStatusForSite,
  mutatePartnerSiteField,
  revokePartnerClaim,
  submitPartnerClaim,
  verifyPartnerClaim,
} from '@/lib/partner/tenancy-store';

export function handleSubmitClaim(userId: string, body: SubmitPartnerClaimInput) {
  return submitPartnerClaim(userId, body);
}

export function handleListMyClaims(userId: string) {
  return getClaimsForUser(userId);
}

export function handleVerifyClaim(claimId: string, adminUserId: string) {
  return verifyPartnerClaim(claimId, adminUserId);
}

export function handleRevokeClaim(claimId: string, reason: string) {
  return revokePartnerClaim(claimId, reason);
}

export function handlePartnerFieldUpdate(input: {
  userId: string;
  siteId: string;
  field: string;
  value: unknown;
  reason?: string;
}) {
  if (
    !(input.field in PartnerEditableField) &&
    !Object.values(PartnerEditableField).includes(input.field as PartnerEditableFieldType)
  ) {
    // Still route through authorize so prohibited codes surface correctly
  }
  return mutatePartnerSiteField({
    userId: input.userId,
    siteId: input.siteId,
    field: input.field as PartnerEditableFieldType,
    value: input.value,
    reason: input.reason,
  });
}

export function handleDeleteProvenanceAttempt(userId: string) {
  return attemptDeleteProvenance(userId);
}

export function handlePublicOperatorConfirmed(siteId: string) {
  const status = getPublicClaimStatusForSite(siteId);
  return {
    operator_confirmed: status === 'VERIFIED',
    claim_status: status,
    label: status === 'VERIFIED' ? 'Operator-confirmed business information' : null,
  };
}

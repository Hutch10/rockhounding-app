/**
 * Operator Confirmed UX — truthful visibility only when VERIFIED.
 */
import { describe, expect, it } from 'vitest';
import {
  OPERATOR_CONFIRMED_LABEL,
  PartnerClaimStatus,
  operatorConfirmedDoesNotImply,
  publicOperatorConfirmedVisible,
} from '@rockhounding/shared/partner-tenancy';

describe('Operator Confirmed public UX', () => {
  it('shows only for VERIFIED and does not imply endorsement/geology/legal', () => {
    expect(publicOperatorConfirmedVisible(PartnerClaimStatus.VERIFIED)).toBe(true);
    expect(publicOperatorConfirmedVisible(PartnerClaimStatus.PENDING)).toBe(false);
    expect(publicOperatorConfirmedVisible(PartnerClaimStatus.REVOKED)).toBe(false);
    expect(OPERATOR_CONFIRMED_LABEL).toBe('Operator-confirmed business information');
    expect(
      operatorConfirmedDoesNotImply({
        platformEndorsement: false,
        geologyVerification: false,
        legalVerification: false,
      })
    ).toBe(true);
  });
});

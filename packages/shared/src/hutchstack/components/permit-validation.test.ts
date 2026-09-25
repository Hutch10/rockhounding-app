import { describe, expect, it } from 'vitest';

import { evaluatePermitValidation } from './permit-validation';

const base = {
  latitude: 40,
  longitude: -105,
  boundary_match: 'parcel' as const,
  source_type: 'official' as const,
  authority_url: 'https://example.test/authority',
};

describe('evaluatePermitValidation domain distinctions', () => {
  it('does not treat a missing verification time as stale', () => {
    const result = evaluatePermitValidation({
      ...base,
      access_status: 'allowed',
    });
    expect(result.reason_codes).toContain('never_verified');
    expect(result.staleness_metadata.is_stale).toBe(false);
    expect(result.staleness_metadata.days_since_verified).toBeUndefined();
    expect(result.reason_codes).toContain('recorded_access_status_is_not_collecting_permission');
    expect(result.reason_codes).toContain('advisory_safe_is_not_collecting_permission');
  });

  it('keeps unknown unresolved and distinct from prohibited', () => {
    const unknown = evaluatePermitValidation({
      ...base,
      access_status: 'unknown',
      last_verified_at: '2026-09-01T00:00:00.000Z',
    });
    const prohibited = evaluatePermitValidation({
      ...base,
      access_status: 'prohibited',
      last_verified_at: '2026-09-01T00:00:00.000Z',
    });
    expect(unknown.permit_status).toBe('unknown');
    expect(unknown.reason_codes).toContain('unknown_is_not_prohibited');
    expect(prohibited.permit_status).toBe('prohibited');
    expect(prohibited.reason_codes).not.toContain('unknown_is_not_prohibited');
    expect(unknown.fail_closed).toBe(true);
    expect(prohibited.fail_closed).toBe(true);
  });
});

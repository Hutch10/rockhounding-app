import { describe, expect, it } from 'vitest';

import { FIELD_ACTIVITIES, buildFieldPermissionSummary } from './permission-summary';

describe('buildFieldPermissionSummary', () => {
  it('keeps every activity unresolved for each recorded access status', () => {
    for (const status of ['allowed', 'caution', 'restricted', 'prohibited', 'unknown', '']) {
      const summary = buildFieldPermissionSummary(status);
      for (const activity of FIELD_ACTIVITIES) {
        expect(summary.activities[activity]).toBe('unresolved');
      }
      expect(summary.departure).toBe('not_ready');
      expect(summary.locationTrust).toBe('unresolved');
      expect(summary.accessTrust).toBe('unresolved');
      expect(summary.geologyTrust).toBe('unresolved');
      expect(summary.closureRevalidation).toBe('not_current');
      expect(summary.goNoGo).toBe('not_ready');
    }
  });

  it('does not turn a missing status into allowed', () => {
    expect(buildFieldPermissionSummary(undefined).recordedAccessStatus).toBe('unknown');
    expect(buildFieldPermissionSummary('   ').recordedAccessStatus).toBe('unknown');
  });

  it('preserves a recorded prohibited status without authorizing or denying activities', () => {
    const summary = buildFieldPermissionSummary('prohibited');
    expect(summary.recordedAccessStatus).toBe('prohibited');
    expect(summary.activities.collect).toBe('unresolved');
    expect(summary.activities.visit).toBe('unresolved');
  });
});

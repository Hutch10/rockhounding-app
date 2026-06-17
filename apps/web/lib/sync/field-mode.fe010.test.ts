import { describe, expect, it } from 'vitest';

import { canSubmitQuickLog, describeOfflineProhibitedBehavior } from './quick-log-gating';

describe('FE-010 / KR-001 field mode gating contract', () => {
  it('blocks prohibited sites when online', () => {
    expect(canSubmitQuickLog('prohibited', false)).toBe(false);
  });

  it('allows enqueue when offline even if access would be prohibited online', () => {
    expect(canSubmitQuickLog('prohibited', true)).toBe(true);
    expect(canSubmitQuickLog('unknown', true)).toBe(true);
  });

  it('documents KR-001 offline prohibited behavior for playbook', () => {
    const doc = describeOfflineProhibitedBehavior();
    expect(doc).toContain('offline');
    expect(doc).toContain('prohibited');
    expect(doc).toContain('access/check');
  });
});

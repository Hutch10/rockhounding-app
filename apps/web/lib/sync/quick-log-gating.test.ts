import { describe, expect, it } from 'vitest';

import { canSubmitQuickLog, describeOfflineProhibitedBehavior } from '@/lib/sync/quick-log-gating';

describe('quick-log-gating', () => {
  it('blocks online prohibited submit', () => {
    expect(canSubmitQuickLog('prohibited', false)).toBe(false);
  });

  it('allows offline submit for deferred enforcement', () => {
    expect(canSubmitQuickLog('prohibited', true)).toBe(true);
  });

  it('documents offline prohibited behavior', () => {
    expect(describeOfflineProhibitedBehavior()).toMatch(/access\/check/);
  });
});

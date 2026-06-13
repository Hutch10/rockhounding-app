export type QuickLogAccessState =
  | 'unknown'
  | 'allowed'
  | 'caution'
  | 'restricted'
  | 'prohibited'
  | 'checking';

/**
 * Whether Quick Log submit is permitted for the current access + connectivity state.
 *
 * Offline: access API is unavailable — submit is allowed (deferred enforcement on sync).
 * Online + prohibited: submit is blocked (MVP-M5).
 */
export function canSubmitQuickLog(accessState: QuickLogAccessState, isOffline: boolean): boolean {
  if (isOffline) return true;
  if (accessState === 'prohibited') return false;
  if (accessState === 'checking') return false;
  return true;
}

export function describeOfflineProhibitedBehavior(): string {
  return (
    'While offline, Quick Log skips /api/v1/access/check, sets accessState to unknown, ' +
    'and allows enqueue. Prohibited-site blocking applies only when online with a ' +
    'successful access check returning legalState=prohibited. Deferred review occurs at sync time.'
  );
}

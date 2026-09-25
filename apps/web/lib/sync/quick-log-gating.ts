export type QuickLogAccessState =
  | 'unknown'
  | 'allowed'
  | 'caution'
  | 'restricted'
  | 'prohibited'
  | 'checking';

/**
 * Whether a Quick Log observation may be enqueued.
 * Enqueue is not collecting permission and is not a legal verdict.
 *
 * Offline: the access check is unavailable. The record stays unresolved and may still be queued.
 * Unavailable is not allowed, and it is not prohibited.
 * Online + recorded prohibited: enqueue is held. The hold is not a collecting verdict.
 */
export function canSubmitQuickLog(accessState: QuickLogAccessState, isOffline: boolean): boolean {
  if (isOffline) return true;
  if (accessState === 'prohibited') return false;
  if (accessState === 'checking') return false;
  return true;
}

export function describeOfflineProhibitedBehavior(): string {
  return (
    'While offline, Quick Log skips /api/v1/access/check and records accessState as unknown. ' +
    'The observation may be queued. Queueing is not collecting permission. ' +
    'A recorded prohibited status holds enqueue only when online and the access check returns that status. ' +
    'Deferred review at sync time does not rewrite the original observation.'
  );
}

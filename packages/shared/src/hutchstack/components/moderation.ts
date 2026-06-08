import type { ModerationGateInput, ModerationGateResult } from '../types';

export function evaluateModerationGate(input: ModerationGateInput): ModerationGateResult {
  const blockers: string[] = [];

  if (!input.moderation_enabled) {
    blockers.push('moderation_kill_switch_active');
  }

  if (input.moderation_status !== 'PENDING') {
    blockers.push(`status_not_pending:${input.moderation_status}`);
  }

  if (input.has_access_conflict === true) {
    blockers.push('unresolved_access_conflict');
  }

  if (input.has_unresolved_duplicate === true) {
    blockers.push('unresolved_duplicate');
  }

  if (input.intended_action === 'REJECT') {
    const len = input.reject_reason_length ?? 0;
    if (len < 10) {
      blockers.push('reject_reason_too_short');
    }
  }

  let recommended_action: ModerationGateResult['recommended_action'];
  if (blockers.length === 0) {
    recommended_action = input.intended_action ?? 'APPROVE';
  } else if (
    blockers.includes('unresolved_access_conflict') ||
    blockers.includes('unresolved_duplicate')
  ) {
    recommended_action = 'HOLD';
  }

  return {
    ready: blockers.length === 0,
    blockers,
    recommended_action,
  };
}

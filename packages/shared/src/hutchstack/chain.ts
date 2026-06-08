import type { ProvenanceChainContext } from './types';

/**
 * Build a parent chain link for submission.created → harness.evaluated.
 * Client-safe — no hashing.
 */
export function buildHarnessChainFromSubmission(params: {
  submission_event_id: string;
  staging_id: string;
}): ProvenanceChainContext {
  return {
    root_event_type: 'submission.created',
    root_event_id: params.submission_event_id,
    parent_event_id: params.submission_event_id,
    chain_sequence: 2,
  };
}

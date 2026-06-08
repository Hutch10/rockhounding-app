import { canonicalize } from '../canonical';
import { buildHarnessChainFromSubmission } from '../chain';
import { sha256HexSync } from '../hash/node';
import { HUTCHSTACK_HARNESS_VERSION, HUTCHSTACK_POLICY_VERSION } from '../policy';
import type {
  HarnessComponentResults,
  HarnessEvaluationRequest,
  ProvenanceChainContext,
  ProvenanceHashes,
  ProvenanceRecord,
} from '../types';

import { computePolicyHash } from './policy-hash';

export const HASH_ALGORITHM = 'sha256-v1';

/** SHA-256 hex digest of canonical JSON (canonical-v1). Server-only. */
export function sha256Hex(canonicalJson: string): string {
  return sha256HexSync(canonicalJson);
}

/** Hash any replay-stable value using canonical serialization. */
export function hashCanonical(value: unknown): string {
  return sha256HexSync(canonicalize(value));
}

/** Replay-stable harness output preimage — excludes evaluated_at and provenance. */
export function hashHarnessOutput(components: {
  overall_risk_tier: string;
  overall_confidence: number;
  components: HarnessComponentResults;
  recommendations: string[];
  legal_disclaimer?: string;
}): string {
  return hashCanonical(components);
}

export function computeProvenanceHashes(params: {
  request: HarnessEvaluationRequest;
  outputPreimage: {
    overall_risk_tier: string;
    overall_confidence: number;
    components: HarnessComponentResults;
    recommendations: string[];
    legal_disclaimer?: string;
  };
  entity_id: string;
  policy_hash?: string;
}): ProvenanceHashes {
  const policy_hash = params.policy_hash ?? computePolicyHash();
  const input_hash = hashCanonical({
    evaluation_type: params.request.evaluation_type,
    entity_id: params.entity_id,
    entity_type: params.request.entity_type,
    site: params.request.site,
    permit: params.request.permit,
    submission: params.request.submission,
    material: params.request.material,
    moderation: params.request.moderation,
    trust: params.request.trust,
    chain: params.request.chain,
  });
  const output_hash = hashHarnessOutput(params.outputPreimage);
  const evaluation_hash = hashCanonical({
    input_hash,
    output_hash,
    policy_hash,
    entity_id: params.entity_id,
    harness_version: HUTCHSTACK_HARNESS_VERSION,
    policy_version: HUTCHSTACK_POLICY_VERSION,
  });

  return {
    hash_alg: HASH_ALGORITHM,
    harness_version: HUTCHSTACK_HARNESS_VERSION,
    policy_version: HUTCHSTACK_POLICY_VERSION,
    policy_hash,
    input_hash,
    output_hash,
    evaluation_hash,
  };
}

export function buildProvenanceRecord(params: {
  request: HarnessEvaluationRequest;
  outputPreimage: {
    overall_risk_tier: string;
    overall_confidence: number;
    components: HarnessComponentResults;
    recommendations: string[];
    legal_disclaimer?: string;
  };
  entity_id: string;
  occurred_at: string;
  actor_id?: string;
  chain?: ProvenanceChainContext;
}): ProvenanceRecord {
  const entityId = params.entity_id;
  const hashes = computeProvenanceHashes({
    request: params.request,
    outputPreimage: params.outputPreimage,
    entity_id: entityId,
  });

  const chain = params.chain ?? params.request.chain;
  const parent_event_id =
    chain?.parent_event_id ??
    (chain?.root_event_id != null && chain.root_event_id !== '' ? chain.root_event_id : undefined);

  return {
    id: hashes.evaluation_hash,
    entity_type: params.request.entity_type ?? params.request.evaluation_type,
    entity_id: entityId,
    event_type: 'harness.evaluated',
    actor_id: params.actor_id ?? 'harness',
    actor_role: 'harness',
    hashes,
    parent_event_id,
    chain_sequence: chain?.chain_sequence,
    root_event_type: chain?.root_event_type,
    root_event_id: chain?.root_event_id,
    metadata: {
      evaluation_type: params.request.evaluation_type,
      overall_risk_tier: params.outputPreimage.overall_risk_tier,
      overall_confidence: params.outputPreimage.overall_confidence,
    },
    occurred_at: params.occurred_at,
  };
}

export { buildHarnessChainFromSubmission };

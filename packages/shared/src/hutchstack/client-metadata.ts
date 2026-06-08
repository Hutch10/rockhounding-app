import type { ProvenanceHashes, ProvenanceRecord } from './types';

/** Client-safe provenance display metadata (no hashing). */
export interface ProvenanceMetadata {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  policy_version: string;
  harness_version: string;
  evaluation_hash: string;
  parent_event_id?: string;
  occurred_at: string;
}

/** Badge-friendly provenance summary for UI. */
export interface ProvenanceBadge {
  evaluation_hash: string;
  policy_version: string;
  harness_version: string;
  risk_tier?: string;
  confidence?: number;
}

export function toProvenanceMetadata(record: ProvenanceRecord): ProvenanceMetadata {
  return {
    id: record.id,
    event_type: record.event_type,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    policy_version: record.hashes.policy_version,
    harness_version: record.hashes.harness_version,
    evaluation_hash: record.hashes.evaluation_hash,
    parent_event_id: record.parent_event_id,
    occurred_at: record.occurred_at,
  };
}

export function toProvenanceBadge(
  hashes: ProvenanceHashes,
  summary?: { risk_tier?: string; confidence?: number }
): ProvenanceBadge {
  return {
    evaluation_hash: hashes.evaluation_hash,
    policy_version: hashes.policy_version,
    harness_version: hashes.harness_version,
    risk_tier: summary?.risk_tier,
    confidence: summary?.confidence,
  };
}

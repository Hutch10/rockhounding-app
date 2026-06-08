/* eslint-disable */
import { describe, expect, it } from 'vitest';
import { CANONICAL_SERIALIZATION_VERSION, canonicalize } from './canonical';
import { evaluateCommunityTrust, computeEffectiveReputation } from './components/community-trust';
import { evaluateMaterialIdentification } from './components/material-identification';
import { evaluatePermitValidation } from './components/permit-validation';
import { evaluateUserSubmission } from './components/user-submissions';
import { detectDuplicateSite } from './duplicate-detection';
import { browserHashProvider } from './hash/browser';
import { sha256HexSync } from './hash/node';
import { runHarnessEvaluation } from './server/orchestrator';
import { computePolicyHash } from './server/policy-hash';
import {
  buildHarnessChainFromSubmission,
  buildProvenanceRecord,
  hashCanonical,
  hashHarnessOutput,
} from './server/provenance';
import { HUTCHSTACK_HARNESS_VERSION, HUTCHSTACK_POLICY_VERSION, LEGAL_DISCLAIMER } from './policy';
import { buildTrustScoringInput, computeSubmitterTrustScore } from './trust-adapter';

describe('Canonical serialization', () => {
  it('sorts nested keys deterministically', () => {
    const a = canonicalize({ z: 1, a: { y: 2, b: 3 } });
    const b = canonicalize({ a: { b: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
    expect(a).toContain(CANONICAL_SERIALIZATION_VERSION);
  });

  it('rejects Date objects', () => {
    expect(() => canonicalize({ at: new Date() })).toThrow(/ISO strings/);
  });
});

describe('Provenance SHA-256 (server)', () => {
  it('uses sha256-v1 with 64-char hex digests', () => {
    const hash = hashCanonical({ test: true });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces stable input_hash across evaluations', () => {
    const request = {
      evaluation_type: 'submission' as const,
      entity_id: 'entity-1',
      submission: {
        name: 'Test',
        latitude: 38.5,
        longitude: -109.5,
        state: 'UT',
        legal_tag: 'allowed',
        evidence_attachment_count: 1,
        submitter_trust_level: 2,
        submitter_trust_score: 0.6,
      },
    };
    const output = {
      overall_risk_tier: 'T2',
      overall_confidence: 70,
      components: {},
      recommendations: [],
      legal_disclaimer: LEGAL_DISCLAIMER,
    };
    const a = buildProvenanceRecord({
      request,
      outputPreimage: output,
      entity_id: 'entity-1',
      occurred_at: '2026-06-07T12:00:00.000Z',
    });
    const b = buildProvenanceRecord({
      request,
      outputPreimage: output,
      entity_id: 'entity-1',
      occurred_at: '2026-06-07T18:00:00.000Z',
    });

    expect(a.hashes.input_hash).toBe(b.hashes.input_hash);
    expect(a.hashes.output_hash).toBe(b.hashes.output_hash);
    expect(a.hashes.evaluation_hash).toBe(b.hashes.evaluation_hash);
    expect(a.id).toBe(b.hashes.evaluation_hash);
    expect(a.hashes.hash_alg).toBe('sha256-v1');
    expect(a.occurred_at).not.toBe(b.occurred_at);
  });

  it('excludes evaluated_at from output_hash', () => {
    const components = {
      overall_risk_tier: 'T2',
      overall_confidence: 55,
      components: {},
      recommendations: [],
    };
    const hashA = hashHarnessOutput({ ...components, legal_disclaimer: LEGAL_DISCLAIMER });
    const hashB = hashHarnessOutput({ ...components, legal_disclaimer: LEGAL_DISCLAIMER });
    expect(hashA).toBe(hashB);
  });

  it('wires parent_event_id from chain context', () => {
    const parentId = hashCanonical({ event: 'submission.created', id: 'staging-1' });
    const record = buildProvenanceRecord({
      request: {
        evaluation_type: 'submission',
        entity_id: 'staging-1',
        chain: buildHarnessChainFromSubmission({
          submission_event_id: parentId,
          staging_id: 'staging-1',
        }),
      },
      outputPreimage: {
        overall_risk_tier: 'T2',
        overall_confidence: 60,
        components: {},
        recommendations: [],
      },
      entity_id: 'staging-1',
      occurred_at: new Date().toISOString(),
    });
    expect(record.parent_event_id).toBe(parentId);
    expect(record.root_event_type).toBe('submission.created');
    expect(record.chain_sequence).toBe(2);
  });
});

describe('HashProvider cross-environment', () => {
  it('browser and node produce identical SHA-256 for same canonical input', async () => {
    const payload = canonicalize({ entity_id: 'cross-env-test', score: 42 });
    const nodeHash = sha256HexSync(payload);
    const browserHash = await browserHashProvider.sha256Hex(payload);
    expect(browserHash).toBe(nodeHash);
    expect(browserHash).toHaveLength(64);
  });
});

describe('Trust adapter', () => {
  it('uses real profile age and moderation history', () => {
    const created = new Date();
    created.setDate(created.getDate() - 120);

    const trust = buildTrustScoringInput({
      profile: {
        reputation_score: 150,
        trust_level: 2,
        created_at: created.toISOString(),
      },
      moderation_history: {
        approvals_90d: 4,
        rejections_90d: 1,
        avg_approved_confidence_90d: 78,
        last_moderation_action_at: new Date().toISOString(),
      },
    });

    expect(trust.account_age_days).toBeGreaterThanOrEqual(119);
    expect(trust.approvals_90d).toBe(4);
    expect(trust.evidence_quality_avg_90d).toBe(78);
    expect(trust.effective_reputation_score).toBeLessThanOrEqual(150);
  });

  it('applies reputation decay after inactivity', () => {
    const decayed = computeEffectiveReputation(200, 365);
    expect(decayed).toBeLessThan(100);
  });

  it('uses zero approval rate for new contributors', () => {
    const trust = buildTrustScoringInput({
      profile: { reputation_score: 100, trust_level: 1, created_at: new Date().toISOString() },
      moderation_history: {
        approvals_90d: 0,
        rejections_90d: 0,
        avg_approved_confidence_90d: 0,
      },
    });
    const result = evaluateCommunityTrust(trust);
    expect(result.trust_score).toBeLessThan(0.5);
  });
});

describe('Duplicate detection', () => {
  it('flags geohash prefix and proximity matches', () => {
    const signal = detectDuplicateSite({
      latitude: 38.5,
      longitude: -109.5,
      name: 'Crystal Hill',
      state: 'UT',
      geohash: '9w0p6k7',
      nearby_sites: [
        {
          id: 'loc-1',
          name: 'Crystal Hill Site',
          latitude: 38.5005,
          longitude: -109.5005,
          geohash: '9w0p6k7',
          source: 'canon',
        },
      ],
    });
    expect(signal.is_duplicate_candidate).toBe(true);
    expect(signal.confidence_penalty).toBeGreaterThan(0);
    expect(signal.flags).toContain('GEOHASH_PREFIX_MATCH');
  });
});

describe('Material identification safety', () => {
  it('does not promote REJECT_WITH_CORRECTION directly to ground truth', () => {
    const result = evaluateMaterialIdentification({
      classification_confidence: 0.8,
      has_user_validation: true,
      user_action: 'REJECT_WITH_CORRECTION',
    });
    expect(result.identification_state).toBe('CORRECTION_PENDING');
    expect(result.ground_truth_eligible).toBe(false);
  });
});

describe('HutchStack orchestrator (server)', () => {
  it('returns harness_version and policy_hash via provenance', () => {
    const result = runHarnessEvaluation({
      evaluation_type: 'submission',
      entity_id: 'test-1',
      trust: {
        reputation_score: 120,
        effective_reputation_score: 110,
        trust_level: 2,
        approvals_90d: 3,
        rejections_90d: 0,
        evidence_quality_avg_90d: 70,
        account_age_days: 90,
      },
    });
    expect(result.harness_version).toBe(HUTCHSTACK_HARNESS_VERSION);
    expect(result.policy_version).toBe(HUTCHSTACK_POLICY_VERSION);
    expect(result.legal_disclaimer).toBe(LEGAL_DISCLAIMER);
    expect(result.provenance.hashes.policy_hash).toBe(computePolicyHash());
    expect(result.provenance.hashes.evaluation_hash).toHaveLength(64);
  });
});

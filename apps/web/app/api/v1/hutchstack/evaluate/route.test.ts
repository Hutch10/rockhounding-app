import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { HUTCHSTACK_POLICY_VERSION, LEGAL_DISCLAIMER } from '@rockhounding/shared';
import { GET, POST } from './route';

describe('POST /api/v1/hutchstack/evaluate', () => {
  it('returns harness evaluation for valid submission request', async () => {
    const req = new NextRequest('http://localhost/api/v1/hutchstack/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluation_type: 'submission',
        entity_id: 'staging-123',
        submission: {
          name: 'Test Site',
          latitude: 38.5,
          longitude: -109.5,
          state: 'UT',
          legal_tag: 'allowed',
          description: 'A well-known public collecting area with easy access from the highway.',
          evidence_attachment_count: 1,
          submitter_trust_level: 2,
          submitter_trust_score: 0.65,
        },
        trust: {
          reputation_score: 120,
          effective_reputation_score: 115,
          trust_level: 2,
          approvals_90d: 3,
          rejections_90d: 0,
          evidence_quality_avg_90d: 70,
          account_age_days: 60,
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.policy_version).toBe(HUTCHSTACK_POLICY_VERSION);
    expect(data.harness_version).toBeDefined();
    expect(data.legal_disclaimer).toBe(LEGAL_DISCLAIMER);
    expect(data.components.user_submission).toBeDefined();
    expect(data.provenance.hashes.evaluation_hash).toHaveLength(64);
    expect(data.provenance.event_type).toBe('harness.evaluated');
  });

  it('rejects invalid request body', async () => {
    const req = new NextRequest('http://localhost/api/v1/hutchstack/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluation_type: 'invalid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/hutchstack/evaluate', () => {
  it('returns harness metadata', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.policy_version).toBe(HUTCHSTACK_POLICY_VERSION);
    expect(data.harness_version).toBeDefined();
    expect(data.components).toHaveLength(6);
  });
});

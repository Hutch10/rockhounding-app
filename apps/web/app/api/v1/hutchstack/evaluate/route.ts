import {
  HarnessEvaluationRequestSchema,
  HarnessEvaluationResponseSchema,
  HUTCHSTACK_HARNESS_VERSION,
  HUTCHSTACK_POLICY_VERSION,
} from '@rockhounding/shared/hutchstack';
import { NextRequest, NextResponse } from 'next/server';

import { evaluateDiscovery } from '@/lib/hutchstack/harness';

/**
 * POST /api/v1/hutchstack/evaluate
 *
 * HutchStack Field Discovery Harness — deterministic quality evaluation.
 * Governance: docs/hutchstack/HUTCHSTACK_GOVERNANCE_CHARTER.md
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = HarnessEvaluationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid harness request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = evaluateDiscovery(parsed.data);
    const validated = HarnessEvaluationResponseSchema.safeParse(result);

    if (!validated.success) {
      console.error('Harness output contract violation:', validated.error);
      return NextResponse.json(result);
    }

    return NextResponse.json(validated.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    const status = message.includes('Unsupported policy version') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export function GET(): NextResponse {
  return NextResponse.json({
    harness: 'HutchStack Field Discovery Harness',
    policy_version: HUTCHSTACK_POLICY_VERSION,
    harness_version: HUTCHSTACK_HARNESS_VERSION,
    components: [
      'site_verification',
      'permit_validation',
      'user_submissions',
      'material_identification',
      'moderation',
      'community_trust',
    ],
    docs: '/docs/hutchstack/README.md',
  });
}

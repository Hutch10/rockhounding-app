import 'server-only';

import type {
  HarnessEvaluationRequest,
  HarnessEvaluationResponse,
} from '@rockhounding/shared/hutchstack';
import { runHarnessEvaluation } from '@rockhounding/shared/hutchstack/server';

/**
 * Server-side HutchStack harness wrapper.
 * Tier-0: hardened provenance hashes (SHA-256). Event persistence is schema-proposed, not deployed.
 * No production gating — evaluate-only.
 */
export function evaluateDiscovery(request: HarnessEvaluationRequest): HarnessEvaluationResponse {
  return runHarnessEvaluation(request);
}

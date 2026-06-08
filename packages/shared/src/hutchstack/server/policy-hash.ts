import { canonicalize } from '../canonical';
import { sha256HexSync } from '../hash/node';
import { buildPolicyManifest } from '../policy-manifest';

/** Replay-stable digest of the active policy bundle (server-only). */
export function computePolicyHash(): string {
  return sha256HexSync(canonicalize(buildPolicyManifest()));
}

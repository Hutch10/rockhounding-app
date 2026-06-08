/**
 * HutchStack server entry — imports node:crypto via hash/node.
 * Do not import this module from client components or the main @rockhounding/shared barrel.
 */
export { runHarnessEvaluation } from './orchestrator';
export {
  HASH_ALGORITHM,
  sha256Hex,
  hashCanonical,
  hashHarnessOutput,
  computeProvenanceHashes,
  buildProvenanceRecord,
  buildHarnessChainFromSubmission,
} from './provenance';
export { computePolicyHash } from './policy-hash';

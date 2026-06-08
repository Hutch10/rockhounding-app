/**
 * HutchStack client-safe entry — no node:crypto, no server orchestrator.
 * Server hashing: import from '@rockhounding/shared/hutchstack/server'.
 */
export {
  HUTCHSTACK_POLICY_VERSION,
  HUTCHSTACK_HARNESS_VERSION,
  LEGAL_DISCLAIMER,
  CONFIDENCE_THRESHOLDS,
  REPUTATION_DELTAS,
  TRUST_DECAY,
  DUPLICATE_DETECTION,
} from './policy';

export { CANONICAL_SERIALIZATION_VERSION, canonicalize } from './canonical';
export { buildPolicyManifest } from './policy-manifest';
export { buildHarnessChainFromSubmission } from './chain';
export { toProvenanceMetadata, toProvenanceBadge } from './client-metadata';

export type {
  RiskTier,
  EvaluationType,
  VerificationStatus,
  SubmissionRoute,
  IdentificationState,
  MaterialIdentificationTier,
  PermitStatus,
  HarnessAdvisoryLevel,
  ProvenanceHashes,
  ProvenanceChainContext,
  RootEventType,
  SiteVerificationInput,
  PermitValidationInput,
  PermitAuthorityMetadata,
  PermitStalenessMetadata,
  UserSubmissionInput,
  MaterialIdentificationInput,
  ModerationGateInput,
  TrustScoringInput,
  ContributorModerationHistory,
  NearbySiteRef,
  DuplicateDetectionInput,
  SiteVerificationResult,
  PermitValidationResult,
  DuplicateSiteSignal,
  UserSubmissionResult,
  MaterialIdentificationResult,
  ModerationGateResult,
  TrustScoringResult,
  ProvenanceRecord,
  HarnessComponentResults,
  HarnessEvaluationRequest,
  HarnessEvaluationResponse,
} from './types';

export type { ProvenanceMetadata, ProvenanceBadge } from './client-metadata';
export type { PolicyManifest } from './policy-manifest';
export type { HashProvider, SyncHashProvider } from './hash/types';

export {
  HarnessEvaluationRequestSchema,
  HarnessEvaluationResponseSchema,
  ProvenanceHashesSchema,
  SiteVerificationInputSchema,
  PermitValidationInputSchema,
  UserSubmissionInputSchema,
  MaterialIdentificationInputSchema,
  ModerationGateInputSchema,
  TrustScoringInputSchema,
} from './schemas';

export { evaluateSiteVerification } from './components/site-verification';
export { evaluatePermitValidation } from './components/permit-validation';
export { evaluateUserSubmission, scoreSubmissionCompleteness } from './components/user-submissions';
export { evaluateMaterialIdentification } from './components/material-identification';
export { evaluateModerationGate } from './components/moderation';
export {
  evaluateCommunityTrust,
  wilsonLowerBound,
  computeEffectiveReputation,
  applyTrustDecay,
} from './components/community-trust';
export { detectDuplicateSite } from './duplicate-detection';
export { buildTrustScoringInput, computeSubmitterTrustScore } from './trust-adapter';
export type { TrustAdapterProfile } from './trust-adapter';

export { browserHashProvider } from './hash/browser';

/**
 * Source operation authorization
 *
 * Binds a reviewed governance receipt and a resource license profile to one
 * requested operation. It does not re-decide source admission, admit evidence,
 * or produce a field decision.
 */

import { z } from 'zod';

import {
  SourceAdapterDefinitionSchema,
  SourceAdapterPrecondition,
  type SourceAdapterDefinition,
} from './source-adapter-contract';

export const SourceLicenseOperation = {
  READ: 'READ',
  MANUAL_VIEW: 'MANUAL_VIEW',
  AUTOMATED_QUERY: 'AUTOMATED_QUERY',
  BULK_DOWNLOAD: 'BULK_DOWNLOAD',
  LOCAL_CACHE: 'LOCAL_CACHE',
  OFFLINE_PACKAGE: 'OFFLINE_PACKAGE',
  TRANSFORM: 'TRANSFORM',
  DERIVE: 'DERIVE',
  REDISTRIBUTE: 'REDISTRIBUTE',
  PUBLIC_DISPLAY: 'PUBLIC_DISPLAY',
  PUBLIC_API: 'PUBLIC_API',
  MODEL_INPUT: 'MODEL_INPUT',
  AI_PROCESSING: 'AI_PROCESSING',
  TRAINING_USE: 'TRAINING_USE',
  RESEARCH_EXPORT: 'RESEARCH_EXPORT',
  COMMERCIAL_USE: 'COMMERCIAL_USE',
} as const;

export type SourceLicenseOperation =
  (typeof SourceLicenseOperation)[keyof typeof SourceLicenseOperation];

export const SourceOperationAuthorizationStatus = {
  ALLOWED: 'ALLOWED',
  ALLOWED_WITH_CONSTRAINTS: 'ALLOWED_WITH_CONSTRAINTS',
  PROHIBITED: 'PROHIBITED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SourceOperationAuthorizationStatus =
  (typeof SourceOperationAuthorizationStatus)[keyof typeof SourceOperationAuthorizationStatus];

export const SourceUseReviewState = {
  REVIEWED: 'REVIEWED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  UNKNOWN: 'UNKNOWN',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type SourceUseReviewState = (typeof SourceUseReviewState)[keyof typeof SourceUseReviewState];

export const FIRST_LIVE_OPERATIONS = ['READ', 'AUTOMATED_QUERY'] as const;

const OperationSchema = z.enum([
  'READ',
  'MANUAL_VIEW',
  'AUTOMATED_QUERY',
  'BULK_DOWNLOAD',
  'LOCAL_CACHE',
  'OFFLINE_PACKAGE',
  'TRANSFORM',
  'DERIVE',
  'REDISTRIBUTE',
  'PUBLIC_DISPLAY',
  'PUBLIC_API',
  'MODEL_INPUT',
  'AI_PROCESSING',
  'TRAINING_USE',
  'RESEARCH_EXPORT',
  'COMMERCIAL_USE',
]);

const AdapterOperationSchema = z.enum([
  'READ',
  'TRANSFORM',
  'AUTOMATED_QUERY',
  'BULK_DOWNLOAD',
  'MODEL_INPUT',
  'TRAINING_USE',
]);

const ADAPTER_OPERATIONS: ReadonlySet<string> = new Set([
  'READ',
  'TRANSFORM',
  'AUTOMATED_QUERY',
  'BULK_DOWNLOAD',
  'MODEL_INPUT',
  'TRAINING_USE',
]);

const REDISTRIBUTION_OPERATIONS: ReadonlySet<string> = new Set(['REDISTRIBUTE', 'PUBLIC_API']);
const CACHE_OPERATIONS: ReadonlySet<string> = new Set(['LOCAL_CACHE', 'OFFLINE_PACKAGE']);
const DERIVATIVE_OPERATIONS: ReadonlySet<string> = new Set(['TRANSFORM', 'DERIVE']);

export const SourceOperationAuthorizationRequestSchema = z.object({
  resourceId: z.string().min(1).max(128),
  reviewState: z.enum(['REVIEWED', 'NEEDS_REVIEW', 'UNKNOWN', 'SUPERSEDED']),
  governanceStatus: z.enum([
    'CANDIDATE',
    'ADMITTED',
    'RESTRICTED',
    'SUSPENDED',
    'DEPRECATED',
    'REJECTED',
    'UNKNOWN',
  ]),
  governanceReceipt: z
    .object({
      receiptId: z.string().min(1).max(128),
      resourceId: z.string().min(1).max(128),
      decision: z.enum(['ALLOWED', 'UNKNOWN', 'PROHIBITED']),
      allowedOperations: z.array(AdapterOperationSchema).max(8),
    })
    .nullable(),
  licenseProfile: z.object({
    attributionRequired: z.enum(['REQUIRED', 'NOT_REQUIRED', 'UNKNOWN']),
    redistribution: z.enum(['ALLOWED', 'PROHIBITED', 'UNKNOWN']),
    offlineCaching: z.enum(['ALLOWED', 'PROHIBITED', 'UNKNOWN']),
    derivativeUse: z.enum(['ALLOWED', 'PROHIBITED', 'UNKNOWN']),
  }),
  explicitGrants: z.array(OperationSchema).max(16),
  requestedOperation: OperationSchema,
});

export type SourceOperationAuthorizationRequest = z.infer<
  typeof SourceOperationAuthorizationRequestSchema
>;

export type SourceOperationConstraint = {
  code: 'ATTRIBUTION_REQUIRED' | 'GOVERNANCE_RESTRICTED';
  detail: string;
};

export type SourceOperationAuthorization = {
  status: SourceOperationAuthorizationStatus;
  resourceId: string;
  requestedOperation: SourceLicenseOperation;
  reviewState: SourceUseReviewState;
  reasons: Array<{ code: string }>;
  constraints: SourceOperationConstraint[];
};

export function operationAuthorizationAdmitsEvidence(): false {
  return false;
}

export function operationAuthorizationIsDecision(): false {
  return false;
}

function result(
  request: SourceOperationAuthorizationRequest,
  status: SourceOperationAuthorizationStatus,
  reason: string,
  constraints: SourceOperationConstraint[] = []
): SourceOperationAuthorization {
  return {
    status,
    resourceId: request.resourceId,
    requestedOperation: request.requestedOperation,
    reviewState: request.reviewState,
    reasons: [{ code: reason }],
    constraints: [...constraints].sort((left, right) => left.code.localeCompare(right.code)),
  };
}

function licenseGate(
  request: SourceOperationAuthorizationRequest
): SourceOperationAuthorization | undefined {
  const operation = request.requestedOperation;
  const license = request.licenseProfile;
  if (REDISTRIBUTION_OPERATIONS.has(operation)) {
    if (license.redistribution === 'UNKNOWN') {
      return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'REDISTRIBUTION_UNKNOWN');
    }
    if (license.redistribution === 'PROHIBITED') {
      return result(
        request,
        SourceOperationAuthorizationStatus.PROHIBITED,
        'REDISTRIBUTION_PROHIBITED'
      );
    }
  }
  if (CACHE_OPERATIONS.has(operation)) {
    if (license.offlineCaching === 'UNKNOWN') {
      return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'CACHING_UNKNOWN');
    }
    if (license.offlineCaching === 'PROHIBITED') {
      return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'CACHING_PROHIBITED');
    }
  }
  if (DERIVATIVE_OPERATIONS.has(operation)) {
    if (license.derivativeUse === 'UNKNOWN') {
      return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'DERIVATIVE_UNKNOWN');
    }
    if (license.derivativeUse === 'PROHIBITED') {
      return result(
        request,
        SourceOperationAuthorizationStatus.PROHIBITED,
        'DERIVATIVE_PROHIBITED'
      );
    }
  }
  return undefined;
}

export function evaluateSourceOperationAuthorization(
  input: SourceOperationAuthorizationRequest
): SourceOperationAuthorization {
  const request = SourceOperationAuthorizationRequestSchema.parse(input);
  const receipt = request.governanceReceipt;
  if (receipt !== null && receipt.resourceId !== request.resourceId) {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'RESOURCE_MISMATCH');
  }
  if (request.reviewState === SourceUseReviewState.UNKNOWN) {
    return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'REVIEW_UNKNOWN');
  }
  if (request.reviewState === SourceUseReviewState.NEEDS_REVIEW) {
    return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'NEEDS_REVIEW');
  }
  if (
    request.reviewState === SourceUseReviewState.SUPERSEDED ||
    request.governanceStatus === 'DEPRECATED'
  ) {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'SUPERSEDED');
  }
  if (request.governanceStatus === 'CANDIDATE' || request.governanceStatus === 'UNKNOWN') {
    return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'GOVERNANCE_UNREVIEWED');
  }
  if (request.governanceStatus === 'SUSPENDED' || request.governanceStatus === 'REJECTED') {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'GOVERNANCE_PROHIBITED');
  }
  if (receipt === null || receipt.decision === 'UNKNOWN') {
    return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'RECEIPT_UNRESOLVED');
  }
  if (receipt.decision === 'PROHIBITED') {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'RECEIPT_PROHIBITED');
  }
  if (
    ADAPTER_OPERATIONS.has(request.requestedOperation) &&
    !receipt.allowedOperations.includes(
      request.requestedOperation as z.infer<typeof AdapterOperationSchema>
    )
  ) {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'OPERATION_MISMATCH');
  }
  if (!request.explicitGrants.includes(request.requestedOperation)) {
    return result(request, SourceOperationAuthorizationStatus.PROHIBITED, 'OPERATION_NOT_GRANTED');
  }
  const gated = licenseGate(request);
  if (gated !== undefined) {
    return gated;
  }
  if (request.licenseProfile.attributionRequired === 'UNKNOWN') {
    return result(request, SourceOperationAuthorizationStatus.UNKNOWN, 'ATTRIBUTION_UNKNOWN');
  }
  const constraints: SourceOperationConstraint[] = [];
  if (request.licenseProfile.attributionRequired === 'REQUIRED') {
    constraints.push({
      code: 'ATTRIBUTION_REQUIRED',
      detail: 'Attribution is required for this operation',
    });
  }
  if (request.governanceStatus === 'RESTRICTED') {
    constraints.push({
      code: 'GOVERNANCE_RESTRICTED',
      detail: 'Governance status is restricted',
    });
  }
  return result(
    request,
    constraints.length > 0
      ? SourceOperationAuthorizationStatus.ALLOWED_WITH_CONSTRAINTS
      : SourceOperationAuthorizationStatus.ALLOWED,
    'OPERATION_AUTHORIZED',
    constraints
  );
}

const GuardSchema = z.object({
  authorizationRequest: SourceOperationAuthorizationRequestSchema,
  definition: SourceAdapterDefinitionSchema,
  adapterOperation: AdapterOperationSchema,
  resourceId: z.string().min(1).max(128),
});

function preconditionsComplete(definition: SourceAdapterDefinition): boolean {
  const present = new Set(definition.requiredPreconditions);
  return Object.values(SourceAdapterPrecondition).every((precondition) =>
    present.has(precondition)
  );
}

export function guardFirstLiveAdapterExecution<T>(input: unknown, execute: () => T): T {
  const parsed = GuardSchema.parse(input);
  if (parsed.definition.tolerantUnsupportedVersion) {
    throw new Error('first-live adapter cannot set tolerant unsupported source versions');
  }
  if (!preconditionsComplete(parsed.definition)) {
    throw new Error('first-live adapter is missing a required precondition');
  }
  if (
    !FIRST_LIVE_OPERATIONS.includes(
      parsed.adapterOperation as (typeof FIRST_LIVE_OPERATIONS)[number]
    )
  ) {
    throw new Error('first-live operation must be READ or AUTOMATED_QUERY');
  }
  if (parsed.definition.requiredUseOperation !== parsed.adapterOperation) {
    throw new Error('adapter required operation does not match the request');
  }
  const authorization = evaluateSourceOperationAuthorization(parsed.authorizationRequest);
  if (authorization.resourceId !== parsed.resourceId) {
    throw new Error('resource id does not match the authorization');
  }
  if (authorization.requestedOperation !== parsed.adapterOperation) {
    throw new Error('operation mismatch between authorization and adapter request');
  }
  if (
    authorization.status !== SourceOperationAuthorizationStatus.ALLOWED &&
    authorization.status !== SourceOperationAuthorizationStatus.ALLOWED_WITH_CONSTRAINTS
  ) {
    throw new Error('operation authorization does not allow execution');
  }
  return execute();
}

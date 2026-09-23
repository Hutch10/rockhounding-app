/**
 * Disclosure Governance R1
 *
 * Persistence-free pre-materialization boundary. A projection says what
 * spatial precision may leave the trusted graph for one purpose.
 * It does not change source geometry, observations, resources, or decisions.
 */

import { z } from 'zod';

import { ProvenanceActivityType } from './provenance-activity-kernel';

export const DISCLOSURE_GOVERNANCE_SCHEMA_VERSION = 1;

const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export const DisclosureClassification = {
  PUBLIC: 'PUBLIC',
  PERSONAL_PRIVATE: 'PERSONAL_PRIVATE',
  SCIENTIFIC_SENSITIVE: 'SCIENTIFIC_SENSITIVE',
  CULTURAL_SENSITIVE: 'CULTURAL_SENSITIVE',
  COMMERCIAL_RESTRICTED: 'COMMERCIAL_RESTRICTED',
  AUTHORITY_RESTRICTED: 'AUTHORITY_RESTRICTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DisclosureClassification =
  (typeof DisclosureClassification)[keyof typeof DisclosureClassification];

export const DisclosurePurpose = {
  INTERNAL_ANALYSIS: 'INTERNAL_ANALYSIS',
  FIELD_USE_PRIVATE: 'FIELD_USE_PRIVATE',
  PUBLIC_MAP: 'PUBLIC_MAP',
  PUBLIC_API: 'PUBLIC_API',
  EXPORT: 'EXPORT',
  SHARE_LINK: 'SHARE_LINK',
  SHADOW_DISPLAY: 'SHADOW_DISPLAY',
  MODEL_CONTEXT: 'MODEL_CONTEXT',
  RESEARCH_EXPORT: 'RESEARCH_EXPORT',
  OTHER: 'OTHER',
} as const;

export type DisclosurePurpose = (typeof DisclosurePurpose)[keyof typeof DisclosurePurpose];

export const GeometryDisclosureMode = {
  EXACT: 'EXACT',
  COARSE: 'COARSE',
  WITHHELD: 'WITHHELD',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type GeometryDisclosureMode =
  (typeof GeometryDisclosureMode)[keyof typeof GeometryDisclosureMode];

export const DisclosureDecisionStatus = {
  ALLOWED: 'ALLOWED',
  ALLOWED_WITH_TRANSFORMATION: 'ALLOWED_WITH_TRANSFORMATION',
  WITHHELD: 'WITHHELD',
  UNKNOWN_FAIL_CLOSED: 'UNKNOWN_FAIL_CLOSED',
} as const;

export type DisclosureDecisionStatus =
  (typeof DisclosureDecisionStatus)[keyof typeof DisclosureDecisionStatus];

export const SpatialPrecisionClass = {
  EXACT_POINT: 'EXACT_POINT',
  PRECISE_GEOMETRY: 'PRECISE_GEOMETRY',
  SITE_SCALE: 'SITE_SCALE',
  LOCALITY_SCALE: 'LOCALITY_SCALE',
  REGIONAL_SCALE: 'REGIONAL_SCALE',
  WITHHELD: 'WITHHELD',
} as const;

export type SpatialPrecisionClass =
  (typeof SpatialPrecisionClass)[keyof typeof SpatialPrecisionClass];

export const DisclosureReasonCode = {
  UNKNOWN_SENSITIVITY: 'UNKNOWN_SENSITIVITY',
  POLICY_EXACT: 'POLICY_EXACT',
  POLICY_COARSE: 'POLICY_COARSE',
  CLASSIFICATION_WITHHELD: 'CLASSIFICATION_WITHHELD',
  NO_MATCHING_RULE: 'NO_MATCHING_RULE',
  NO_COARSE_REFERENCE: 'NO_COARSE_REFERENCE',
  CONFLICTING_RULES: 'CONFLICTING_RULES',
  MODEL_LEAST_PRECISION: 'MODEL_LEAST_PRECISION',
} as const;

export type DisclosureReasonCode = (typeof DisclosureReasonCode)[keyof typeof DisclosureReasonCode];

const ClassificationSchema = z.enum([
  'PUBLIC',
  'PERSONAL_PRIVATE',
  'SCIENTIFIC_SENSITIVE',
  'CULTURAL_SENSITIVE',
  'COMMERCIAL_RESTRICTED',
  'AUTHORITY_RESTRICTED',
  'UNKNOWN',
]);

const PurposeSchema = z.enum([
  'INTERNAL_ANALYSIS',
  'FIELD_USE_PRIVATE',
  'PUBLIC_MAP',
  'PUBLIC_API',
  'EXPORT',
  'SHARE_LINK',
  'SHADOW_DISPLAY',
  'MODEL_CONTEXT',
  'RESEARCH_EXPORT',
  'OTHER',
]);

const ModeSchema = z.enum(['EXACT', 'COARSE', 'WITHHELD', 'NOT_APPLICABLE']);

const PrecisionSchema = z.enum([
  'EXACT_POINT',
  'PRECISE_GEOMETRY',
  'SITE_SCALE',
  'LOCALITY_SCALE',
  'REGIONAL_SCALE',
  'WITHHELD',
]);

const EXTERNAL_PURPOSES: ReadonlySet<string> = new Set([
  DisclosurePurpose.PUBLIC_MAP,
  DisclosurePurpose.PUBLIC_API,
  DisclosurePurpose.EXPORT,
  DisclosurePurpose.SHARE_LINK,
  DisclosurePurpose.SHADOW_DISPLAY,
  DisclosurePurpose.RESEARCH_EXPORT,
]);

const PRIVATE_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  DisclosureClassification.PERSONAL_PRIVATE,
  DisclosureClassification.SCIENTIFIC_SENSITIVE,
  DisclosureClassification.CULTURAL_SENSITIVE,
  DisclosureClassification.COMMERCIAL_RESTRICTED,
  DisclosureClassification.AUTHORITY_RESTRICTED,
]);

const PrecisionRank: Record<SpatialPrecisionClass, number> = {
  WITHHELD: 0,
  REGIONAL_SCALE: 1,
  LOCALITY_SCALE: 2,
  SITE_SCALE: 3,
  PRECISE_GEOMETRY: 4,
  EXACT_POINT: 5,
};

export const DisclosureGeometrySchema = z.object({
  geometryRef: z.string().min(1).max(256),
  precision: PrecisionSchema,
  coordinates: z
    .object({
      latitude: z.number().gte(-90).lte(90),
      longitude: z.number().gte(-180).lte(180),
    })
    .optional(),
  coarseRef: z.string().min(1).max(256).optional(),
});

export type DisclosureGeometry = z.infer<typeof DisclosureGeometrySchema>;

export const DisclosurePolicyRuleSchema = z.object({
  classification: ClassificationSchema,
  purpose: PurposeSchema,
  mode: ModeSchema,
  maxPrecision: PrecisionSchema,
  explicitPermit: z.boolean().optional(),
});

export type DisclosurePolicyRule = z.infer<typeof DisclosurePolicyRuleSchema>;

export const DisclosurePolicySchema = z.object({
  id: z.string().min(1).max(128),
  version: VersionSchema,
  rules: z.array(DisclosurePolicyRuleSchema).max(64),
});

export type DisclosurePolicy = z.infer<typeof DisclosurePolicySchema>;

export const DisclosureReasonSchema = z.object({
  code: z.enum([
    'UNKNOWN_SENSITIVITY',
    'POLICY_EXACT',
    'POLICY_COARSE',
    'CLASSIFICATION_WITHHELD',
    'NO_MATCHING_RULE',
    'NO_COARSE_REFERENCE',
    'CONFLICTING_RULES',
    'MODEL_LEAST_PRECISION',
  ]),
});

export type DisclosureReason = z.infer<typeof DisclosureReasonSchema>;

export const DisclosureRequestSchema = z.object({
  projectionId: z.string().min(1).max(128),
  sourceEntityRef: z.string().min(1).max(128),
  classification: ClassificationSchema,
  purpose: PurposeSchema,
  geometry: DisclosureGeometrySchema,
  policy: DisclosurePolicySchema,
});

export type DisclosureRequest = z.infer<typeof DisclosureRequestSchema>;

export type DisclosureDecision = {
  status: DisclosureDecisionStatus;
  reasons: DisclosureReason[];
};

export type DisclosureProvenance = {
  activityType: typeof ProvenanceActivityType.DISCLOSURE_TRANSFORMATION;
  sourceEntityRef: string;
  purpose: DisclosurePurpose;
  policyId: string;
  policyVersion: { major: number; minor: number; patch: number };
  method: 'identity-release-v1' | 'coarse-reference-v1' | 'withhold-v1';
  methodVersion: '1.0.0';
  projectionRef: string;
};

export type DisclosureProjection = {
  releaseStamp: 'disclosure-projection-v1';
  projectionId: string;
  inputs: DisclosureRequest;
  decision: DisclosureDecision;
  mode: GeometryDisclosureMode;
  method: DisclosureProvenance['method'];
  sourceGeometry: DisclosureGeometry;
  released?: DisclosureGeometry;
  provenance: DisclosureProvenance;
  inferenceDisclosureHook: 'NOT_IMPLEMENTED';
  inferenceLimitation: string;
};

export const DISCLOSURE_INFERENCE_LIMITATION =
  'Withholding raw coordinates does not analyze whether a derived map, label, or model context can still reveal the sensitive place. That inference check is a future hook and is not implemented.';

export function disclosureMutatesSource(): false {
  return false;
}

export function disclosureAuthorizesCollection(): false {
  return false;
}

function cloneGeometry(geometry: DisclosureGeometry): DisclosureGeometry {
  return {
    geometryRef: geometry.geometryRef,
    precision: geometry.precision,
    ...(geometry.coarseRef === undefined ? {} : { coarseRef: geometry.coarseRef }),
    ...(geometry.coordinates === undefined
      ? {}
      : {
          coordinates: {
            latitude: geometry.coordinates.latitude,
            longitude: geometry.coordinates.longitude,
          },
        }),
  };
}

function ruleKey(rule: DisclosurePolicyRule): string {
  return `${rule.classification}\u0000${rule.purpose}`;
}

function rulesConflict(rules: readonly DisclosurePolicyRule[]): boolean {
  const seen = new Map<string, string>();
  for (const rule of rules) {
    const key = ruleKey(rule);
    const signature = `${rule.mode}\u0000${rule.maxPrecision}\u0000${rule.explicitPermit === true}`;
    const previous = seen.get(key);
    if (previous !== undefined && previous !== signature) {
      return true;
    }
    seen.set(key, signature);
  }
  return false;
}

function matchingRule(
  rules: readonly DisclosurePolicyRule[],
  classification: DisclosureClassification,
  purpose: DisclosurePurpose
): DisclosurePolicyRule | undefined {
  return rules.find((rule) => rule.classification === classification && rule.purpose === purpose);
}

function coarseEnough(precision: SpatialPrecisionClass): boolean {
  return PrecisionRank[precision] <= PrecisionRank[SpatialPrecisionClass.SITE_SCALE];
}

type ReleasePlan = {
  status: DisclosureDecisionStatus;
  mode: GeometryDisclosureMode;
  method: DisclosureProvenance['method'];
  reasons: DisclosureReason[];
  released?: DisclosureGeometry;
};

function withheld(status: DisclosureDecisionStatus, code: DisclosureReasonCode): ReleasePlan {
  return {
    status,
    mode: GeometryDisclosureMode.WITHHELD,
    method: 'withhold-v1',
    reasons: [{ code }],
    released: {
      geometryRef: 'withheld',
      precision: SpatialPrecisionClass.WITHHELD,
    },
  };
}

function planRelease(request: DisclosureRequest): ReleasePlan {
  const { classification, purpose, geometry, policy } = request;
  const external = EXTERNAL_PURPOSES.has(purpose);
  if (rulesConflict(policy.rules)) {
    return withheld(
      DisclosureDecisionStatus.UNKNOWN_FAIL_CLOSED,
      DisclosureReasonCode.CONFLICTING_RULES
    );
  }
  if (classification === DisclosureClassification.UNKNOWN && external) {
    return withheld(
      DisclosureDecisionStatus.UNKNOWN_FAIL_CLOSED,
      DisclosureReasonCode.UNKNOWN_SENSITIVITY
    );
  }
  const rule = matchingRule(policy.rules, classification, purpose);
  if (
    classification === DisclosureClassification.UNKNOWN &&
    purpose === DisclosurePurpose.MODEL_CONTEXT &&
    (rule === undefined || rule.mode === GeometryDisclosureMode.EXACT)
  ) {
    return coarseOrWithhold(geometry, SpatialPrecisionClass.REGIONAL_SCALE, [
      { code: DisclosureReasonCode.UNKNOWN_SENSITIVITY },
      { code: DisclosureReasonCode.MODEL_LEAST_PRECISION },
    ]);
  }
  if (rule === undefined) {
    if (purpose === DisclosurePurpose.MODEL_CONTEXT) {
      return coarseOrWithhold(geometry, SpatialPrecisionClass.LOCALITY_SCALE, [
        { code: DisclosureReasonCode.MODEL_LEAST_PRECISION },
      ]);
    }
    return withheld(
      classification === DisclosureClassification.UNKNOWN
        ? DisclosureDecisionStatus.UNKNOWN_FAIL_CLOSED
        : DisclosureDecisionStatus.WITHHELD,
      DisclosureReasonCode.NO_MATCHING_RULE
    );
  }
  if (
    PRIVATE_CLASSIFICATIONS.has(classification) &&
    external &&
    rule.explicitPermit !== true &&
    rule.mode === GeometryDisclosureMode.EXACT
  ) {
    return withheld(
      DisclosureDecisionStatus.WITHHELD,
      DisclosureReasonCode.CLASSIFICATION_WITHHELD
    );
  }
  if (
    classification === DisclosureClassification.PERSONAL_PRIVATE &&
    external &&
    rule.explicitPermit !== true
  ) {
    return withheld(
      DisclosureDecisionStatus.WITHHELD,
      DisclosureReasonCode.CLASSIFICATION_WITHHELD
    );
  }
  if (rule.mode === GeometryDisclosureMode.WITHHELD) {
    return withheld(
      DisclosureDecisionStatus.WITHHELD,
      DisclosureReasonCode.CLASSIFICATION_WITHHELD
    );
  }
  if (rule.mode === GeometryDisclosureMode.EXACT) {
    if (
      purpose === DisclosurePurpose.MODEL_CONTEXT &&
      classification !== DisclosureClassification.PUBLIC
    ) {
      return coarseOrWithhold(geometry, SpatialPrecisionClass.LOCALITY_SCALE, [
        { code: DisclosureReasonCode.MODEL_LEAST_PRECISION },
      ]);
    }
    return {
      status: DisclosureDecisionStatus.ALLOWED,
      mode: GeometryDisclosureMode.EXACT,
      method: 'identity-release-v1',
      reasons: [{ code: DisclosureReasonCode.POLICY_EXACT }],
      released: cloneGeometry(geometry),
    };
  }
  if (rule.mode === GeometryDisclosureMode.COARSE) {
    return coarseOrWithhold(geometry, rule.maxPrecision, [
      { code: DisclosureReasonCode.POLICY_COARSE },
    ]);
  }
  return withheld(DisclosureDecisionStatus.WITHHELD, DisclosureReasonCode.CLASSIFICATION_WITHHELD);
}

function coarseOrWithhold(
  geometry: DisclosureGeometry,
  precision: SpatialPrecisionClass,
  reasons: DisclosureReason[]
): ReleasePlan {
  if (!coarseEnough(precision) || geometry.coarseRef === undefined) {
    return withheld(DisclosureDecisionStatus.WITHHELD, DisclosureReasonCode.NO_COARSE_REFERENCE);
  }
  return {
    status: DisclosureDecisionStatus.ALLOWED_WITH_TRANSFORMATION,
    mode: GeometryDisclosureMode.COARSE,
    method: 'coarse-reference-v1',
    reasons,
    released: {
      geometryRef: geometry.coarseRef,
      precision,
      coarseRef: geometry.coarseRef,
    },
  };
}

export function evaluateDisclosure(input: DisclosureRequest): DisclosureDecision {
  const request = DisclosureRequestSchema.parse(input);
  const plan = planRelease(request);
  return {
    status: plan.status,
    reasons: [...plan.reasons].sort((left, right) => left.code.localeCompare(right.code)),
  };
}

export function projectForDisclosure(input: DisclosureRequest): DisclosureProjection {
  const request = DisclosureRequestSchema.parse(input);
  const plan = planRelease(request);
  const decision = evaluateDisclosure(request);
  return {
    releaseStamp: 'disclosure-projection-v1',
    projectionId: request.projectionId,
    inputs: request,
    decision,
    mode: plan.mode,
    method: plan.method,
    sourceGeometry: cloneGeometry(request.geometry),
    ...(plan.released === undefined ? {} : { released: plan.released }),
    provenance: {
      activityType: ProvenanceActivityType.DISCLOSURE_TRANSFORMATION,
      sourceEntityRef: request.sourceEntityRef,
      purpose: request.purpose,
      policyId: request.policy.id,
      policyVersion: { ...request.policy.version },
      method: plan.method,
      methodVersion: '1.0.0',
      projectionRef: request.projectionId,
    },
    inferenceDisclosureHook: 'NOT_IMPLEMENTED',
    inferenceLimitation: DISCLOSURE_INFERENCE_LIMITATION,
  };
}

export function materializeDisclosureRelease(
  projection: unknown,
  purpose: DisclosurePurpose
): DisclosureGeometry {
  if (typeof projection !== 'object' || projection === null || !('releaseStamp' in projection)) {
    throw new Error('disclosure projection is required before materialization');
  }
  const candidate = projection as Partial<DisclosureProjection>;
  if (candidate.releaseStamp !== 'disclosure-projection-v1' || candidate.inputs === undefined) {
    throw new Error('disclosure projection is required before materialization');
  }
  if (candidate.inputs.purpose !== purpose) {
    throw new Error('disclosure purpose does not match the projection');
  }
  const fresh = projectForDisclosure(candidate.inputs);
  if (fresh.decision.status !== candidate.decision?.status || fresh.mode !== candidate.mode) {
    throw new Error('disclosure projection does not match policy');
  }
  if (
    fresh.decision.status === DisclosureDecisionStatus.WITHHELD ||
    fresh.decision.status === DisclosureDecisionStatus.UNKNOWN_FAIL_CLOSED
  ) {
    throw new Error('disclosure withheld this geometry for the requested purpose');
  }
  if (fresh.released === undefined) {
    throw new Error('disclosure projection has no releasable geometry');
  }
  return cloneGeometry(fresh.released);
}

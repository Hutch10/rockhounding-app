/**
 * USGS SGMC offline provider contract.
 *
 * Documentation-derived fixtures only. This module does not call ArcGIS,
 * ScienceBase, or a DOI resolver, and it does not capture a live feature.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { SOURCE_ADAPTER_CONTRACT_BLOCK_ID } from './building-block-registry';
import {
  DisclosureClassification,
  DisclosurePurpose,
  materializeDisclosureRelease,
  projectForDisclosure,
  type DisclosureGeometry,
  type DisclosurePolicy,
  type DisclosureProjection,
  type DisclosurePurpose as DisclosurePurposeName,
} from './disclosure-governance';
import {
  EvidenceDomain,
  EvidencePurpose,
  evaluateEvidenceAdmission,
  type EvidenceAdmissionCandidate,
  type EvidenceAdmissionEvaluation,
  type EvidenceAdmissionPolicy,
} from './evidence-admission';
import {
  PROVENANCE_SCHEMA_VERSION,
  ProvenanceActivityType,
  ProvenanceAgentRole,
  ProvenanceAgentType,
  ProvenanceEntityType,
  ProvenanceLineageClass,
  hashProvenanceActivity,
  validateProvenanceActivity,
  validateProvenanceGraph,
  type ProvenanceGraph,
} from './provenance-activity-kernel';
import { BUILTIN_RESOURCE_RECORDS, type ResourceRecord } from './resource-catalog';
import {
  SourceAdapterFailureCode,
  SourceAdapterInputKind,
  SourceAdapterOutputKind,
  SourceAdapterPrecondition,
  SourceAdapterResultStatus,
  SourceFieldMappingType,
  SourceNormalizationRuleKind,
  SourceRequestedUseOperation,
  translateSourceMaterial,
  validateSourceAdapterDefinition,
  type SourceAdapterDefinition,
  type SourceAdapterDiagnostic,
  type SourceAdapterResult,
  type SourceFieldMapping,
} from './source-adapter-contract';
import {
  BUILTIN_SOURCE_GOVERNANCE_RECORDS,
  SourceGovernanceStatus,
  type SourceGovernanceRecord,
} from './source-governance-contract';
import {
  SourceOperationAuthorizationStatus,
  evaluateSourceOperationAuthorization,
  guardFirstLiveAdapterExecution,
  type SourceOperationAuthorization,
  type SourceOperationAuthorizationRequest,
} from './source-operation-authorization';
import { EvidenceAuthorityClass } from './universal-geological-evidence-schema';

export const USGS_SGMC_RESOURCE_ID = 'res-usgs-sgmc-geology';
export const USGS_SGMC_GOVERNANCE_ID = 'gov-usgs-sgmc-geology';
export const USGS_SGMC_ADAPTER_ID = 'rockhounding:usgs-sgmc-geology-adapter';
export const USGS_SGMC_PINNED_DOI = '10.5066/F7WH2N65';
export const USGS_SGMC_GEMS_DOI = '10.5066/P1A3DQZK';
export const USGS_SGMC_LAYER_NAME = 'SGMC_Geology';
export const USGS_SGMC_LAYER_ID = 3;
export const USGS_SGMC_SCIENCEBASE_ITEM = '5888bf4fe4b05ccb964bab9d';
export const USGS_SGMC_PUBLICATION_VERSION = '1.1';
export const USGS_SGMC_MAX_RECORD_COUNT = 2000;
export const USGS_SGMC_IDENTITY_SCOPE = 'STATE_SGMC_LABEL_UNIT_LINK_R1_COMPONENTS_NOT_A_GLOBAL_KEY';
export const USGS_SGMC_FIXTURE_KIND = 'DOCUMENTATION_DERIVED_SYNTHETIC_PROVIDER_FIXTURE';
export const USGS_SGMC_REVIEWED_ON = '2026-09-23';
export const USGS_SGMC_CONTRACT_INSTANT = '2026-09-23T00:00:00.000Z';

export const USGS_SGMC_UNGRANTED_OPERATIONS = [
  'BULK_DOWNLOAD',
  'REDISTRIBUTE',
  'PUBLIC_API',
  'LOCAL_CACHE',
  'OFFLINE_PACKAGE',
  'MODEL_INPUT',
  'AI_PROCESSING',
  'TRAINING_USE',
  'COMMERCIAL_USE',
] as const;

export const USGS_SGMC_KNOWN_GENERALIZED_LITH = [
  'Dam',
  'Ice',
  'Igneous and Metamorphic, undifferentiated',
  'Igneous and Sedimentary, undifferentiated',
  'Igneous, intrusive',
  'Igneous, undifferentiated',
  'Igneous, volcanic',
  'Melange',
  'Metamorphic and Sedimentary, undifferentiated',
  'Metamorphic, amphibolite',
  'Metamorphic, carbonate',
  'Metamorphic, gneiss',
  'Metamorphic, granulite',
  'Metamorphic, igneous',
  'Metamorphic, intrusive',
  'Metamorphic, other',
  'Metamorphic, schist',
  'Metamorphic, sedimentary',
  'Metamorphic, sedimentary clastic',
  'Metamorphic, serpentinite',
  'Metamorphic, undifferentiated',
  'Metamorphic, volcanic',
  'Sedimentary, carbonate',
  'Sedimentary, chemical',
  'Sedimentary, clastic',
  'Sedimentary, evaporite',
  'Sedimentary, iron formation, undifferentiated',
  'Sedimentary, undifferentiated',
  'Tectonite, undifferentiated',
  'Unconsolidated and Sedimentary, undifferentiated',
  'Unconsolidated, undifferentiated',
  'Unknown',
  'Water',
] as const;

const ACCEPTED_SPATIAL_REFERENCES = new Set(['EPSG:3857', 'ESRI:102100']);
const CLOCK_FIELDS = [
  'phenomenonTime',
  'effectiveFrom',
  'effectiveTo',
  'sourceRecordedAt',
  'publishedAt',
  'sourceUpdatedAt',
  'retrievedAt',
] as const;

const FIRST_LIVE_PRECONDITIONS = [
  SourceAdapterPrecondition.RESOURCE_IDENTIFIED,
  SourceAdapterPrecondition.SOURCE_VERSION_ACCEPTED,
  SourceAdapterPrecondition.GOVERNANCE_CONTEXT_PRESENT,
  SourceAdapterPrecondition.GOVERNANCE_OPERATION_ALLOWED,
  SourceAdapterPrecondition.RAW_INPUT_PRESERVED,
  SourceAdapterPrecondition.TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN,
  SourceAdapterPrecondition.COVERAGE_CONTEXT_PRESERVED,
  SourceAdapterPrecondition.PROVENANCE_CONTEXT_INITIALIZED,
] as const;

const FixtureSchema = z.object({
  fixtureId: z.string().min(1).max(64),
  fixtureKind: z.literal(USGS_SGMC_FIXTURE_KIND),
  offline: z.literal(true),
  operationallyRetrieved: z.literal(false),
  productDoi: z.string().min(1),
  publicationVersion: z.string().min(1),
  layerName: z.string().min(1),
  layerId: z.number().int(),
  scienceBaseItem: z.string().min(1),
  spatialReference: z.string().min(1),
  pagination: z.object({
    returnedCount: z.number().int().nonnegative(),
    maxRecordCount: z.literal(USGS_SGMC_MAX_RECORD_COUNT),
    completion: z.enum(['COMPLETE', 'CONTINUED', 'UNKNOWN']),
  }),
  feature: z
    .object({
      OBJECTID: z.number().int().optional(),
      STATE: z.string().optional(),
      SGMC_LABEL: z.string().optional(),
      UNIT_LINK: z.string().optional(),
      UNIT_NAME: z.string().optional(),
      AGE_MIN: z.unknown().optional(),
      AGE_MAX: z.unknown().optional(),
      GENERALIZED_LITH: z.unknown().optional(),
      NGMDB1: z.string().optional(),
      NGMDB2: z.string().optional(),
      NGMDB3: z.string().optional(),
      geometry: z.unknown(),
    })
    .passthrough(),
});

export type SgmcFixture = z.infer<typeof FixtureSchema>;

export type SgmcObservedRecord = {
  recordId: string;
  productDoi: string;
  publicationVersion: string;
  layerName: string;
  layerId: number;
  scienceBaseItem: string;
  spatialReference: string;
  pagination: SgmcFixture['pagination'];
  feature: SgmcFixture['feature'];
  sourceEncoding: string;
  inputKind: 'LOCAL_FIXTURE' | 'RAW_FEATURE';
};

export type SgmcOfflineRun = {
  result: SourceAdapterResult;
  provenanceGraph: ProvenanceGraph;
  authorization: SourceOperationAuthorization;
};

export function sgmcContactsNetwork(): false {
  return false;
}

export function sgmcConfirmsGeologicalAbsence(): false {
  return false;
}

export function sgmcProductCoversAlaska(): false {
  return false;
}

export function sgmcProductCoversHawaii(): false {
  return false;
}

export function interpretSgmcPolygonCount(count: number): {
  polygonsReturned: number;
  geologicalAbsence: false;
  meaning: 'NO_SGMC_POLYGON_RETURNED' | 'SGMC_POLYGONS_RETURNED';
} {
  return {
    polygonsReturned: count,
    geologicalAbsence: false,
    meaning: count === 0 ? 'NO_SGMC_POLYGON_RETURNED' : 'SGMC_POLYGONS_RETURNED',
  };
}

export function sgmcResourceRecord(): ResourceRecord {
  const record = BUILTIN_RESOURCE_RECORDS.find((item) => item.id === USGS_SGMC_RESOURCE_ID);
  if (record === undefined) {
    throw new Error('SGMC resource is not registered');
  }
  return structuredClone(record);
}

export function sgmcGovernanceRecord(): SourceGovernanceRecord {
  const record = BUILTIN_SOURCE_GOVERNANCE_RECORDS.find(
    (item) => item.id === USGS_SGMC_GOVERNANCE_ID
  );
  if (record === undefined) {
    throw new Error('SGMC governance profile is not registered');
  }
  return structuredClone(record);
}

export function suspendSgmcGovernance(record: SourceGovernanceRecord): SourceGovernanceRecord {
  return { ...structuredClone(record), status: SourceGovernanceStatus.SUSPENDED };
}

export function sgmcAdapterDefinition(
  version: SourceAdapterDefinition['version'] = { major: 1, minor: 0, patch: 0 }
): SourceAdapterDefinition {
  return validateSourceAdapterDefinition({
    id: USGS_SGMC_ADAPTER_ID,
    version,
    schemaVersion: 1,
    name: 'USGS SGMC geology offline adapter',
    sourceResourceTypes: ['FEATURE_COLLECTION'],
    supportedResourceIds: [USGS_SGMC_RESOURCE_ID],
    inputKinds: [SourceAdapterInputKind.LOCAL_FIXTURE, SourceAdapterInputKind.RAW_FEATURE],
    outputKinds: [
      SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
      SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
    ],
    capabilities: [
      'DETERMINISTIC_TRANSLATION',
      'PARTIAL_OUTPUT',
      'QUARANTINE_ON_UNKNOWN',
      'VOCABULARY_RETENTION',
      'AUTHORITY_CEILING',
    ],
    deterministic: true,
    implementationRef: 'packages/shared/src/usgs-sgmc-provider.ts',
    limitations: [
      'Documentation-derived offline fixtures only',
      'No live SGMC query',
      'Geologic age is not a truth-clock field',
      'OBJECTID is a service handle',
      'Zero polygons are not geological absence',
      'DOI 10.5066/P1A3DQZK is a different product',
    ],
    normalizationProfile: 'usgs-sgmc-geology-r1',
    requiredBuildingBlocks: [SOURCE_ADAPTER_CONTRACT_BLOCK_ID],
    requiredPreconditions: [...FIRST_LIVE_PRECONDITIONS],
    allowExplicitUnknownTemporalContext: true,
    supportedSourceVersions: [USGS_SGMC_PINNED_DOI],
    tolerantUnsupportedVersion: false,
    requiredUseOperation: SourceRequestedUseOperation.AUTOMATED_QUERY,
  });
}

export const USGS_SGMC_PUBLIC_DISPLAY_REVIEWED_ON = '2026-09-23';

export const USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION = {
  source: 'U.S. Geological Survey',
  product: 'State Geologic Map Compilation',
  doi: USGS_SGMC_PINNED_DOI,
  creditRequired: true,
  endorsementDisclaimerRequired: true,
  usgsIdentifierPermitted: false,
} as const;

export function sgmcAuthorizationRequest(
  overrides: Partial<SourceOperationAuthorizationRequest> = {}
): SourceOperationAuthorizationRequest {
  const base: SourceOperationAuthorizationRequest = {
    resourceId: USGS_SGMC_RESOURCE_ID,
    reviewState: 'REVIEWED',
    governanceStatus: 'ADMITTED',
    governanceReceipt: {
      receiptId: 'gov-receipt-usgs-sgmc-automated-query',
      resourceId: USGS_SGMC_RESOURCE_ID,
      decision: 'ALLOWED',
      allowedOperations: ['AUTOMATED_QUERY'],
    },
    licenseProfile: {
      attributionRequired: 'REQUIRED',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    explicitGrants: ['AUTOMATED_QUERY'],
    requestedOperation: 'AUTOMATED_QUERY',
  };
  return {
    ...base,
    ...overrides,
    licenseProfile: { ...base.licenseProfile, ...overrides.licenseProfile },
    governanceReceipt:
      overrides.governanceReceipt === undefined
        ? base.governanceReceipt
        : overrides.governanceReceipt,
  };
}

export function sgmcPublicDisplayAuthorizationRequest(
  overrides: Partial<SourceOperationAuthorizationRequest> = {}
): SourceOperationAuthorizationRequest {
  return sgmcAuthorizationRequest({
    requestedOperation: 'PUBLIC_DISPLAY',
    explicitGrants: ['PUBLIC_DISPLAY'],
    governanceReceipt: {
      receiptId: 'gov-receipt-usgs-sgmc-public-display',
      resourceId: USGS_SGMC_RESOURCE_ID,
      decision: 'ALLOWED',
      allowedOperations: ['AUTOMATED_QUERY'],
    },
    ...overrides,
  });
}

export function sgmcPublicDisplayAppliesToDoi(doi: string): boolean {
  return doi === USGS_SGMC_PINNED_DOI;
}

export function sgmcPublicDisplayImpliesEndorsement(): false {
  return false;
}

export function sgmcPublicDisplayAllowsUsgsIdentifier(): false {
  return false;
}

export function sgmcGeologicalContextPolicy(): EvidenceAdmissionPolicy {
  return {
    id: 'policy-usgs-sgmc-geological-context',
    version: { major: 1, minor: 0, patch: 0 },
    schemaVersion: 1,
    purpose: EvidencePurpose.GEOLOGICAL_CONTEXT,
    domain: EvidenceDomain.GEOLOGY,
    allowedRoles: ['DECISION'],
    minimumAuthority: EvidenceAuthorityClass.SECONDARY_AUTHORITY,
    temporalRequirement: 'HISTORICAL_ACCEPTABLE',
    coverageRequirement: {
      record: 'PARTIAL_ALLOWED',
      geometry: 'PARTIAL_ALLOWED',
      temporal: 'UNKNOWN_ALLOWED',
    },
    provenanceRequirement: 'SOURCE_TRACEABLE',
    contradictionPolicy: 'REQUIRE_NO_UNRESOLVED_CONFLICT',
    allowQuarantined: false,
    quarantineOutcome: 'QUARANTINED',
    requiresPermittedUse: true,
    limitations: [
      'SGMC admission is geological context only',
      'A complete fixture record is not a complete live map query',
    ],
  };
}

export function sgmcDisclosurePolicy(): DisclosurePolicy {
  return {
    id: 'disclosure-usgs-sgmc-map-unit',
    version: { major: 1, minor: 0, patch: 0 },
    rules: [
      {
        classification: DisclosureClassification.PUBLIC,
        purpose: DisclosurePurpose.SHADOW_DISPLAY,
        mode: 'EXACT',
        maxPrecision: 'PRECISE_GEOMETRY',
      },
      {
        classification: DisclosureClassification.PUBLIC,
        purpose: DisclosurePurpose.PUBLIC_MAP,
        mode: 'EXACT',
        maxPrecision: 'PRECISE_GEOMETRY',
      },
    ],
  };
}

export function loadSgmcFixture(fileName: string): SgmcFixture {
  const directory = join(dirname(fileURLToPath(import.meta.url)), 'provider-fixtures', 'usgs-sgmc');
  const parsed: unknown = JSON.parse(readFileSync(join(directory, fileName), 'utf8'));
  return FixtureSchema.parse(parsed);
}

export function sgmcProviderRecordKey(fields: Record<string, unknown>): {
  scope: typeof USGS_SGMC_IDENTITY_SCOPE;
  key?: string;
  ambiguous: boolean;
  serviceObjectId?: number;
} {
  const state = text(fields['STATE']);
  const label = text(fields['SGMC_LABEL']);
  const link = text(fields['UNIT_LINK']);
  const objectId = fields['OBJECTID'];
  const serviceObjectId = typeof objectId === 'number' ? objectId : undefined;
  if (state === undefined || label === undefined || link === undefined) {
    return {
      scope: USGS_SGMC_IDENTITY_SCOPE,
      ambiguous: true,
      ...(serviceObjectId === undefined ? {} : { serviceObjectId }),
    };
  }
  return {
    scope: USGS_SGMC_IDENTITY_SCOPE,
    key: `${state}\u001f${label}\u001f${link}`,
    ambiguous: false,
    ...(serviceObjectId === undefined ? {} : { serviceObjectId }),
  };
}

export async function runSgmcOfflineFixture(
  fixtureInput: SgmcFixture,
  options?: {
    authorization?: SourceOperationAuthorizationRequest;
    definition?: SourceAdapterDefinition;
  }
): Promise<SgmcOfflineRun> {
  const fixture = structuredClone(fixtureInput);
  const authorization = evaluateSourceOperationAuthorization(
    options?.authorization ?? sgmcAuthorizationRequest()
  );
  const definition = options?.definition ?? sgmcAdapterDefinition();
  const result = guardFirstLiveAdapterExecution(
    {
      authorizationRequest: options?.authorization ?? sgmcAuthorizationRequest(),
      definition,
      adapterOperation: SourceRequestedUseOperation.AUTOMATED_QUERY,
      resourceId: USGS_SGMC_RESOURCE_ID,
    },
    () => translateSgmcFixture(fixture, definition)
  );
  const provenanceGraph = await provenanceFor(result, definition);
  return { result, provenanceGraph, authorization };
}

export function translateSgmcObservedRecord(
  record: SgmcObservedRecord,
  definition: SourceAdapterDefinition = sgmcAdapterDefinition(),
  options?: { retrievedAt?: string }
): SourceAdapterResult {
  const rawFields = featureFields(record.feature);
  const raw = {
    id: record.recordId,
    sourceResourceId: USGS_SGMC_RESOURCE_ID,
    sourceVersionRef: record.productDoi,
    rawFields,
    sourceEncoding: record.sourceEncoding,
    sourceSchemaRef: 'sgmc-geology-layer-3-ds1052-v1.1',
  };
  const coverage = coverageFor(record);
  const identity = sgmcProviderRecordKey(rawFields);
  const preflight = preflightIssue(record, identity, rawFields);
  if (preflight !== undefined) {
    return withRetrievalClock(
      quarantined(raw, coverage, preflight.code, preflight.diagnostics),
      options?.retrievedAt
    );
  }
  const translated = translateSourceMaterial(
    definition,
    {
      kind:
        record.inputKind === 'RAW_FEATURE'
          ? SourceAdapterInputKind.RAW_FEATURE
          : SourceAdapterInputKind.LOCAL_FIXTURE,
      raw,
      mappings: fieldMappings(),
      requestedOutputs: [SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE],
    },
    {
      resourceId: USGS_SGMC_RESOURCE_ID,
      requestedUseOperation: SourceRequestedUseOperation.AUTOMATED_QUERY,
      governance: {
        receiptId: 'gov-receipt-usgs-sgmc-automated-query',
        resourceId: USGS_SGMC_RESOURCE_ID,
        decision: 'ALLOWED',
        allowedOperations: [SourceRequestedUseOperation.AUTOMATED_QUERY],
      },
      truthClock: { presence: 'UNKNOWN' },
      coverage,
      provenance: { initialized: true, activityId: `act:${raw.id}:import` },
      sourceAuthorities: [EvidenceAuthorityClass.PRIMARY_AUTHORITY],
      claimedAuthority: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    }
  );
  assertAgesStayOffTheClock(translated);
  if (translated.normalized !== undefined && identity.key !== undefined) {
    translated.normalized.normalizedFields['providerRecordKey'] = identity.key;
    translated.normalized.normalizedFields['providerRecordKeyScope'] = identity.scope;
  }
  const result: SourceAdapterResult =
    translated.status === SourceAdapterResultStatus.FAILED ||
    translated.status === SourceAdapterResultStatus.QUARANTINED
      ? {
          ...translated,
          status: SourceAdapterResultStatus.QUARANTINED,
          safeToContinue: false,
          confirmedAbsence: false,
        }
      : { ...translated, confirmedAbsence: false };
  return withRetrievalClock(result, options?.retrievedAt);
}

export function sgmcAdmissionCandidate(result: SourceAdapterResult): EvidenceAdmissionCandidate {
  const key = sgmcProviderRecordKey(result.raw?.rawFields ?? {});
  return {
    id: result.canonicalCandidateId ?? 'candidate-usgs-sgmc',
    kind: SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
    role: 'DECISION',
    supportedPurposes: [EvidencePurpose.GEOLOGICAL_CONTEXT],
    authority: [
      { domain: EvidenceDomain.GEOLOGY, authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY },
    ],
    temporal: { fitness: 'FIT' },
    coverage: {
      record: result.coverage?.recordCoverage ?? 'UNKNOWN',
      geometry: result.coverage?.geometryCoverage ?? 'UNKNOWN',
      temporal: 'UNKNOWN',
      resultCount: result.coverage?.resultCount ?? 0,
    },
    quarantine: {
      state: result.status === SourceAdapterResultStatus.QUARANTINED ? 'QUARANTINED' : 'NONE',
      disposition: 'NONE',
    },
    provenance: { state: 'SOURCE_TRACEABLE' },
    governance: { decision: 'ALLOWED' },
    independence: { upstreamLineageIds: [key.key ?? USGS_SGMC_RESOURCE_ID] },
    contradiction: { state: 'NONE' },
    availability: 'AVAILABLE',
  };
}

export function admitSgmcForGeologicalContext(
  result: SourceAdapterResult
): EvidenceAdmissionEvaluation {
  return evaluateEvidenceAdmission({
    id: 'admit-usgs-sgmc-geological-context',
    evaluatedAt: USGS_SGMC_CONTRACT_INSTANT,
    candidate: sgmcAdmissionCandidate(result),
    policy: sgmcGeologicalContextPolicy(),
  });
}

export function projectSgmcDisclosure(
  classification: DisclosureProjection['inputs']['classification'],
  purpose: DisclosurePurposeName
): DisclosureProjection {
  return projectForDisclosure({
    projectionId: `sgmc-disclosure-${purpose.toLowerCase()}`,
    sourceEntityRef: 'sgmc-fixture-polygon',
    classification,
    purpose,
    geometry: { geometryRef: 'sgmc-fixture-polygon', precision: 'PRECISE_GEOMETRY' },
    policy: sgmcDisclosurePolicy(),
  });
}

export function sgmcMaterializedGeometry(purpose: DisclosurePurposeName): DisclosureGeometry {
  return materializeDisclosureRelease(
    projectSgmcDisclosure(DisclosureClassification.PUBLIC, purpose),
    purpose
  );
}

function translateSgmcFixture(
  fixture: SgmcFixture,
  definition: SourceAdapterDefinition
): SourceAdapterResult {
  const parsed = FixtureSchema.parse(fixture);
  return translateSgmcObservedRecord(
    {
      recordId: `fixture:${parsed.fixtureId}`,
      productDoi: parsed.productDoi,
      publicationVersion: parsed.publicationVersion,
      layerName: parsed.layerName,
      layerId: parsed.layerId,
      scienceBaseItem: parsed.scienceBaseItem,
      spatialReference: parsed.spatialReference,
      pagination: parsed.pagination,
      feature: parsed.feature,
      sourceEncoding: 'application/json',
      inputKind: 'LOCAL_FIXTURE',
    },
    definition
  );
}

function withRetrievalClock(
  result: SourceAdapterResult,
  retrievedAt: string | undefined
): SourceAdapterResult {
  if (retrievedAt === undefined) {
    return result;
  }
  return {
    ...result,
    truthClockCandidate: { ...(result.truthClockCandidate ?? {}), retrievedAt },
  };
}

function preflightIssue(
  fixture: Pick<
    SgmcObservedRecord,
    | 'productDoi'
    | 'publicationVersion'
    | 'layerName'
    | 'layerId'
    | 'scienceBaseItem'
    | 'spatialReference'
    | 'pagination'
  >,
  identity: ReturnType<typeof sgmcProviderRecordKey>,
  fields: Record<string, unknown>
): { code: SourceAdapterFailureCode; diagnostics: SourceAdapterDiagnostic[] } | undefined {
  if (fixture.productDoi === USGS_SGMC_GEMS_DOI || fixture.productDoi !== USGS_SGMC_PINNED_DOI) {
    return issue(SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION, 'productDoi');
  }
  if (
    fixture.publicationVersion !== USGS_SGMC_PUBLICATION_VERSION ||
    fixture.layerName !== USGS_SGMC_LAYER_NAME ||
    fixture.layerId !== USGS_SGMC_LAYER_ID ||
    fixture.scienceBaseItem !== USGS_SGMC_SCIENCEBASE_ITEM
  ) {
    return issue(SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION, 'sourceIdentity');
  }
  if (!ACCEPTED_SPATIAL_REFERENCES.has(fixture.spatialReference)) {
    return issue(SourceAdapterFailureCode.INVALID_GEOMETRY, 'spatialReference');
  }
  if (!polygonGeometry(fields['geometry'])) {
    return issue(SourceAdapterFailureCode.INVALID_GEOMETRY, 'geometry');
  }
  if (
    fixture.pagination.returnedCount >= USGS_SGMC_MAX_RECORD_COUNT &&
    fixture.pagination.completion === 'UNKNOWN'
  ) {
    return issue(SourceAdapterFailureCode.COVERAGE_METADATA_INVALID, 'pagination');
  }
  if (identity.ambiguous) {
    return issue(SourceAdapterFailureCode.REQUIRED_FIELD_MISSING, 'providerRecordKey');
  }
  if (text(fields['STATE']) === undefined) {
    return issue(SourceAdapterFailureCode.REQUIRED_FIELD_MISSING, 'STATE');
  }
  if (text(fields['UNIT_NAME']) === undefined) {
    return issue(SourceAdapterFailureCode.REQUIRED_FIELD_MISSING, 'UNIT_NAME');
  }
  if (text(fields['AGE_MIN']) === undefined || text(fields['AGE_MAX']) === undefined) {
    return issue(SourceAdapterFailureCode.NORMALIZATION_FAILED, 'AGE_MIN');
  }
  return undefined;
}

function issue(
  code: SourceAdapterFailureCode,
  field: string
): { code: SourceAdapterFailureCode; diagnostics: SourceAdapterDiagnostic[] } {
  return {
    code,
    diagnostics: [{ code, field, detail: 'SGMC provider contract rejected this record' }],
  };
}

function coverageFor(
  fixture: Pick<SgmcObservedRecord, 'pagination'>
): NonNullable<SourceAdapterResult['coverage']> {
  const ambiguous =
    fixture.pagination.returnedCount >= USGS_SGMC_MAX_RECORD_COUNT &&
    fixture.pagination.completion === 'UNKNOWN';
  return {
    state: ambiguous ? 'UNRESOLVED' : 'UNKNOWN',
    reason: { code: 'OFFLINE_FIXTURE', detail: 'Documentation-derived fixture, not a live query' },
    recordCoverage: ambiguous ? 'PARTIAL' : 'COMPLETE',
    geometryCoverage: ambiguous ? 'UNKNOWN' : 'COMPLETE',
    temporalCoverage: 'UNKNOWN',
    knownMissingClasses: ['Alaska', 'Hawaii'],
    resultCount: fixture.pagination.returnedCount,
  };
}

function quarantined(
  raw: SourceAdapterResult['raw'],
  coverage: NonNullable<SourceAdapterResult['coverage']>,
  code: SourceAdapterFailureCode,
  diagnostics: SourceAdapterDiagnostic[]
): SourceAdapterResult {
  return {
    status: SourceAdapterResultStatus.QUARANTINED,
    failureCode: code,
    diagnostics,
    raw,
    successfulRetrievalImpliesCurrency: false,
    confirmedAbsence: false,
    coverage,
    candidates: [{ kind: SourceAdapterOutputKind.QUARANTINE_CANDIDATE, admission: 'CANDIDATE' }],
    succeeded: [],
    failed: diagnostics,
    unknown: [],
    safeToContinue: false,
  };
}

function fieldMappings(): SourceFieldMapping[] {
  const lithologyMap = USGS_SGMC_KNOWN_GENERALIZED_LITH.map((value) => ({
    source: value,
    target: value,
  }));
  return [
    direct('STATE', 'stateCode', true),
    direct('SGMC_LABEL', 'sgmcLabel', true),
    direct('UNIT_LINK', 'unitLink', true),
    direct('UNIT_NAME', 'unitName', true),
    direct('AGE_MIN', 'geologicAgeMin', true),
    direct('AGE_MAX', 'geologicAgeMax', true),
    {
      sourceField: 'GENERALIZED_LITH',
      targetField: 'generalizedLithology',
      mappingType: SourceFieldMappingType.ENUM_MAPPED,
      required: true,
      normalizationRule: { kind: SourceNormalizationRuleKind.ENUM_MAPPING, enumMap: lithologyMap },
    },
    direct('NGMDB1', 'ngmdb1', false),
    direct('NGMDB2', 'ngmdb2', false),
    direct('NGMDB3', 'ngmdb3', false),
    {
      sourceField: 'OBJECTID',
      targetField: 'serviceObjectId',
      mappingType: SourceFieldMappingType.RENAMED,
      required: false,
      notes: 'Service handle only. Not the canonical record identity.',
    },
    {
      sourceField: 'geometry',
      targetField: 'geometry',
      mappingType: SourceFieldMappingType.DIRECT,
      required: true,
    },
  ];
}

function direct(sourceField: string, targetField: string, required: boolean): SourceFieldMapping {
  return {
    sourceField,
    targetField,
    mappingType: SourceFieldMappingType.RENAMED,
    required,
  };
}

function featureFields(feature: SgmcFixture['feature']): Record<string, unknown> {
  return { ...feature };
}

function assertAgesStayOffTheClock(result: SourceAdapterResult): void {
  const clock = result.truthClockCandidate ?? {};
  for (const field of CLOCK_FIELDS) {
    if (clock[field] !== undefined) {
      throw new Error('SGMC geologic attributes must not enter the truth clock');
    }
  }
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function polygonGeometry(value: unknown): boolean {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    !('coordinates' in value)
  ) {
    return false;
  }
  if (value.type !== 'Polygon' || !isUnknownArray(value.coordinates)) {
    return false;
  }
  const ring = value.coordinates[0];
  if (!isUnknownArray(ring) || ring.length < 4) {
    return false;
  }
  return JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1]);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

async function provenanceFor(
  result: SourceAdapterResult,
  definition: SourceAdapterDefinition
): Promise<ProvenanceGraph> {
  const fixtureEntity = {
    entityId: result.raw?.id ?? 'fixture:usgs-sgmc',
    entityType: ProvenanceEntityType.DOCUMENT,
  };
  const resourceEntity = {
    entityId: USGS_SGMC_RESOURCE_ID,
    entityType: ProvenanceEntityType.RESOURCE_RECORD,
  };
  const generated =
    result.normalized === undefined
      ? [fixtureEntity]
      : [
          {
            entityId: result.normalized.id,
            entityType: ProvenanceEntityType.GEOLOGICAL_LAYER,
          },
        ];
  const activity = validateProvenanceActivity({
    id: `act:${result.raw?.id ?? 'usgs-sgmc'}:import`,
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activityType: ProvenanceActivityType.IMPORT,
    lineageClass: ProvenanceLineageClass.PROCESS,
    used: [resourceEntity, fixtureEntity],
    generated,
    associatedAgents: [
      {
        agentId: 'usgs-sgmc-offline-adapter',
        agentType: ProvenanceAgentType.SOFTWARE,
        role: ProvenanceAgentRole.SOFTWARE_EXECUTOR,
      },
    ],
    process: {
      processId: definition.id,
      processVersion: `${definition.version.major}.${definition.version.minor}.${definition.version.patch}`,
      implementationRef: 'packages/shared/src/usgs-sgmc-provider.ts',
      buildingBlockId: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      buildingBlockVersion: { major: 1, minor: 0, patch: 0 },
    },
    startedAt: USGS_SGMC_CONTRACT_INSTANT,
    endedAt: USGS_SGMC_CONTRACT_INSTANT,
    parameters: [
      {
        name: 'adapterVersion',
        type: 'STRING',
        value: `${definition.version.major}.${definition.version.minor}.${definition.version.patch}`,
      },
      { name: 'fixtureKind', type: 'STRING', value: USGS_SGMC_FIXTURE_KIND },
    ],
    status: result.status === SourceAdapterResultStatus.SUCCESS ? 'COMPLETED' : 'FAILED',
  });
  const hashed = await hashProvenanceActivity(activity);
  return validateProvenanceGraph({
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activities: [validateProvenanceActivity({ ...activity, activityHash: hashed })],
    derivations: [],
  });
}

export function sgmcOperationIsGranted(operation: string): boolean {
  const authorization = evaluateSourceOperationAuthorization(
    sgmcAuthorizationRequest({
      requestedOperation: operation as SourceOperationAuthorizationRequest['requestedOperation'],
    })
  );
  return (
    authorization.status === SourceOperationAuthorizationStatus.ALLOWED ||
    authorization.status === SourceOperationAuthorizationStatus.ALLOWED_WITH_CONSTRAINTS
  );
}

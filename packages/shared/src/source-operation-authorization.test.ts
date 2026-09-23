import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DisclosureClassification,
  DisclosurePurpose,
  GeometryDisclosureMode,
  SpatialPrecisionClass,
  disclosureAuthorizesCollection,
  projectForDisclosure,
} from './disclosure-governance';
import { fixtureAdaptersContactNetwork, listFixtureAdapterCases } from './offline-fixture-adapters';
import {
  SourceAdapterPrecondition,
  SourceRequestedUseOperation,
  validateSourceAdapterDefinition,
} from './source-adapter-contract';
import {
  FIRST_LIVE_OPERATIONS,
  SourceLicenseOperation,
  SourceOperationAuthorizationStatus,
  SourceUseReviewState,
  evaluateSourceOperationAuthorization,
  guardFirstLiveAdapterExecution,
  operationAuthorizationAdmitsEvidence,
  operationAuthorizationIsDecision,
  type SourceOperationAuthorizationRequest,
} from './source-operation-authorization';

const openLicense = {
  attributionRequired: 'NOT_REQUIRED' as const,
  redistribution: 'ALLOWED' as const,
  offlineCaching: 'ALLOWED' as const,
  derivativeUse: 'ALLOWED' as const,
};

function request(
  overrides: Partial<SourceOperationAuthorizationRequest> = {}
): SourceOperationAuthorizationRequest {
  return {
    resourceId: 'res-1',
    reviewState: SourceUseReviewState.REVIEWED,
    governanceStatus: 'ADMITTED',
    governanceReceipt: {
      receiptId: 'gov-receipt-1',
      resourceId: 'res-1',
      decision: 'ALLOWED',
      allowedOperations: [SourceRequestedUseOperation.READ],
    },
    licenseProfile: openLicense,
    explicitGrants: [SourceLicenseOperation.READ],
    requestedOperation: SourceLicenseOperation.READ,
    ...overrides,
  };
}

function definition(tolerant: boolean, preconditions = Object.values(SourceAdapterPrecondition)) {
  return validateSourceAdapterDefinition({
    id: 'rockhounding:future-live-adapter',
    version: { major: 1, minor: 0, patch: 0 },
    schemaVersion: 1,
    name: 'Future live adapter definition',
    sourceResourceTypes: ['DOCUMENT'],
    inputKinds: ['RAW_RECORD'],
    outputKinds: ['DOCUMENT_EVIDENCE_CANDIDATE'],
    capabilities: ['DETERMINISTIC_TRANSLATION'],
    deterministic: true,
    limitations: ['synthetic'],
    requiredBuildingBlocks: ['rockhounding:source-adapter-contract'],
    requiredPreconditions: preconditions,
    allowExplicitUnknownTemporalContext: false,
    supportedSourceVersions: ['1'],
    tolerantUnsupportedVersion: tolerant,
    requiredUseOperation: SourceRequestedUseOperation.READ,
  });
}

describe('source operation authorization', () => {
  it('allows the exact requested read operation', () => {
    const result = evaluateSourceOperationAuthorization(request());
    expect(result.status).toBe(SourceOperationAuthorizationStatus.ALLOWED);
    expect(result.requestedOperation).toBe(SourceLicenseOperation.READ);
  });

  it('does not let one operation imply another', () => {
    expect(
      evaluateSourceOperationAuthorization(
        request({ requestedOperation: SourceLicenseOperation.TRANSFORM })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
    expect(
      evaluateSourceOperationAuthorization(
        request({
          explicitGrants: [SourceLicenseOperation.AUTOMATED_QUERY],
          requestedOperation: SourceLicenseOperation.BULK_DOWNLOAD,
          governanceReceipt: {
            receiptId: 'gov-receipt-1',
            resourceId: 'res-1',
            decision: 'ALLOWED',
            allowedOperations: [SourceRequestedUseOperation.AUTOMATED_QUERY],
          },
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
    expect(
      evaluateSourceOperationAuthorization(
        request({
          explicitGrants: [SourceLicenseOperation.MODEL_INPUT],
          requestedOperation: SourceLicenseOperation.TRAINING_USE,
          governanceReceipt: {
            receiptId: 'gov-receipt-1',
            resourceId: 'res-1',
            decision: 'ALLOWED',
            allowedOperations: [SourceRequestedUseOperation.MODEL_INPUT],
          },
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
  });

  it('blocks public API redistribution when redistribution is prohibited', () => {
    const result = evaluateSourceOperationAuthorization(
      request({
        licenseProfile: { ...openLicense, redistribution: 'PROHIBITED' },
        explicitGrants: [SourceLicenseOperation.READ, SourceLicenseOperation.PUBLIC_API],
        requestedOperation: SourceLicenseOperation.PUBLIC_API,
      })
    );
    expect(result.status).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
    expect(
      evaluateSourceOperationAuthorization(
        request({
          licenseProfile: { ...openLicense, redistribution: 'PROHIBITED' },
          explicitGrants: [SourceLicenseOperation.READ, SourceLicenseOperation.PUBLIC_DISPLAY],
          requestedOperation: SourceLicenseOperation.PUBLIC_DISPLAY,
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.ALLOWED);
  });

  it('returns attribution constraints instead of dropping them', () => {
    const result = evaluateSourceOperationAuthorization(
      request({
        licenseProfile: { ...openLicense, attributionRequired: 'REQUIRED' },
      })
    );
    expect(result.status).toBe(SourceOperationAuthorizationStatus.ALLOWED_WITH_CONSTRAINTS);
    expect(result.constraints.map((item) => item.code)).toContain('ATTRIBUTION_REQUIRED');
  });

  it('fails closed for unknown, unreviewed, prohibited, superseded, and mismatched facts', () => {
    expect(
      evaluateSourceOperationAuthorization(request({ reviewState: SourceUseReviewState.UNKNOWN }))
        .status
    ).toBe(SourceOperationAuthorizationStatus.UNKNOWN);
    expect(
      evaluateSourceOperationAuthorization(
        request({ reviewState: SourceUseReviewState.NEEDS_REVIEW })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.UNKNOWN);
    expect(
      evaluateSourceOperationAuthorization(
        request({
          governanceReceipt: {
            receiptId: 'gov-receipt-1',
            resourceId: 'res-1',
            decision: 'PROHIBITED',
            allowedOperations: [SourceRequestedUseOperation.READ],
          },
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
    expect(
      evaluateSourceOperationAuthorization(
        request({ reviewState: SourceUseReviewState.SUPERSEDED })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
    expect(evaluateSourceOperationAuthorization(request({ resourceId: 'res-other' })).status).toBe(
      SourceOperationAuthorizationStatus.PROHIBITED
    );
    expect(
      evaluateSourceOperationAuthorization(
        request({
          governanceReceipt: {
            receiptId: 'gov-receipt-1',
            resourceId: 'res-1',
            decision: 'ALLOWED',
            allowedOperations: [SourceRequestedUseOperation.TRANSFORM],
          },
          explicitGrants: [SourceLicenseOperation.READ],
          requestedOperation: SourceLicenseOperation.READ,
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
  });

  it('guards first-live execution and ignores a caller boolean', () => {
    let calls = 0;
    const execute = (): { executed: true } => {
      calls += 1;
      return { executed: true };
    };
    const ok = guardFirstLiveAdapterExecution(
      {
        authorizationRequest: request(),
        definition: definition(false),
        adapterOperation: SourceRequestedUseOperation.READ,
        resourceId: 'res-1',
      },
      execute
    );
    expect(ok.executed).toBe(true);
    expect(calls).toBe(1);

    expect(() =>
      guardFirstLiveAdapterExecution(
        {
          authorizationRequest: request(),
          definition: definition(true),
          adapterOperation: SourceRequestedUseOperation.READ,
          resourceId: 'res-1',
          callerAuthorized: true,
        },
        execute
      )
    ).toThrow(/tolerant/i);
    expect(calls).toBe(1);

    expect(() =>
      guardFirstLiveAdapterExecution(
        {
          authorizationRequest: request(),
          definition: definition(false, [SourceAdapterPrecondition.RESOURCE_IDENTIFIED]),
          adapterOperation: SourceRequestedUseOperation.READ,
          resourceId: 'res-1',
        },
        execute
      )
    ).toThrow(/precondition/i);

    expect(() =>
      guardFirstLiveAdapterExecution(
        {
          callerAuthorized: true,
        },
        execute
      )
    ).toThrow();
    expect(calls).toBe(1);
    expect(FIRST_LIVE_OPERATIONS).toEqual(['READ', 'AUTOMATED_QUERY']);
  });

  it('keeps fixture adapters offline and deterministic', () => {
    expect(fixtureAdaptersContactNetwork()).toBe(false);
    expect(listFixtureAdapterCases().length).toBeGreaterThan(0);
    const source = readFileSync(resolve(__dirname, 'source-operation-authorization.ts'), 'utf8');
    expect(source.includes('fetch(')).toBe(false);
    expect(source.includes('axios')).toBe(false);
    expect(source.includes('Date.now')).toBe(false);
  });

  it('keeps disclosure, license, admission, and decision authority independent', () => {
    const usable = evaluateSourceOperationAuthorization(request());
    expect(usable.status).toBe(SourceOperationAuthorizationStatus.ALLOWED);
    const hidden = projectForDisclosure({
      projectionId: 'proj-sensitive',
      sourceEntityRef: 'entity-1',
      classification: DisclosureClassification.SCIENTIFIC_SENSITIVE,
      purpose: DisclosurePurpose.PUBLIC_MAP,
      geometry: {
        geometryRef: 'geom-1',
        precision: SpatialPrecisionClass.EXACT_POINT,
        coordinates: { latitude: 1, longitude: 2 },
        coarseRef: 'region-1',
      },
      policy: {
        id: 'policy-disclosure-r1',
        version: { major: 1, minor: 0, patch: 0 },
        rules: [
          {
            classification: DisclosureClassification.SCIENTIFIC_SENSITIVE,
            purpose: DisclosurePurpose.PUBLIC_MAP,
            mode: GeometryDisclosureMode.COARSE,
            maxPrecision: SpatialPrecisionClass.LOCALITY_SCALE,
          },
        ],
      },
    });
    expect(hidden.mode).toBe(GeometryDisclosureMode.COARSE);
    expect(hidden.released?.coordinates).toBeUndefined();
    expect(operationAuthorizationAdmitsEvidence()).toBe(false);
    expect(operationAuthorizationIsDecision()).toBe(false);
    expect(disclosureAuthorizesCollection()).toBe(false);
    expect(
      evaluateSourceOperationAuthorization(
        request({
          explicitGrants: [SourceLicenseOperation.PUBLIC_DISPLAY],
          requestedOperation: SourceLicenseOperation.PUBLIC_API,
          licenseProfile: { ...openLicense, redistribution: 'PROHIBITED' },
        })
      ).status
    ).toBe(SourceOperationAuthorizationStatus.PROHIBITED);
  });
});

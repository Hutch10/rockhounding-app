/**
 * SGMC public-display rights review.
 *
 * These tests use the reviewed source-use profile. They do not contact a provider.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { governanceAuthorizesCollection } from './source-governance-contract';
import {
  evaluateSourceOperationAuthorization,
  operationAuthorizationAdmitsEvidence,
  operationAuthorizationIsDecision,
} from './source-operation-authorization';
import {
  USGS_SGMC_GEMS_DOI,
  USGS_SGMC_PINNED_DOI,
  USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION,
  USGS_SGMC_RESOURCE_ID,
  projectSgmcDisclosure,
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  sgmcPublicDisplayAllowsUsgsIdentifier,
  sgmcPublicDisplayAppliesToDoi,
  sgmcPublicDisplayAuthorizationRequest,
  sgmcPublicDisplayImpliesEndorsement,
} from './usgs-sgmc-provider';

describe('SGMC public display rights', () => {
  it('grants PUBLIC_DISPLAY only on the reviewed SGMC profile and only with attribution', () => {
    const granted = evaluateSourceOperationAuthorization(sgmcPublicDisplayAuthorizationRequest());
    expect(granted.resourceId).toBe(USGS_SGMC_RESOURCE_ID);
    expect(granted.requestedOperation).toBe('PUBLIC_DISPLAY');
    expect(granted.status).toBe('ALLOWED_WITH_CONSTRAINTS');
    expect(granted.constraints.map((constraint) => constraint.code)).toContain(
      'ATTRIBUTION_REQUIRED'
    );
    expect(USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION.creditRequired).toBe(true);
    expect(USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION.doi).toBe(USGS_SGMC_PINNED_DOI);
    expect(sgmcPublicDisplayImpliesEndorsement()).toBe(false);
    expect(sgmcPublicDisplayAllowsUsgsIdentifier()).toBe(false);

    const wrongResource = evaluateSourceOperationAuthorization(
      sgmcPublicDisplayAuthorizationRequest({ resourceId: 'res-other' })
    );
    expect(wrongResource.status).toBe('PROHIBITED');
    expect(wrongResource.reasons[0]?.code).toBe('RESOURCE_MISMATCH');

    const superseded = evaluateSourceOperationAuthorization(
      sgmcPublicDisplayAuthorizationRequest({ reviewState: 'SUPERSEDED' })
    );
    expect(superseded.status).toBe('PROHIBITED');
    const unreviewed = evaluateSourceOperationAuthorization(
      sgmcPublicDisplayAuthorizationRequest({ reviewState: 'UNKNOWN' })
    );
    expect(unreviewed.status).toBe('UNKNOWN');
  });

  it('keeps display separate from query, redistribution, disclosure, admission, and GeMS', () => {
    const queryOnly = evaluateSourceOperationAuthorization(
      sgmcAuthorizationRequest({ requestedOperation: 'PUBLIC_DISPLAY' })
    );
    expect(queryOnly.status).toBe('PROHIBITED');
    expect(queryOnly.reasons[0]?.code).toBe('OPERATION_NOT_GRANTED');

    for (const operation of [
      'REDISTRIBUTE',
      'PUBLIC_API',
      'LOCAL_CACHE',
      'OFFLINE_PACKAGE',
      'TRAINING_USE',
      'MODEL_INPUT',
      'AI_PROCESSING',
    ] as const) {
      const separated = evaluateSourceOperationAuthorization(
        sgmcPublicDisplayAuthorizationRequest({ requestedOperation: operation })
      );
      expect(separated.status).not.toBe('ALLOWED');
      expect(separated.status).not.toBe('ALLOWED_WITH_CONSTRAINTS');
    }

    const display = evaluateSourceOperationAuthorization(sgmcPublicDisplayAuthorizationRequest());
    expect(operationAuthorizationAdmitsEvidence()).toBe(false);
    expect(operationAuthorizationIsDecision()).toBe(false);
    expect(display).not.toHaveProperty('disclosure');
    const projection = projectSgmcDisclosure(
      DisclosureClassification.PUBLIC,
      DisclosurePurpose.PUBLIC_MAP
    );
    expect(projection.decision.status).toBe('ALLOWED');
    expect(governanceAuthorizesCollection(sgmcGovernanceRecord())).toBe(false);
    expect(sgmcGovernanceRecord().allowedUses).toEqual(['GEOLOGICAL_CONTEXT']);
    expect(sgmcPublicDisplayAppliesToDoi(USGS_SGMC_PINNED_DOI)).toBe(true);
    expect(sgmcPublicDisplayAppliesToDoi(USGS_SGMC_GEMS_DOI)).toBe(false);

    const provider = readFileSync(resolve(__dirname, './usgs-sgmc-provider.ts'), 'utf8');
    expect(provider.includes('FeatureServer')).toBe(false);
  });
});

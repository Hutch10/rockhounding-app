import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  BuildingBlockLifecycleStatus,
  DISCLOSURE_GOVERNANCE_BLOCK_ID,
  UGES_BLOCK_ID,
  getLatestStableBuildingBlock,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import {
  DisclosureClassification,
  DisclosureDecisionStatus,
  DisclosurePurpose,
  GeometryDisclosureMode,
  SpatialPrecisionClass,
  disclosureAuthorizesCollection,
  disclosureMutatesSource,
  evaluateDisclosure,
  materializeDisclosureRelease,
  projectForDisclosure,
  type DisclosureClassification as DisclosureClassificationName,
  type DisclosureGeometry,
  type DisclosurePolicy,
  type DisclosurePurpose as DisclosurePurposeName,
} from './disclosure-governance';

const VERSION = { major: 1, minor: 0, patch: 0 };

const EXACT: DisclosureGeometry = {
  geometryRef: 'geom-exact-1',
  precision: SpatialPrecisionClass.EXACT_POINT,
  coordinates: { latitude: 44.123456, longitude: -110.987654 },
  coarseRef: 'locality-yellowstone-region',
};

function policy(rules: DisclosurePolicy['rules']): DisclosurePolicy {
  return {
    id: 'policy-disclosure-r1',
    version: VERSION,
    rules,
  };
}

const permissive = policy([
  {
    classification: DisclosureClassification.PUBLIC,
    purpose: DisclosurePurpose.PUBLIC_MAP,
    mode: GeometryDisclosureMode.EXACT,
    maxPrecision: SpatialPrecisionClass.EXACT_POINT,
  },
  {
    classification: DisclosureClassification.SCIENTIFIC_SENSITIVE,
    purpose: DisclosurePurpose.PUBLIC_MAP,
    mode: GeometryDisclosureMode.COARSE,
    maxPrecision: SpatialPrecisionClass.LOCALITY_SCALE,
  },
  {
    classification: DisclosureClassification.PUBLIC,
    purpose: DisclosurePurpose.MODEL_CONTEXT,
    mode: GeometryDisclosureMode.COARSE,
    maxPrecision: SpatialPrecisionClass.LOCALITY_SCALE,
  },
  {
    classification: DisclosureClassification.PUBLIC,
    purpose: DisclosurePurpose.SHADOW_DISPLAY,
    mode: GeometryDisclosureMode.EXACT,
    maxPrecision: SpatialPrecisionClass.EXACT_POINT,
  },
  {
    classification: DisclosureClassification.PUBLIC,
    purpose: DisclosurePurpose.INTERNAL_ANALYSIS,
    mode: GeometryDisclosureMode.EXACT,
    maxPrecision: SpatialPrecisionClass.EXACT_POINT,
  },
]);

function project(
  classification: DisclosureClassificationName,
  purpose: DisclosurePurposeName,
  rules: DisclosurePolicy['rules'] = permissive.rules
) {
  return projectForDisclosure({
    projectionId: `proj-${classification}-${purpose}`,
    sourceEntityRef: 'entity-1',
    classification,
    purpose,
    geometry: EXACT,
    policy: policy(rules),
  });
}

describe('disclosure governance', () => {
  it('releases a public exact point to a public map under a permissive policy', () => {
    const projection = project(DisclosureClassification.PUBLIC, DisclosurePurpose.PUBLIC_MAP);
    expect(projection.decision.status).toBe(DisclosureDecisionStatus.ALLOWED);
    expect(projection.mode).toBe(GeometryDisclosureMode.EXACT);
    expect(projection.released?.precision).toBe(SpatialPrecisionClass.EXACT_POINT);
    const release = materializeDisclosureRelease(projection, DisclosurePurpose.PUBLIC_MAP);
    expect(release.precision).toBe(SpatialPrecisionClass.EXACT_POINT);
  });

  it('coarsens scientific-sensitive geometry on a public map', () => {
    const projection = project(
      DisclosureClassification.SCIENTIFIC_SENSITIVE,
      DisclosurePurpose.PUBLIC_MAP
    );
    expect(projection.mode).toBe(GeometryDisclosureMode.COARSE);
    expect(projection.released?.precision).toBe(SpatialPrecisionClass.LOCALITY_SCALE);
    expect(projection.released?.coordinates).toBeUndefined();
    expect(projection.released?.geometryRef).toBe(EXACT.coarseRef);
    expect(projection.method).toBe('coarse-reference-v1');
  });

  it('withholds unknown sensitivity from public map and public API', () => {
    for (const purpose of [DisclosurePurpose.PUBLIC_MAP, DisclosurePurpose.PUBLIC_API]) {
      const projection = project(DisclosureClassification.UNKNOWN, purpose);
      expect(projection.decision.status).toBe(DisclosureDecisionStatus.UNKNOWN_FAIL_CLOSED);
      expect(projection.mode).toBe(GeometryDisclosureMode.WITHHELD);
      expect(projection.released?.coordinates).toBeUndefined();
    }
  });

  it('withholds personal-private geometry from export', () => {
    const projection = project(DisclosureClassification.PERSONAL_PRIVATE, DisclosurePurpose.EXPORT);
    expect(projection.mode).toBe(GeometryDisclosureMode.WITHHELD);
    expect(projection.decision.status).toBe(DisclosureDecisionStatus.WITHHELD);
  });

  it('leaves the source geometry unchanged and frozen only as a copy', () => {
    const source: DisclosureGeometry = {
      geometryRef: EXACT.geometryRef,
      precision: EXACT.precision,
      coordinates: { latitude: 44.123456, longitude: -110.987654 },
      coarseRef: EXACT.coarseRef,
    };
    const projection = projectForDisclosure({
      projectionId: 'proj-copy',
      sourceEntityRef: 'entity-1',
      classification: DisclosureClassification.PUBLIC,
      purpose: DisclosurePurpose.PUBLIC_MAP,
      geometry: source,
      policy: permissive,
    });
    expect(source.coordinates).toEqual({ latitude: 44.123456, longitude: -110.987654 });
    expect(projection.sourceGeometry).not.toBe(source);
    expect(projection.sourceGeometry.coordinates).toEqual(source.coordinates);
    expect(disclosureMutatesSource()).toBe(false);
    if (projection.released?.coordinates !== undefined) {
      projection.released.coordinates.latitude = 0;
    }
    expect(source.coordinates?.latitude).toBe(44.123456);
  });

  it('requires the disclosure gate before shadow display and rejects a raw geometry bypass', () => {
    const projection = project(DisclosureClassification.PUBLIC, DisclosurePurpose.SHADOW_DISPLAY);
    expect(
      materializeDisclosureRelease(projection, DisclosurePurpose.SHADOW_DISPLAY).geometryRef
    ).toBe(EXACT.geometryRef);
    expect(() =>
      materializeDisclosureRelease(
        { geometryRef: EXACT.geometryRef, coordinates: EXACT.coordinates },
        DisclosurePurpose.SHADOW_DISPLAY
      )
    ).toThrow(/disclosure/i);
  });

  it('gives model context a coarse location rather than the exact point', () => {
    const projection = project(DisclosureClassification.PUBLIC, DisclosurePurpose.MODEL_CONTEXT);
    expect(projection.mode).toBe(GeometryDisclosureMode.COARSE);
    expect(projection.released?.precision).not.toBe(SpatialPrecisionClass.EXACT_POINT);
    expect(projection.released?.coordinates).toBeUndefined();
  });

  it('records policy version and disclosure provenance', () => {
    const projection = project(DisclosureClassification.PUBLIC, DisclosurePurpose.PUBLIC_MAP);
    expect(projection.provenance.activityType).toBe('DISCLOSURE_TRANSFORMATION');
    expect(projection.provenance.policyId).toBe(permissive.id);
    expect(projection.provenance.policyVersion).toEqual(VERSION);
    expect(projection.provenance.sourceEntityRef).toBe('entity-1');
    expect(projection.inferenceDisclosureHook).toBe('NOT_IMPLEMENTED');
  });

  it('is deterministic for reordered equivalent rules and does not use clock or jitter', () => {
    const rules = [...permissive.rules].reverse();
    const first = project(DisclosureClassification.PUBLIC, DisclosurePurpose.PUBLIC_MAP);
    const second = project(DisclosureClassification.PUBLIC, DisclosurePurpose.PUBLIC_MAP, rules);
    expect(second.decision.status).toBe(first.decision.status);
    expect(second.mode).toBe(first.mode);
    expect(second.method).toBe(first.method);
    const source = readFileSync(resolve(__dirname, 'disclosure-governance.ts'), 'utf8');
    expect(source.includes('Date.now')).toBe(false);
    expect(source.includes('Math.random')).toBe(false);
    expect(source.includes('fetch(')).toBe(false);
    expect(evaluateDisclosure(first.inputs).status).toBe(first.decision.status);
  });

  it('keeps an internal exact copy without authorizing collection', () => {
    const projection = project(
      DisclosureClassification.SCIENTIFIC_SENSITIVE,
      DisclosurePurpose.INTERNAL_ANALYSIS,
      [
        {
          classification: DisclosureClassification.SCIENTIFIC_SENSITIVE,
          purpose: DisclosurePurpose.INTERNAL_ANALYSIS,
          mode: GeometryDisclosureMode.EXACT,
          maxPrecision: SpatialPrecisionClass.EXACT_POINT,
        },
      ]
    );
    expect(projection.mode).toBe(GeometryDisclosureMode.EXACT);
    expect(disclosureAuthorizesCollection()).toBe(false);
  });

  it('registers disclosure governance as STABLE 1.0.0', () => {
    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const block = getLatestStableBuildingBlock(registry, DISCLOSURE_GOVERNANCE_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual(VERSION);
    expect(block?.category).toBe('DISCLOSURE_MODEL');
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
  });
});

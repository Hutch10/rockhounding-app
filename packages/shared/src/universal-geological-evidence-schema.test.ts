/**
 * Universal Geological Evidence Schema R1
 *
 * Production change that would fail these tests: removing a required time
 * field, collapsing PROHIBITED into certainty, allowing self-support, or
 * accepting validFrom > validTo.
 */

import { describe, expect, it } from 'vitest';

import {
  EvidenceAssertionSchema,
  EvidenceAuthorityClass,
  EvidenceCertainty,
  EvidenceClass,
  EvidenceConfidenceLevel,
  EvidenceGeometrySchema,
  EvidencePermissionDimension,
  EvidencePermissionStatus,
  EvidencePredicate,
  EvidenceSourceDescriptorSchema,
  EvidenceSubjectKind,
  UGES_SCHEMA_VERSION,
  parseEvidenceAssertion,
  serializeEvidenceAssertion,
  type EvidenceAssertion,
  type EvidenceSourceDescriptor,
} from './universal-geological-evidence-schema';

const SOURCE_USGS: EvidenceSourceDescriptor = {
  id: 'src-usgs-sgmc',
  name: 'USGS State Geologic Map Compilation',
  provider: 'USGS',
  authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
  sourceType: 'GEOLOGIC_MAP',
  license: 'USGS public domain',
  canonicalUri: 'https://www.usgs.gov/programs/national-cooperative-geologic-mapping-program',
  retrievalPolicy: 'BATCH_IMPORT',
  freshness: { retrievedAt: '2026-09-01T00:00:00.000Z', statedVintage: '2020' },
};

function minimalAssertion(
  overrides: Partial<EvidenceAssertion> &
    Pick<EvidenceAssertion, 'id' | 'subject' | 'predicate' | 'value'>
): EvidenceAssertion {
  return {
    schemaVersion: UGES_SCHEMA_VERSION,
    retrievedAt: '2026-09-03T08:00:00.000Z',
    source: SOURCE_USGS,
    authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    evidenceClass: EvidenceClass.AUTHORITATIVE_DATA,
    certainty: EvidenceCertainty.SUPPORTED,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    provenance: {
      sourceSystem: 'usgs-sgmc',
      ingestionMethod: 'IMPORT_DATASET',
      transformVersion: 'uges-normalize-v1',
    },
    ...overrides,
  };
}

describe('UGES R1 schema version', () => {
  it('pins schemaVersion to 1', () => {
    expect(UGES_SCHEMA_VERSION).toBe(1);
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-min-1',
        subject: { kind: EvidenceSubjectKind.SITE, id: 'loc-1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'limestone' },
      })
    );
    expect(parsed.schemaVersion).toBe(1);
  });

  it('rejects missing or wrong schemaVersion', () => {
    const raw = minimalAssertion({
      id: 'ev-min-bad-ver',
      subject: { kind: EvidenceSubjectKind.SITE, id: 'loc-1' },
      predicate: EvidencePredicate.GEOLOGY,
      value: { kind: 'text', text: 'limestone' },
    });
    expect(() => parseEvidenceAssertion({ ...raw, schemaVersion: 0 })).toThrow();
    expect(() => parseEvidenceAssertion({ ...raw, schemaVersion: 2 })).toThrow();
  });
});

describe('minimal evidence assertion', () => {
  it('accepts the smallest valid assertion', () => {
    const result = EvidenceAssertionSchema.safeParse(
      minimalAssertion({
        id: 'ev-min',
        subject: { kind: EvidenceSubjectKind.SITE, id: 'site-42' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'mapped carbonate' },
      })
    );
    expect(result.success).toBe(true);
  });

  it('requires retrievedAt distinct from optional observedAt/valid range', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-time-split',
        subject: { kind: EvidenceSubjectKind.SITE, id: 'site-42' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'carbonate' },
        validFrom: '1970-01-01T00:00:00.000Z',
        observedAt: '2024-06-15T18:00:00.000Z',
        retrievedAt: '2026-09-03T08:00:00.000Z',
      })
    );
    expect(parsed.validFrom).toBe('1970-01-01T00:00:00.000Z');
    expect(parsed.observedAt).toBe('2024-06-15T18:00:00.000Z');
    expect(parsed.retrievedAt).toBe('2026-09-03T08:00:00.000Z');
    expect(parsed.validTo).toBeUndefined();
  });
});

describe('domain examples', () => {
  it('A: geologic unit on mapped Pennsylvanian limestone', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-geo-unit-a',
        subject: {
          kind: EvidenceSubjectKind.GEOLOGIC_UNIT,
          id: 'unit-ip-ls',
          label: 'Pennsylvanian limestone',
        },
        predicate: EvidencePredicate.GEOLOGY,
        value: {
          kind: 'geologic_unit',
          name: 'Pennsylvanian limestone',
          age: 'Pennsylvanian',
          lithology: 'limestone',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-105.3, 39.7],
              [-105.2, 39.7],
              [-105.2, 39.8],
              [-105.3, 39.8],
              [-105.3, 39.7],
            ],
          ],
        },
        validFrom: '1995-01-01T00:00:00.000Z',
        retrievedAt: '2026-09-01T00:00:00.000Z',
      })
    );
    expect(assertion.value.kind).toBe('geologic_unit');
    expect(assertion.geometry?.type).toBe('Polygon');
  });

  it('B: fluorite occurrence reported near a point', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-occ-b',
        subject: {
          kind: EvidenceSubjectKind.MINERAL_OCCURRENCE,
          id: 'occ-fluorite-1',
        },
        predicate: EvidencePredicate.OCCURRENCE,
        value: { kind: 'mineral_occurrence', species: 'fluorite', reported: true },
        geometry: { type: 'Point', coordinates: [-105.51, 39.74] },
        authorityClass: EvidenceAuthorityClass.SCIENTIFIC_PUBLICATION,
        evidenceClass: EvidenceClass.DOCUMENTED_REPORT,
        certainty: EvidenceCertainty.REPORTED,
      })
    );
    expect(assertion.certainty).toBe(EvidenceCertainty.REPORTED);
  });

  it('C: land management polygon managed by agency X', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-mgmt-c',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-blm-1' },
        predicate: EvidencePredicate.MANAGING_AUTHORITY,
        value: {
          kind: 'managing_authority',
          agency: 'Bureau of Land Management',
          unitName: 'Gila District',
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-110.1, 32.2],
                [-110.0, 32.2],
                [-110.0, 32.3],
                [-110.1, 32.3],
                [-110.1, 32.2],
              ],
            ],
          ],
        },
      })
    );
    expect(assertion.predicate).toBe(EvidencePredicate.MANAGING_AUTHORITY);
  });

  it('D: collecting prohibited (domain value, not certainty)', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-collect-d',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-np-1' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.PROHIBITED,
          notes: 'National Park collecting ban',
        },
        validFrom: '1916-08-25T00:00:00.000Z',
        certainty: EvidenceCertainty.VERIFIED,
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      })
    );
    expect(assertion.certainty).not.toBe('PROHIBITED');
    if (assertion.value.kind === 'permission') {
      expect(assertion.value.status).toBe(EvidencePermissionStatus.PROHIBITED);
      expect(assertion.value.dimension).toBe(EvidencePermissionDimension.COLLECT);
    }
  });

  it('E: field observation of banded chalcedony', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-obs-e',
        subject: { kind: EvidenceSubjectKind.FIELD_OBSERVATION, id: 'obs-88' },
        predicate: EvidencePredicate.FIELD_OBSERVATION,
        value: { kind: 'text', text: 'User observed banded chalcedony at this location.' },
        geometry: { type: 'Point', coordinates: [-111.0, 33.5] },
        observedAt: '2026-04-12T16:22:00.000Z',
        retrievedAt: '2026-04-12T16:25:00.000Z',
        authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        evidenceClass: EvidenceClass.DIRECT_OBSERVATION,
        certainty: EvidenceCertainty.REPORTED,
        confidence: EvidenceConfidenceLevel.HIGH,
        source: {
          id: 'src-user-app',
          name: 'Rockhound field app',
          provider: 'rockhound-web',
          authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
          sourceType: 'FIELD_APP',
          retrievalPolicy: 'USER_SYNC',
        },
      })
    );
    expect(assertion.observedAt).toBe('2026-04-12T16:22:00.000Z');
    expect(assertion.authorityClass).toBe(EvidenceAuthorityClass.USER_OBSERVATION);
    expect(assertion.certainty).toBe(EvidenceCertainty.REPORTED);
    expect(assertion.confidence).toBe(EvidenceConfidenceLevel.HIGH);
  });

  it('F: specimen observed at location Y with identity Z', () => {
    const assertion = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-spec-f',
        subject: { kind: EvidenceSubjectKind.SPECIMEN, id: 'spec-z' },
        predicate: EvidencePredicate.SPECIMEN_IDENTITY,
        value: {
          kind: 'specimen',
          identity: 'banded chalcedony',
          locationId: 'loc-y',
          collected: false,
        },
        observedAt: '2026-04-12T16:22:00.000Z',
        authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        evidenceClass: EvidenceClass.DIRECT_OBSERVATION,
        certainty: EvidenceCertainty.SUPPORTED,
      })
    );
    expect(assertion.subject.kind).toBe(EvidenceSubjectKind.SPECIMEN);
  });

  it('G: preserves conflicting collecting assertions without overwrite', () => {
    const community = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-conflict-community',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-shared' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.ALLOWED,
        },
        authorityClass: EvidenceAuthorityClass.COMMUNITY_REPORT,
        evidenceClass: EvidenceClass.USER_REPORTED,
        certainty: EvidenceCertainty.CONFLICTED,
        contradictingEvidenceIds: ['ev-conflict-authority'],
        source: {
          id: 'src-community',
          name: 'Community site report',
          provider: 'rockhound-community',
          authorityClass: EvidenceAuthorityClass.COMMUNITY_REPORT,
          sourceType: 'USER_REPORT',
        },
      })
    );
    const authority = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-conflict-authority',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-shared' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.PROHIBITED,
        },
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
        evidenceClass: EvidenceClass.AUTHORITATIVE_DATA,
        certainty: EvidenceCertainty.CONFLICTED,
        contradictingEvidenceIds: ['ev-conflict-community'],
      })
    );
    expect(community.id).not.toBe(authority.id);
    expect(community.value).not.toEqual(authority.value);
    expect(community.contradictingEvidenceIds).toContain(authority.id);
    expect(authority.contradictingEvidenceIds).toContain(community.id);
  });
});

describe('permission dimensions', () => {
  it('represents visit, observe, photograph, collect, permit, route, and closure independently', () => {
    const dimensions = [
      EvidencePermissionDimension.VISIT,
      EvidencePermissionDimension.OBSERVE,
      EvidencePermissionDimension.PHOTOGRAPH,
      EvidencePermissionDimension.COLLECT,
      EvidencePermissionDimension.PERMIT,
      EvidencePermissionDimension.ROUTE,
      EvidencePermissionDimension.CLOSURE,
    ];
    expect(new Set(dimensions).size).toBe(7);

    for (const dimension of dimensions) {
      const parsed = parseEvidenceAssertion(
        minimalAssertion({
          id: `ev-perm-${dimension}`,
          subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-1' },
          predicate: EvidencePredicate.ACCESS,
          value: {
            kind: 'permission',
            dimension,
            status:
              dimension === EvidencePermissionDimension.CLOSURE
                ? EvidencePermissionStatus.PROHIBITED
                : EvidencePermissionStatus.ALLOWED,
          },
        })
      );
      expect(parsed.value.kind).toBe('permission');
    }
  });
});

describe('geometry', () => {
  it('accepts point, line, polygon, multipolygon, and omitted geometry', () => {
    expect(EvidenceGeometrySchema.parse({ type: 'Point', coordinates: [0, 0] }).type).toBe('Point');
    expect(
      EvidenceGeometrySchema.parse({
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }).type
    ).toBe('LineString');
    const none = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-nogeom',
        subject: { kind: EvidenceSubjectKind.GEOLOGIC_UNIT, id: 'unit-x' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'unmapped interpretation' },
      })
    );
    expect(none.geometry).toBeUndefined();
  });

  it('rejects out-of-range WGS84 coordinates', () => {
    expect(() => EvidenceGeometrySchema.parse({ type: 'Point', coordinates: [200, 0] })).toThrow();
    expect(() => EvidenceGeometrySchema.parse({ type: 'Point', coordinates: [0, 95] })).toThrow();
  });

  it('rejects unclosed polygon rings', () => {
    expect(() =>
      EvidenceGeometrySchema.parse({
        type: 'Polygon',
        coordinates: [
          [
            [-105.3, 39.7],
            [-105.2, 39.7],
            [-105.2, 39.8],
            [-105.3, 39.8],
          ],
        ],
      })
    ).toThrow();
  });

  it('rejects malformed coordinate nesting', () => {
    expect(() =>
      EvidenceGeometrySchema.parse({
        type: 'Polygon',
        coordinates: [[[-105.3, 39.7]]],
      })
    ).toThrow();
  });
});

describe('certainty vs confidence (R1.1)', () => {
  it('does not include HIGH in certainty enum', () => {
    expect(Object.values(EvidenceCertainty)).not.toContain('HIGH');
    expect(Object.values(EvidenceCertainty)).toEqual([
      'VERIFIED',
      'SUPPORTED',
      'REPORTED',
      'UNRESOLVED',
      'CONFLICTED',
      'STALE',
    ]);
  });

  it('accepts separate optional confidence HIGH', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-conf-high',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.FIELD_OBSERVATION,
        value: { kind: 'text', text: 'in-hand quartz' },
        authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        evidenceClass: EvidenceClass.DIRECT_OBSERVATION,
        certainty: EvidenceCertainty.REPORTED,
        confidence: EvidenceConfidenceLevel.HIGH,
      })
    );
    expect(parsed.certainty).toBe(EvidenceCertainty.REPORTED);
    expect(parsed.confidence).toBe(EvidenceConfidenceLevel.HIGH);
  });

  it('keeps certainty and confidence independent', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-indep',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'old map unit' },
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
        certainty: EvidenceCertainty.STALE,
        confidence: EvidenceConfidenceLevel.LOW,
      })
    );
    expect(parsed.certainty).toBe(EvidenceCertainty.STALE);
    expect(parsed.confidence).toBe(EvidenceConfidenceLevel.LOW);
  });

  it('rejects HIGH as certainty value', () => {
    const base = minimalAssertion({
      id: 'ev-bad-cert',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.GEOLOGY,
      value: { kind: 'text', text: 'x' },
    });
    expect(EvidenceAssertionSchema.safeParse({ ...base, certainty: 'HIGH' }).success).toBe(false);
  });
});

describe('prohibition semantics (R1.1)', () => {
  it('allows verified prohibition', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-verified-prohib',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-np-2' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.PROHIBITED,
        },
        certainty: EvidenceCertainty.VERIFIED,
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      })
    );
    expect(parsed.certainty).toBe(EvidenceCertainty.VERIFIED);
    if (parsed.value.kind === 'permission') {
      expect(parsed.value.status).toBe(EvidencePermissionStatus.PROHIBITED);
    }
  });

  it('allows reported prohibition', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-reported-prohib',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'area-comm' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.PROHIBITED,
        },
        certainty: EvidenceCertainty.REPORTED,
        authorityClass: EvidenceAuthorityClass.COMMUNITY_REPORT,
        evidenceClass: EvidenceClass.USER_REPORTED,
        source: {
          id: 'src-community',
          name: 'Community report',
          provider: 'rockhound-community',
          authorityClass: EvidenceAuthorityClass.COMMUNITY_REPORT,
          sourceType: 'USER_REPORT',
        },
      })
    );
    expect(parsed.certainty).toBe(EvidenceCertainty.REPORTED);
    if (parsed.value.kind === 'permission') {
      expect(parsed.value.status).toBe(EvidencePermissionStatus.PROHIBITED);
    }
  });
});

describe('authority model (R1.1)', () => {
  it('allows source and assertion authority to diverge for derived claims', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-derived-auth',
        subject: { kind: EvidenceSubjectKind.GEOLOGIC_UNIT, id: 'unit-1' },
        predicate: EvidencePredicate.DERIVED_GEOLOGICAL_INTERPRETATION,
        value: { kind: 'text', text: 'modeled contact from community points' },
        authorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
        evidenceClass: EvidenceClass.DERIVED,
        certainty: EvidenceCertainty.SUPPORTED,
        derivationMethod: 'spatial-interpolation-v1',
        source: {
          id: 'src-usgs',
          name: 'USGS SGMC',
          provider: 'USGS',
          authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
          sourceType: 'GEOLOGIC_MAP',
        },
      })
    );
    expect(parsed.source.authorityClass).toBe(EvidenceAuthorityClass.PRIMARY_AUTHORITY);
    expect(parsed.authorityClass).toBe(EvidenceAuthorityClass.MODEL_DERIVED);
  });

  it('rejects PRIMARY authority on direct user/community assertion without derivation', () => {
    const base = minimalAssertion({
      id: 'ev-bad-auth',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.FIELD_OBSERVATION,
      value: { kind: 'text', text: 'user saw quartz' },
      authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      evidenceClass: EvidenceClass.DIRECT_OBSERVATION,
      source: {
        id: 'src-user',
        name: 'Field app',
        provider: 'rockhound-web',
        authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        sourceType: 'FIELD_APP',
      },
    });
    expect(EvidenceAssertionSchema.safeParse(base).success).toBe(false);
  });

  it('allows PRIMARY authority on user source when derivationMethod is present', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-derived-user',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'community points aggregated' },
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
        evidenceClass: EvidenceClass.DERIVED,
        derivationMethod: 'community-consensus-v1',
        source: {
          id: 'src-user',
          name: 'Field app',
          provider: 'rockhound-web',
          authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
          sourceType: 'FIELD_APP',
        },
      })
    );
    expect(parsed.authorityClass).toBe(EvidenceAuthorityClass.PRIMARY_AUTHORITY);
  });
});

describe('predicate/value typing (R1.1)', () => {
  it('requires permission value for collecting permission predicate', () => {
    const base = minimalAssertion({
      id: 'ev-bad-pred',
      subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'a1' },
      predicate: EvidencePredicate.COLLECTING_PERMISSION,
      value: { kind: 'text', text: 'not a permission' },
    });
    expect(EvidenceAssertionSchema.safeParse(base).success).toBe(false);
  });

  it('accepts typed permission, geology, occurrence, field observation, and specimen values', () => {
    const cases: Array<Pick<EvidenceAssertion, 'predicate' | 'value'>> = [
      {
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.ALLOWED,
        },
      },
      {
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'geologic_unit', name: 'Limestone' },
      },
      {
        predicate: EvidencePredicate.OCCURRENCE,
        value: { kind: 'mineral_occurrence', species: 'fluorite' },
      },
      {
        predicate: EvidencePredicate.FIELD_OBSERVATION,
        value: { kind: 'text', text: 'banded chalcedony' },
      },
      {
        predicate: EvidencePredicate.SPECIMEN_IDENTITY,
        value: { kind: 'specimen', identity: 'chalcedony', locationId: 'loc-1' },
      },
    ];

    for (const [index, testCase] of cases.entries()) {
      const parsed = parseEvidenceAssertion(
        minimalAssertion({
          id: `ev-pred-val-${index}`,
          subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
          predicate: testCase.predicate,
          value: testCase.value,
        })
      );
      expect(parsed.value.kind).toBe(testCase.value.kind);
    }
  });
});

describe('authority vs certainty (legacy R1 coverage)', () => {
  it('allows high confidence on a user observation without upgrading certainty', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-auth-cert',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.FIELD_OBSERVATION,
        value: { kind: 'text', text: 'in-hand quartz' },
        authorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        certainty: EvidenceCertainty.REPORTED,
        confidence: EvidenceConfidenceLevel.HIGH,
        evidenceClass: EvidenceClass.DIRECT_OBSERVATION,
      })
    );
    expect(parsed.authorityClass).toBe(EvidenceAuthorityClass.USER_OBSERVATION);
    expect(parsed.confidence).toBe(EvidenceConfidenceLevel.HIGH);
    expect(parsed.certainty).toBe(EvidenceCertainty.REPORTED);
  });

  it('allows primary authority with stale certainty', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-stale-map',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: '1978 paper map' },
        authorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
        certainty: EvidenceCertainty.STALE,
        evidenceClass: EvidenceClass.IMPORTED_DATASET,
      })
    );
    expect(parsed.certainty).toBe(EvidenceCertainty.STALE);
  });

  it('does not treat PROHIBITED as a certainty member', () => {
    expect(Object.values(EvidenceCertainty)).not.toContain('PROHIBITED');
  });
});

describe('support and contradiction', () => {
  it('rejects self-support and self-contradiction', () => {
    const base = minimalAssertion({
      id: 'ev-self',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.GEOLOGY,
      value: { kind: 'text', text: 'x' },
    });
    expect(
      EvidenceAssertionSchema.safeParse({
        ...base,
        supportingEvidenceIds: ['ev-self'],
      }).success
    ).toBe(false);
    expect(
      EvidenceAssertionSchema.safeParse({
        ...base,
        contradictingEvidenceIds: ['ev-self'],
      }).success
    ).toBe(false);
  });

  it('rejects duplicate relation IDs and support/contradict overlap', () => {
    const base = minimalAssertion({
      id: 'ev-rel',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.GEOLOGY,
      value: { kind: 'text', text: 'x' },
    });
    expect(
      EvidenceAssertionSchema.safeParse({
        ...base,
        supportingEvidenceIds: ['ev-a', 'ev-a'],
      }).success
    ).toBe(false);
    expect(
      EvidenceAssertionSchema.safeParse({
        ...base,
        supportingEvidenceIds: ['ev-a'],
        contradictingEvidenceIds: ['ev-a'],
      }).success
    ).toBe(false);
  });
});

describe('temporal edge cases (R1.1)', () => {
  it('rejects validFrom after validTo', () => {
    const base = minimalAssertion({
      id: 'ev-range',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.ACCESS,
      value: {
        kind: 'permission',
        dimension: EvidencePermissionDimension.VISIT,
        status: EvidencePermissionStatus.ALLOWED,
      },
      validFrom: '2026-12-01T00:00:00.000Z',
      validTo: '2026-01-01T00:00:00.000Z',
    });
    expect(EvidenceAssertionSchema.safeParse(base).success).toBe(false);
  });

  it('allows validFrom equal to validTo (instantaneous validity)', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-instant',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.ACCESS,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.VISIT,
          status: EvidencePermissionStatus.ALLOWED,
        },
        validFrom: '2026-06-01T12:00:00.000Z',
        validTo: '2026-06-01T12:00:00.000Z',
      })
    );
    expect(parsed.validFrom).toBe(parsed.validTo);
  });

  it('allows observedAt after retrievedAt (sync lag / clock skew)', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-obs-after-ret',
        subject: { kind: EvidenceSubjectKind.FIELD_OBSERVATION, id: 'obs-1' },
        predicate: EvidencePredicate.FIELD_OBSERVATION,
        value: { kind: 'text', text: 'late-sync observation' },
        retrievedAt: '2026-04-12T16:20:00.000Z',
        observedAt: '2026-04-12T16:22:00.000Z',
      })
    );
    expect(Date.parse(parsed.observedAt!)).toBeGreaterThan(Date.parse(parsed.retrievedAt));
  });

  it('allows future retrievedAt (import / fixture tolerance)', () => {
    const parsed = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-future-ret',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'future fixture' },
        retrievedAt: '2099-01-01T00:00:00.000Z',
      })
    );
    expect(parsed.retrievedAt).toBe('2099-01-01T00:00:00.000Z');
  });

  it('allows open-ended validity and no validity interval', () => {
    const openEnded = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-open',
        subject: { kind: EvidenceSubjectKind.ACCESS_AREA, id: 'a1' },
        predicate: EvidencePredicate.COLLECTING_PERMISSION,
        value: {
          kind: 'permission',
          dimension: EvidencePermissionDimension.COLLECT,
          status: EvidencePermissionStatus.PROHIBITED,
        },
        validFrom: '1916-08-25T00:00:00.000Z',
      })
    );
    expect(openEnded.validTo).toBeUndefined();

    const noInterval = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-no-interval',
        subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
        predicate: EvidencePredicate.GEOLOGY,
        value: { kind: 'text', text: 'timeless map note' },
      })
    );
    expect(noInterval.validFrom).toBeUndefined();
    expect(noInterval.validTo).toBeUndefined();
  });
});

describe('invalid timestamps (legacy R1 coverage)', () => {
  it('rejects validFrom after validTo (duplicate guard)', () => {
    const base = minimalAssertion({
      id: 'ev-range-dup',
      subject: { kind: EvidenceSubjectKind.SITE, id: 's1' },
      predicate: EvidencePredicate.ACCESS,
      value: {
        kind: 'permission',
        dimension: EvidencePermissionDimension.VISIT,
        status: EvidencePermissionStatus.ALLOWED,
      },
      validFrom: '2026-12-01T00:00:00.000Z',
      validTo: '2026-01-01T00:00:00.000Z',
    });
    expect(EvidenceAssertionSchema.safeParse(base).success).toBe(false);
  });
});

describe('source descriptor', () => {
  it('parses a Layer-Registry-ready source primitive', () => {
    const parsed = EvidenceSourceDescriptorSchema.parse(SOURCE_USGS);
    expect(parsed.provider).toBe('USGS');
    expect(parsed.authorityClass).toBe(EvidenceAuthorityClass.PRIMARY_AUTHORITY);
  });
});

describe('JSON round trip', () => {
  it('round-trips a full assertion without class instances', () => {
    const original = parseEvidenceAssertion(
      minimalAssertion({
        id: 'ev-json',
        subject: { kind: EvidenceSubjectKind.ROUTE, id: 'rte-1' },
        predicate: EvidencePredicate.ROUTE_CONDITION,
        value: { kind: 'text', text: 'washout at mile 2' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-110.0, 32.0],
            [-110.1, 32.05],
          ],
        },
        supportingEvidenceIds: ['ev-photo-1'],
        provenance: {
          sourceSystem: 'blm-roads',
          sourceUri: 'urn:blm:road:rte-1',
          sourceRecordId: 'rec-99',
          ingestionMethod: 'IMPORTED_DATASET',
          transformVersion: 'uges-normalize-v1',
          contentHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          derivationChain: ['ev-raw-1'],
        },
      })
    );
    const json = serializeEvidenceAssertion(original);
    const round = parseEvidenceAssertion(JSON.parse(json));
    expect(round).toEqual(original);
    expect(json).toBe(serializeEvidenceAssertion(round));
  });
});

/**
 * Geological Layer Registry R1
 *
 * Production change that would fail these tests: allowing community layers to
 * claim PRIMARY authority, treating COLLECTION_DECISION_INPUT as permission,
 * mutating built-in definitions, or projecting a layer into a UGES assertion.
 */

import { describe, expect, it } from 'vitest';

import { EvidenceAuthorityClass } from './universal-geological-evidence-schema';
import {
  BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS,
  GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
  GeologicalLayerRegistry,
  LayerCategory,
  LayerCapability,
  LayerFreshnessExpiryEffect,
  LayerLimitationCode,
  LayerRetrievalMode,
  LayerUsage,
  createGeologicalLayerRegistry,
  evaluateFreshnessExpiryEffect,
  layerAuthorizesCollection,
  listLayerDefinitions,
  listLayersByCapability,
  listLayersByCategory,
  listLayersByUsage,
  projectLayerToUgesSource,
  validateLayerDefinition,
  type GeologicalLayerDefinition,
} from './geological-layer-registry';

function validLayer(
  overrides: Partial<GeologicalLayerDefinition> & Pick<GeologicalLayerDefinition, 'id' | 'category'>
): GeologicalLayerDefinition {
  return {
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'Test layer',
    provider: 'Test Provider',
    source: {
      provider: 'Test Provider',
      sourceFamily: 'TEST_FAMILY',
    },
    authority: {
      originKind: 'AGENCY',
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'CURRENT',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POLYGON',
    },
    access: {
      retrievalMode: LayerRetrievalMode.STATIC_FILE,
    },
    usage: {
      intendedUses: [LayerUsage.GEOLOGICAL_CONTEXT],
    },
    freshness: {
      class: 'LONG_LIVED',
      onExpiry: LayerFreshnessExpiryEffect.STALE,
    },
    capabilities: [LayerCapability.FEATURE_QUERY],
    limitations: [
      {
        code: LayerLimitationCode.INCOMPLETE_GEOGRAPHIC_COVERAGE,
      },
    ],
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    ...overrides,
  };
}

describe('Geological Layer Registry R1 schema version', () => {
  it('pins schemaVersion to 1', () => {
    expect(GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION).toBe(1);
    const parsed = validateLayerDefinition(
      validLayer({ id: 'lyr-min', category: LayerCategory.GEOLOGY })
    );
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe('valid layer definition', () => {
  it('accepts a minimal valid layer definition', () => {
    const result = validateLayerDefinition(
      validLayer({ id: 'lyr-ok', category: LayerCategory.GEOLOGY })
    );
    expect(result.id).toBe('lyr-ok');
    expect(result.category).toBe(LayerCategory.GEOLOGY);
  });

  it('rejects invalid category', () => {
    expect(() =>
      validateLayerDefinition({
        ...validLayer({ id: 'lyr-bad-cat', category: LayerCategory.GEOLOGY }),
        category: 'NOT_A_CATEGORY',
      })
    ).toThrow();
  });
});

describe('registry construction', () => {
  it('rejects duplicate layer IDs', () => {
    const a = validLayer({ id: 'dup', category: LayerCategory.GEOLOGY });
    const b = validLayer({
      id: 'dup',
      category: LayerCategory.FAULT_STRUCTURE,
      name: 'Other',
    });
    expect(() => createGeologicalLayerRegistry([a, b])).toThrow(/duplicate/i);
  });

  it('lists definitions in deterministic id order', () => {
    const registry = createGeologicalLayerRegistry([
      validLayer({ id: 'z-layer', category: LayerCategory.WEATHER }),
      validLayer({ id: 'a-layer', category: LayerCategory.GEOLOGY }),
      validLayer({ id: 'm-layer', category: LayerCategory.IMAGERY }),
    ]);
    expect(listLayerDefinitions(registry).map((layer) => layer.id)).toEqual([
      'a-layer',
      'm-layer',
      'z-layer',
    ]);
  });
});

describe('community authority restriction', () => {
  it('rejects user/community layers claiming PRIMARY or SECONDARY authority', () => {
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-community-primary',
          category: LayerCategory.FIELD_OBSERVATION,
          authority: {
            originKind: 'COMMUNITY',
            sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
          },
          access: { retrievalMode: LayerRetrievalMode.USER_GENERATED },
        })
      )
    ).toThrow();

    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-user-secondary',
          category: LayerCategory.SPECIMEN,
          authority: {
            originKind: 'USER',
            sourceAuthorityClass: EvidenceAuthorityClass.SECONDARY_AUTHORITY,
          },
          access: { retrievalMode: LayerRetrievalMode.USER_GENERATED },
        })
      )
    ).toThrow();
  });

  it('allows community layers with USER_OBSERVATION authority', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-community-ok',
        category: LayerCategory.FIELD_OBSERVATION,
        authority: {
          originKind: 'USER',
          sourceAuthorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        },
        access: { retrievalMode: LayerRetrievalMode.USER_GENERATED },
      })
    );
    expect(parsed.authority.sourceAuthorityClass).toBe(EvidenceAuthorityClass.USER_OBSERVATION);
  });

  it('allows derived products from community inputs only with MODEL_DERIVED + derivation metadata', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-derived-community',
        category: LayerCategory.DERIVED_ANALYSIS,
        authority: {
          originKind: 'MODEL',
          sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
        },
        derivation: {
          processId: 'community-consensus',
          processVersion: 'v1',
          inputLayerIds: ['lyr-community-ok'],
          derivationMethod: 'spatial-consensus-v1',
        },
      })
    );
    expect(parsed.authority.sourceAuthorityClass).toBe(EvidenceAuthorityClass.MODEL_DERIVED);
  });
});

describe('freshness policy', () => {
  it('validates freshness classes and expiry effects', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-fresh',
        category: LayerCategory.CLOSURE,
        freshness: {
          class: 'SHORT_LIVED',
          maxAgeHours: 24,
          onExpiry: LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
        },
      })
    );
    expect(parsed.freshness.class).toBe('SHORT_LIVED');
    expect(evaluateFreshnessExpiryEffect(parsed)).toBe(
      LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED
    );
  });

  it('rejects non-positive maxAgeHours', () => {
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-bad-ttl',
          category: LayerCategory.WEATHER,
          freshness: {
            class: 'VERY_SHORT_LIVED',
            maxAgeHours: 0,
            onExpiry: LayerFreshnessExpiryEffect.STALE,
          },
        })
      )
    ).toThrow();
  });

  it('does not delete or invalidate historical evidence on expiry', () => {
    const layer = validateLayerDefinition(
      validLayer({
        id: 'lyr-stale-policy',
        category: LayerCategory.HISTORICAL_MAP,
        freshness: {
          class: 'LONG_LIVED',
          onExpiry: LayerFreshnessExpiryEffect.STALE,
        },
      })
    );
    expect(evaluateFreshnessExpiryEffect(layer)).not.toBe('DELETE');
    expect(evaluateFreshnessExpiryEffect(layer)).not.toBe('INVALIDATE_EVIDENCE');
    expect([
      LayerFreshnessExpiryEffect.STALE,
      LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
    ]).toContain(evaluateFreshnessExpiryEffect(layer));
  });
});

describe('temporal coverage', () => {
  it('allows open-ended temporal coverage', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-open-time',
        category: LayerCategory.GEOLOGY,
        temporal: {
          coverageMode: 'BOTH',
          coverageFrom: '1879-01-01T00:00:00.000Z',
          publishedAt: '2020-01-01T00:00:00.000Z',
        },
      })
    );
    expect(parsed.temporal.coverageTo).toBeUndefined();
  });

  it('rejects coverageFrom after coverageTo', () => {
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-bad-time',
          category: LayerCategory.GEOLOGY,
          temporal: {
            coverageMode: 'HISTORICAL',
            coverageFrom: '2020-01-01T00:00:00.000Z',
            coverageTo: '1990-01-01T00:00:00.000Z',
          },
        })
      )
    ).toThrow();
  });
});

describe('spatial profile', () => {
  it('allows omitted map scale for observations and imagery', () => {
    const observation = validateLayerDefinition(
      validLayer({
        id: 'lyr-obs-noscale',
        category: LayerCategory.FIELD_OBSERVATION,
        authority: {
          originKind: 'USER',
          sourceAuthorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        },
        access: { retrievalMode: LayerRetrievalMode.USER_GENERATED },
        spatial: {
          crs: 'EPSG:4326',
          geometrySupport: 'POINT',
          positionalAccuracyMeters: 15,
        },
      })
    );
    expect(observation.spatial.nominalScaleDenominator).toBeUndefined();

    const imagery = validateLayerDefinition(
      validLayer({
        id: 'lyr-img-noscale',
        category: LayerCategory.IMAGERY,
        spatial: {
          crs: 'EPSG:4326',
          geometrySupport: 'RASTER',
          spatialResolutionMeters: 10,
        },
      })
    );
    expect(imagery.spatial.nominalScaleDenominator).toBeUndefined();
  });

  it('rejects negative scale or resolution', () => {
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-neg-scale',
          category: LayerCategory.GEOLOGY,
          spatial: {
            crs: 'EPSG:4326',
            geometrySupport: 'POLYGON',
            nominalScaleDenominator: -24000,
          },
        })
      )
    ).toThrow();
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-neg-res',
          category: LayerCategory.TERRAIN_ELEVATION,
          spatial: {
            crs: 'EPSG:4326',
            geometrySupport: 'RASTER',
            spatialResolutionMeters: -1,
          },
        })
      )
    ).toThrow();
  });
});

describe('licensing unknown-safe defaults', () => {
  it('represents unknown license/caching without guessing permission', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-license-unknown',
        category: LayerCategory.GEOLOGY,
      })
    );
    expect(parsed.licensing.offlineCaching).toBe('UNKNOWN');
    expect(parsed.licensing.redistribution).toBe('UNKNOWN');
    expect(parsed.licensing.derivativeUse).toBe('UNKNOWN');
    expect(parsed.licensing.attributionRequired).toBe('UNKNOWN');
  });
});

describe('derived layers', () => {
  it('requires derivation metadata for DERIVED_ANALYSIS', () => {
    expect(() =>
      validateLayerDefinition(
        validLayer({
          id: 'lyr-derived-missing',
          category: LayerCategory.DERIVED_ANALYSIS,
          authority: {
            originKind: 'MODEL',
            sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
          },
        })
      )
    ).toThrow();
  });

  it('treats derived input layer refs as reference-only', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-derived-refs',
        category: LayerCategory.DERIVED_ANALYSIS,
        authority: {
          originKind: 'MODEL',
          sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
        },
        derivation: {
          processId: 'interp-v1',
          processVersion: '1.0.0',
          inputLayerIds: ['does-not-exist-in-r1'],
          derivationMethod: 'kriging-v1',
        },
      })
    );
    expect(parsed.derivation?.inputLayerIds).toContain('does-not-exist-in-r1');
    const registry = createGeologicalLayerRegistry([parsed]);
    expect(registry.getLayerDefinition('does-not-exist-in-r1')).toBeUndefined();
  });
});

describe('limitations', () => {
  it('round-trips machine-readable limitation codes', () => {
    const parsed = validateLayerDefinition(
      validLayer({
        id: 'lyr-limits',
        category: LayerCategory.LAND_OWNERSHIP,
        limitations: [
          {
            code: LayerLimitationCode.NOT_SUITABLE_FOR_PARCEL_SCALE,
            description: 'County generalized polygons',
          },
          { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
        ],
      })
    );
    expect(parsed.limitations.map((item) => item.code)).toEqual([
      LayerLimitationCode.NOT_SUITABLE_FOR_PARCEL_SCALE,
      LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS,
    ]);
  });
});

describe('filtering', () => {
  it('filters by category, capability, and usage deterministically', () => {
    const registry = createGeologicalLayerRegistry([
      validLayer({
        id: 'lyr-geo',
        category: LayerCategory.GEOLOGY,
        capabilities: [LayerCapability.FEATURE_QUERY, LayerCapability.BBOX_QUERY],
        usage: { intendedUses: [LayerUsage.GEOLOGICAL_CONTEXT] },
      }),
      validLayer({
        id: 'lyr-fire',
        category: LayerCategory.FIRE,
        capabilities: [LayerCapability.TILE_RENDER],
        usage: { intendedUses: [LayerUsage.SAFETY_DECISION_INPUT] },
        freshness: {
          class: 'VERY_SHORT_LIVED',
          maxAgeHours: 6,
          onExpiry: LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
        },
      }),
    ]);
    expect(listLayersByCategory(registry, LayerCategory.GEOLOGY).map((l) => l.id)).toEqual([
      'lyr-geo',
    ]);
    expect(listLayersByCapability(registry, LayerCapability.TILE_RENDER).map((l) => l.id)).toEqual([
      'lyr-fire',
    ]);
    expect(listLayersByUsage(registry, LayerUsage.GEOLOGICAL_CONTEXT).map((l) => l.id)).toEqual([
      'lyr-geo',
    ]);
  });
});

describe('immutability', () => {
  it('does not mutate built-in definitions via returned lists', () => {
    const registry = createGeologicalLayerRegistry(BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS);
    const listed = listLayerDefinitions(registry);
    const originalId = listed[0]?.id;
    listed[0]!.name = 'MUTATED';
    listed[0]!.capabilities.push(LayerCapability.CHANGE_DETECTION);
    expect(registry.getLayerDefinition(originalId!)?.name).not.toBe('MUTATED');
    expect(BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS[0]?.name).not.toBe('MUTATED');
  });
});

describe('UGES integration boundary', () => {
  it('projects layer source metadata into a UGES source descriptor', () => {
    const layer = validateLayerDefinition(
      validLayer({
        id: 'usgs-ngmdb-geologic-maps',
        category: LayerCategory.GEOLOGY,
        name: 'USGS geologic maps',
        provider: 'USGS',
        source: {
          provider: 'USGS',
          sourceFamily: 'NGMDB',
          canonicalUri: 'https://ngmdb.usgs.gov/',
        },
        licensing: {
          licenseId: 'USGS-public-domain',
          attributionRequired: 'UNKNOWN',
          redistribution: 'UNKNOWN',
          offlineCaching: 'UNKNOWN',
          derivativeUse: 'UNKNOWN',
        },
      })
    );
    const source = projectLayerToUgesSource(layer);
    expect(source.id).toBe(layer.id);
    expect(source.authorityClass).toBe(layer.authority.sourceAuthorityClass);
    expect(source.provider).toBe('USGS');
    expect(source).not.toHaveProperty('predicate');
    expect(source).not.toHaveProperty('subject');
    expect(source).not.toHaveProperty('certainty');
  });

  it('does not generate a UGES assertion from a layer definition alone', () => {
    const layer = validateLayerDefinition(
      validLayer({ id: 'lyr-no-assertion', category: LayerCategory.GEOLOGY })
    );
    const projected = projectLayerToUgesSource(layer) as Record<string, unknown>;
    expect(projected.schemaVersion).toBeUndefined();
    expect(projected.predicate).toBeUndefined();
    expect(projected.value).toBeUndefined();
    expect(layerAuthorizesCollection(layer)).toBe(false);
  });
});

describe('collection-decision boundary', () => {
  it('COLLECTION_DECISION_INPUT does not imply collection permission', () => {
    const layer = validateLayerDefinition(
      validLayer({
        id: 'lyr-claims',
        category: LayerCategory.MINING_CLAIM,
        usage: {
          intendedUses: [LayerUsage.COLLECTION_DECISION_INPUT, LayerUsage.DISCOVERY],
        },
        limitations: [{ code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS }],
      })
    );
    expect(layer.usage.intendedUses).toContain(LayerUsage.COLLECTION_DECISION_INPUT);
    expect(layerAuthorizesCollection(layer)).toBe(false);
  });
});

describe('built-in definitions', () => {
  it('validates representative built-in metadata definitions', () => {
    const registry = createGeologicalLayerRegistry(BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS);
    const ids = listLayerDefinitions(registry).map((layer) => layer.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(
      expect.arrayContaining([
        'usgs-ngmdb-geologic-maps',
        'usgs-mrds-mineral-occurrence',
        'usgs-3dep-elevation',
        'blm-mlrs-mining-claims',
        'nws-alerts-weather',
        'nasa-firms-fire',
        'rockhound-field-observations',
      ])
    );
    for (const layer of listLayerDefinitions(registry)) {
      expect(validateLayerDefinition(layer).id).toBe(layer.id);
    }
    const observations = registry.getLayerDefinition('rockhound-field-observations');
    expect(observations?.authority.sourceAuthorityClass).not.toBe(
      EvidenceAuthorityClass.PRIMARY_AUTHORITY
    );
  });
});

describe('GeologicalLayerRegistry lookup', () => {
  it('returns undefined for unknown ids', () => {
    const registry = createGeologicalLayerRegistry([
      validLayer({ id: 'known', category: LayerCategory.HYDROLOGY }),
    ]);
    expect(registry.getLayerDefinition('missing')).toBeUndefined();
  });
});

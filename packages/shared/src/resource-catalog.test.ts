/**
 * Resource Catalog R1
 *
 * Production change that would fail these tests: collapsing catalog records into
 * UGES assertions, allowing user-generated PRIMARY authority, treating regulation
 * documents as executable law, or enforcing referential integrity on missing IDs.
 */

import { describe, expect, it } from 'vitest';

import { EvidenceAuthorityClass } from './universal-geological-evidence-schema';
import {
  BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS,
  createGeologicalLayerRegistry,
  listResourceIdsForLayer,
  validateLayerDefinition,
  type GeologicalLayerDefinition,
} from './geological-layer-registry';
import {
  BUILTIN_RESOURCE_RECORDS,
  RESOURCE_CATALOG_SCHEMA_VERSION,
  ResourceAccessMechanism,
  ResourceCapability,
  ResourceLimitationCode,
  ResourceRelationshipKind,
  ResourceType,
  ResourceUsage,
  createResourceCatalog,
  layerAuthorizesCollectionFromResource,
  listLayersReferencingResource,
  listResourceRecords,
  listResourcesByCapability,
  listResourcesByProvider,
  listResourcesByType,
  listResourcesByUsage,
  listResourcesReferencing,
  projectResourceToUgesSource,
  regulationDocumentIsExecutableLaw,
  resolveResourcesForLayer,
  resourceAuthorizesCollection,
  validateResourceRecord,
  type ResourceRecord,
} from './resource-catalog';

function validResource(
  overrides: Partial<ResourceRecord> & Pick<ResourceRecord, 'id' | 'type'>
): ResourceRecord {
  return {
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'Test resource',
    provider: { id: 'prov-test', name: 'Test Provider' },
    authority: {
      originKind: 'AGENCY',
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    access: {
      mechanism: ResourceAccessMechanism.STATIC_FILE,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    version: {
      versionId: 'v1',
      deprecated: false,
    },
    relationships: [],
    limitations: [{ code: ResourceLimitationCode.UNVERIFIED_CURRENCY }],
    capabilities: [ResourceCapability.SEARCH],
    usage: { intendedUses: [ResourceUsage.DISCOVERY] },
    ...overrides,
  };
}

describe('Resource Catalog R1 schema version', () => {
  it('pins schemaVersion to 1', () => {
    expect(RESOURCE_CATALOG_SCHEMA_VERSION).toBe(1);
    const parsed = validateResourceRecord(
      validResource({ id: 'res-min', type: ResourceType.DOCUMENT })
    );
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe('valid resource accepted', () => {
  it('accepts a minimal valid resource', () => {
    const parsed = validateResourceRecord(
      validResource({ id: 'res-ok', type: ResourceType.DOCUMENT })
    );
    expect(parsed.id).toBe('res-ok');
  });

  it('rejects invalid enum/type', () => {
    expect(() =>
      validateResourceRecord({
        ...validResource({ id: 'res-bad-type', type: ResourceType.DOCUMENT }),
        type: 'NOT_A_TYPE',
      })
    ).toThrow();
  });
});

describe('catalog construction', () => {
  it('rejects duplicate canonical IDs', () => {
    expect(() =>
      createResourceCatalog([
        validResource({ id: 'dup', type: ResourceType.API }),
        validResource({ id: 'dup', type: ResourceType.MAP, name: 'Other' }),
      ])
    ).toThrow(/duplicate/i);
  });

  it('lists records in deterministic id order', () => {
    const catalog = createResourceCatalog([
      validResource({ id: 'z-res', type: ResourceType.API }),
      validResource({ id: 'a-res', type: ResourceType.MAP }),
      validResource({ id: 'm-res', type: ResourceType.DEM }),
    ]);
    expect(listResourceRecords(catalog).map((record) => record.id)).toEqual([
      'a-res',
      'm-res',
      'z-res',
    ]);
  });
});

describe('community authority restriction', () => {
  it('rejects user-generated authoritative self-promotion', () => {
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-user-primary',
          type: ResourceType.USER_GENERATED_DATASET,
          authority: {
            originKind: 'USER',
            sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
          },
          access: {
            mechanism: ResourceAccessMechanism.USER_GENERATED,
            authenticationRequired: 'UNKNOWN',
          },
        })
      )
    ).toThrow();
  });
});

describe('version metadata', () => {
  it('validates version identifier separate from canonical ID', () => {
    const parsed = validateResourceRecord(
      validResource({
        id: 'res-ngmdb',
        type: ResourceType.MAP,
        version: {
          versionId: '2020-compilation',
          publishedAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2021-06-01T00:00:00.000Z',
          supersedes: 'res-ngmdb-old',
          deprecated: false,
        },
        identifiers: {
          versionIdentifier: '2020-compilation',
          doi: '10.5066/example',
        },
      })
    );
    expect(parsed.id).toBe('res-ngmdb');
    expect(parsed.version.versionId).toBe('2020-compilation');
    expect(parsed.id).not.toBe(parsed.version.versionId);
  });
});

describe('temporal coverage', () => {
  it('allows open-ended temporal coverage and future timestamps', () => {
    const parsed = validateResourceRecord(
      validResource({
        id: 'res-open-time',
        type: ResourceType.GEOSPATIAL_DATASET,
        temporal: {
          coverageFrom: '1879-01-01T00:00:00.000Z',
          publishedAt: '2099-01-01T00:00:00.000Z',
        },
      })
    );
    expect(parsed.temporal?.coverageTo).toBeUndefined();
  });

  it('rejects invalid temporal interval', () => {
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-bad-time',
          type: ResourceType.GEOSPATIAL_DATASET,
          temporal: {
            coverageFrom: '2020-01-01T00:00:00.000Z',
            coverageTo: '1990-01-01T00:00:00.000Z',
          },
        })
      )
    ).toThrow();
  });
});

describe('spatial profile', () => {
  it('allows omitted spatial profile', () => {
    const parsed = validateResourceRecord(
      validResource({ id: 'res-doc-noscale', type: ResourceType.REGULATION_DOCUMENT })
    );
    expect(parsed.spatial).toBeUndefined();
  });

  it('rejects negative scale or resolution', () => {
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-neg-scale',
          type: ResourceType.MAP,
          spatial: { crs: 'EPSG:4326', nominalScaleDenominator: -24000 },
        })
      )
    ).toThrow();
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-neg-res',
          type: ResourceType.DEM,
          spatial: { crs: 'EPSG:4326', spatialResolutionMeters: -1 },
        })
      )
    ).toThrow();
  });
});

describe('licensing unknown-safe defaults', () => {
  it('preserves unknown license state without guessing', () => {
    const parsed = validateResourceRecord(
      validResource({ id: 'res-license', type: ResourceType.API })
    );
    expect(parsed.licensing.offlineCaching).toBe('UNKNOWN');
    expect(parsed.licensing.redistribution).toBe('UNKNOWN');
    expect(parsed.licensing.derivativeUse).toBe('UNKNOWN');
  });
});

describe('relationships', () => {
  it('rejects self-links and duplicate equivalent links', () => {
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-self',
          type: ResourceType.API,
          relationships: [{ kind: ResourceRelationshipKind.PART_OF, targetResourceId: 'res-self' }],
        })
      )
    ).toThrow();
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-dup-rel',
          type: ResourceType.API,
          relationships: [
            { kind: ResourceRelationshipKind.MIRRORS, targetResourceId: 'res-other' },
            { kind: ResourceRelationshipKind.MIRRORS, targetResourceId: 'res-other' },
          ],
        })
      )
    ).toThrow();
  });

  it('allows missing relationship targets in R1', () => {
    const catalog = createResourceCatalog([
      validResource({
        id: 'res-rel',
        type: ResourceType.DERIVED_PRODUCT,
        authority: {
          originKind: 'MODEL',
          sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
        },
        derivation: {
          processId: 'slope-v1',
          processVersion: '1.0.0',
          inputResourceIds: ['missing-input'],
          derivationMethod: 'horn-slope',
        },
        relationships: [
          { kind: ResourceRelationshipKind.DERIVED_FROM, targetResourceId: 'does-not-exist' },
        ],
      }),
    ]);
    expect(catalog.getResourceRecord('does-not-exist')).toBeUndefined();
    expect(listResourcesReferencing(catalog, 'does-not-exist').map((r) => r.id)).toEqual([
      'res-rel',
    ]);
  });
});

describe('filtering', () => {
  it('filters by type, capability, provider, and usage deterministically', () => {
    const catalog = createResourceCatalog([
      validResource({
        id: 'res-geo',
        type: ResourceType.GEOSPATIAL_DATASET,
        provider: { id: 'usgs', name: 'USGS' },
        capabilities: [ResourceCapability.FEATURE_QUERY, ResourceCapability.BBOX_QUERY],
        usage: { intendedUses: [ResourceUsage.GEOLOGICAL_CONTEXT] },
      }),
      validResource({
        id: 'res-fire',
        type: ResourceType.STAC_CATALOG,
        provider: { id: 'nasa', name: 'NASA' },
        capabilities: [ResourceCapability.TILE_RENDER],
        usage: { intendedUses: [ResourceUsage.SAFETY_DECISION_INPUT] },
      }),
    ]);
    expect(listResourcesByType(catalog, ResourceType.GEOSPATIAL_DATASET).map((r) => r.id)).toEqual([
      'res-geo',
    ]);
    expect(
      listResourcesByCapability(catalog, ResourceCapability.TILE_RENDER).map((r) => r.id)
    ).toEqual(['res-fire']);
    expect(listResourcesByProvider(catalog, 'usgs').map((r) => r.id)).toEqual(['res-geo']);
    expect(
      listResourcesByUsage(catalog, ResourceUsage.GEOLOGICAL_CONTEXT).map((r) => r.id)
    ).toEqual(['res-geo']);
  });
});

describe('immutability', () => {
  it('does not mutate built-in records via returned lists', () => {
    const catalog = createResourceCatalog(BUILTIN_RESOURCE_RECORDS);
    const listed = listResourceRecords(catalog);
    const originalId = listed[0]?.id;
    listed[0]!.name = 'MUTATED';
    listed[0]!.capabilities.push(ResourceCapability.CHANGE_DETECTION);
    expect(catalog.getResourceRecord(originalId!)?.name).not.toBe('MUTATED');
    expect(BUILTIN_RESOURCE_RECORDS[0]?.name).not.toBe('MUTATED');
  });
});

describe('Geological Layer Registry integration', () => {
  it('allows a layer to reference resource IDs without merging catalogs', () => {
    const layer = validateLayerDefinition({
      ...BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS[0],
      id: 'lyr-with-res',
      resourceRecordIds: ['res-usgs-ngmdb', 'missing-resource'],
    } satisfies GeologicalLayerDefinition);
    expect(listResourceIdsForLayer(layer)).toEqual(['res-usgs-ngmdb', 'missing-resource']);

    const catalog = createResourceCatalog(BUILTIN_RESOURCE_RECORDS);
    const resolved = resolveResourcesForLayer(layer, catalog);
    expect(resolved.found.map((record) => record.id)).toContain('res-usgs-ngmdb');
    expect(resolved.missing).toContain('missing-resource');
  });

  it('does not enforce referential integrity for missing resource IDs', () => {
    const layer = validateLayerDefinition({
      ...BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS[0],
      id: 'lyr-missing-res',
      resourceRecordIds: ['not-in-catalog'],
    });
    expect(() => createGeologicalLayerRegistry([layer])).not.toThrow();
    const registry = createGeologicalLayerRegistry([layer]);
    expect(
      listLayersReferencingResource(registry, 'not-in-catalog').map((item) => item.id)
    ).toEqual(['lyr-missing-res']);
  });
});

describe('UGES boundary', () => {
  it('does not generate a UGES assertion from a resource record', () => {
    const record = validateResourceRecord(
      validResource({ id: 'res-no-assertion', type: ResourceType.MAP })
    );
    const projected = projectResourceToUgesSource(record) as Record<string, unknown>;
    expect(projected.schemaVersion).toBeUndefined();
    expect(projected.predicate).toBeUndefined();
    expect(projected.value).toBeUndefined();
    expect(projected.certainty).toBeUndefined();
  });

  it('projects source-descriptor metadata preserving authority', () => {
    const record = validateResourceRecord(
      validResource({
        id: 'res-usgs-3dep',
        type: ResourceType.DEM,
        name: 'USGS 3DEP',
        provider: { id: 'usgs', name: 'USGS' },
        identifiers: { uri: 'https://www.usgs.gov/3d-elevation-program' },
      })
    );
    const source = projectResourceToUgesSource(record);
    expect(source.id).toBe(record.id);
    expect(source.authorityClass).toBe(record.authority.sourceAuthorityClass);
    expect(source.provider).toBe('USGS');
  });
});

describe('decision boundaries', () => {
  it('community resource cannot authorize collecting', () => {
    const record = validateResourceRecord(
      validResource({
        id: 'res-community',
        type: ResourceType.USER_GENERATED_DATASET,
        authority: {
          originKind: 'USER',
          sourceAuthorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
        },
        access: {
          mechanism: ResourceAccessMechanism.USER_GENERATED,
          authenticationRequired: 'UNKNOWN',
        },
        usage: { intendedUses: [ResourceUsage.COLLECTION_DECISION_INPUT] },
      })
    );
    expect(resourceAuthorizesCollection(record)).toBe(false);
    expect(layerAuthorizesCollectionFromResource(record)).toBe(false);
  });

  it('regulation document metadata is not executable law', () => {
    const record = validateResourceRecord(
      validResource({
        id: 'res-reg',
        type: ResourceType.REGULATION_DOCUMENT,
        name: 'Example collecting regulation (metadata only)',
        usage: { intendedUses: [ResourceUsage.COLLECTION_DECISION_INPUT] },
        limitations: [{ code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE }],
      })
    );
    expect(regulationDocumentIsExecutableLaw(record)).toBe(false);
  });
});

describe('derived product provenance', () => {
  it('requires derivation metadata on derived products', () => {
    expect(() =>
      validateResourceRecord(
        validResource({
          id: 'res-derived-missing',
          type: ResourceType.DERIVED_PRODUCT,
          authority: {
            originKind: 'MODEL',
            sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
          },
        })
      )
    ).toThrow();
  });

  it('records derivation provenance', () => {
    const parsed = validateResourceRecord(
      validResource({
        id: 'res-derived-ok',
        type: ResourceType.DERIVED_PRODUCT,
        authority: {
          originKind: 'MODEL',
          sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
        },
        derivation: {
          processId: 'terrain-analysis',
          processVersion: '1.0.0',
          inputResourceIds: ['res-usgs-3dep'],
          derivationMethod: 'slope-aspect-v1',
        },
      })
    );
    expect(parsed.derivation?.processId).toBe('terrain-analysis');
    expect(parsed.derivation?.inputResourceIds).toContain('res-usgs-3dep');
  });
});

describe('built-in resources', () => {
  it('validates representative built-in metadata definitions', () => {
    const catalog = createResourceCatalog();
    const ids = listResourceRecords(catalog).map((record) => record.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(
      expect.arrayContaining([
        'res-usgs-ngmdb',
        'res-usgs-mrds',
        'res-usgs-3dep',
        'res-blm-mlrs',
        'res-nws-alerts',
        'res-nasa-firms',
        'res-regulation-document-example',
        'res-stac-imagery-example',
        'res-local-field-observations',
        'res-derived-terrain-analysis',
      ])
    );
    for (const record of listResourceRecords(catalog)) {
      expect(validateResourceRecord(record).id).toBe(record.id);
    }
  });
});

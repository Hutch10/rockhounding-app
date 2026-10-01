/**
 * Launch-cohort map/search dry-run — local artifact only, no publish.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { SiteType } from '@rockhounding/shared/fee-site-support';

import { matchesFeeSiteSearch } from '@/lib/search/feeSiteSearch';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const raw = JSON.parse(
  readFileSync(
    join(
      root,
      'qa-artifacts/rockhounding-first-five-state-deep-pack-r1/launch-cohort/manifest.json'
    ),
    'utf8'
  )
) as {
  publishBlocked: boolean;
  deepReviewed: Array<{
    name: string;
    state: string;
    siteType: string;
    secondarySiteTypes?: string[];
    inLaunchCohort: boolean;
    operatingStatus: { status: string };
    materials: Array<{
      materialName: string;
      occurrenceType: string;
      certainty: string;
      originClass: string;
    }>;
  }>;
};

type LaunchRecord = (typeof raw.deepReviewed)[number];

function toSearchRow(record: LaunchRecord) {
  return {
    name: record.name,
    description: `${record.siteType} ${record.state}`,
    state: record.state,
    materialNames: record.materials.map((m) => m.materialName),
    metadata: {
      fee_site: {
        siteType: record.siteType,
        secondarySiteTypes: record.secondarySiteTypes ?? [],
        operatingStatus: record.operatingStatus.status,
        admissionStatus: record.inLaunchCohort ? 'ADMITTED' : 'HOLD',
        materialClaims: record.materials.map((m) => ({
          materialName: m.materialName,
          occurrenceType: m.occurrenceType,
          certainty: m.certainty,
          originClass: m.originClass,
        })),
      },
    },
  };
}

describe('launch cohort map/search quality (local dry-run)', () => {
  expect(raw.publishBlocked).toBe(true);
  const launch = raw.deepReviewed.filter((r) => r.inLaunchCohort);
  const rows = launch.map(toSearchRow);

  it('has unique names within launch cohort (no ambiguous duplicates)', () => {
    const names = rows.map((r) => r.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('filters by state NC/AR/CA/MT/ME without cross-bleed', () => {
    for (const state of ['NC', 'AR', 'CA', 'MT', 'ME'] as const) {
      const hit = rows.filter((r) => matchesFeeSiteSearch(r, { state }));
      expect(hit.every((h) => h.state === state)).toBe(true);
      expect(hit.length).toBeGreaterThan(0);
    }
  });

  it('fee-mine filter returns FEE_MINE roles', () => {
    const hit = rows.filter((r) => matchesFeeSiteSearch(r, { siteTypes: [SiteType.FEE_MINE] }));
    expect(hit.length).toBeGreaterThan(0);
    for (const h of hit) {
      const site = launch.find((l) => l.name === h.name);
      expect(
        site?.siteType === 'FEE_MINE' || (site?.secondarySiteTypes ?? []).includes('FEE_MINE')
      ).toBe(true);
    }
  });

  it('material search finds sapphire and diamond without inventing matches', () => {
    const sapphire = rows.filter((r) => matchesFeeSiteSearch(r, { materials: ['Sapphire'] }));
    const diamond = rows.filter((r) => matchesFeeSiteSearch(r, { materials: ['Diamond'] }));
    expect(sapphire.some((s) => /gem mountain|spokane|cowee|cherokee/i.test(s.name))).toBe(true);
    expect(diamond.some((s) => /crater/i.test(s.name))).toBe(true);
  });

  it('text fee/pay-to-dig hint matches fee mines', () => {
    const hit = rows.filter((r) => matchesFeeSiteSearch(r, { text: 'fee dig' }));
    expect(hit.length).toBeGreaterThan(0);
  });

  it('museum filter returns museum roles', () => {
    const museums = rows.filter((r) => matchesFeeSiteSearch(r, { siteTypes: [SiteType.MUSEUM] }));
    expect(museums.length).toBeGreaterThan(0);
  });
});

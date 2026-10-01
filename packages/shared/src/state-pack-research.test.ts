/**
 * First-five state pack research — schema + normalization gates.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  FIRST_FIVE_STATE_CODES,
  STATE_PACK_NORMALIZATION_CONTRACT,
  StatePackSchema,
  assertNoShadowArchitecture,
  summarizeStatePack,
  type StatePack,
} from './state-pack-research';

const here = dirname(fileURLToPath(import.meta.url));
const packsDir = join(
  here,
  '..',
  '..',
  '..',
  'qa-artifacts',
  'rockhounding-first-claim-state-pack-prep-r1',
  'packs'
);

function loadPack(code: string): StatePack {
  const raw = JSON.parse(readFileSync(join(packsDir, `${code.toLowerCase()}.json`), 'utf8'));
  return StatePackSchema.parse(raw);
}

describe('state-pack-research first five', () => {
  it('loads and validates NC/AR/CA/MT/ME packs with publishBlocked', () => {
    const packs = FIRST_FIVE_STATE_CODES.map((c) => loadPack(c));
    expect(packs).toHaveLength(5);
    for (const pack of packs) {
      expect(pack.publishBlocked).toBe(true);
      expect(pack.candidates.length).toBeGreaterThanOrEqual(10);
      expect(pack.candidates.length).toBeLessThanOrEqual(20);
      expect(pack.readiness).toMatch(/CORE_READY|RESEARCHING|DEEP_READY/);
      expect(pack.legal.geologicalSurvey.length).toBeGreaterThan(5);
      expect(pack.legal.freshnessPolicy.length).toBeGreaterThan(5);
    }
  });

  it('uses shared normalization contract — no shadow enums', () => {
    const packs = FIRST_FIVE_STATE_CODES.map((c) => loadPack(c));
    expect(assertNoShadowArchitecture(packs)).toEqual([]);
    expect(STATE_PACK_NORMALIZATION_CONTRACT.siteTypes).toContain('FEE_MINE');
    expect(STATE_PACK_NORMALIZATION_CONTRACT.admissionPipeline).toContain('HOLD');
    expect(STATE_PACK_NORMALIZATION_CONTRACT.claimability).toContain('CLAIMABLE_WITH_REVIEW');
    for (const pack of packs) {
      for (const c of pack.candidates) {
        expect(STATE_PACK_NORMALIZATION_CONTRACT.siteTypes).toContain(c.siteType);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.admissionPipeline).toContain(c.admissionStatus);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.sourceAuthority).toContain(c.sourceAuthority);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.materialCertainty).toContain(c.materialCertainty);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.operatingStatus).toContain(c.operatingStatus);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.accessAxes).toContain(c.accessState);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.accessAxes).toContain(c.collectState);
        expect(STATE_PACK_NORMALIZATION_CONTRACT.accessAxes).toContain(c.routeState);
      }
    }
  });

  it('does not treat directory/social/historic alone as ADMITTED', () => {
    const packs = FIRST_FIVE_STATE_CODES.map((c) => loadPack(c));
    for (const pack of packs) {
      for (const c of pack.candidates) {
        if (c.sourceAuthority === 'SOCIAL' || c.sourceAuthority === 'SECONDARY_DIRECTORY') {
          expect(['ADMITTED', 'PUBLISHED', 'EVIDENCE_SUFFICIENT']).not.toContain(c.admissionStatus);
        }
        if (c.admissionStatus === 'ADMITTED') {
          expect([
            'OPERATOR_DIRECT',
            'OPERATOR_PUBLIC',
            'GOVERNMENT',
            'OPERATOR',
            'MUSEUM',
          ]).toContain(c.sourceAuthority);
        }
      }
    }
  });

  it('summarizes bounded batch counts', () => {
    const nc = summarizeStatePack(loadPack('NC'));
    expect(nc.total).toBeGreaterThanOrEqual(10);
    expect(nc.feeMines).toBeGreaterThan(0);
    expect(nc.heldRejected).toBeGreaterThan(0);
  });
});

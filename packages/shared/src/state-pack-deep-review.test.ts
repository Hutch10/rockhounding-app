/**
 * Deep-review + launch-cohort gate — loads manifest artifact and validates contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LaunchCohortManifestSchema, projectDeepReviewPublic } from './state-pack-deep-review';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(
  here,
  '..',
  '..',
  '..',
  'qa-artifacts',
  'rockhounding-first-five-state-deep-pack-r1',
  'launch-cohort',
  'manifest.json'
);

describe('state-pack-deep-review launch cohort', () => {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const manifest = LaunchCohortManifestSchema.parse(raw);

  it('validates LaunchCohortManifestSchema with publishBlocked and Cowee UNSENT/UNCLAIMED', () => {
    expect(manifest.publishBlocked).toBe(true);
    expect(manifest.outreachStatus).toBe('UNSENT');
    expect(manifest.coweeClaimStatus).toBe('UNCLAIMED');
    expect(manifest.baselineSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.gate).toBe('rockhounding-first-five-state-deep-pack-r1');
  });

  it('keeps launch cohort within 15–35 and deep-reviewed ≥20', () => {
    expect(manifest.launchCohortIds.length).toBeGreaterThanOrEqual(15);
    expect(manifest.launchCohortIds.length).toBeLessThanOrEqual(35);
    expect(manifest.deepReviewed.length).toBeGreaterThanOrEqual(20);
    expect(manifest.metrics.launchCohortCount).toBe(manifest.launchCohortIds.length);
  });

  it('preserves Cherokee hours CONFLICTED in public projection', () => {
    const cherokee = manifest.deepReviewed.find((r) => r.candidateId === 'deep-nc-cherokee');
    expect(cherokee).toBeTruthy();
    expect(cherokee!.hoursSeason?.conflictState).toBe('CONFLICTED');
    expect(cherokee!.hoursSeason?.conflictNote).toMatch(/year-round|March/i);
    expect(cherokee!.operatingStatus.status).toBe('OPEN_REPORTED');
    expect(cherokee!.operatingStatus.status).not.toBe('OPEN_CONFIRMED');

    const pub = projectDeepReviewPublic(cherokee!);
    expect(pub.operatorConfirmed).toBe(false);
    expect(pub.conflictsVisible.length).toBeGreaterThan(0);
    expect(pub.conflictsVisible.some((c) => /hours|conflict/i.test(c))).toBe(true);
  });

  it('does not launch sites with visit UNKNOWN or collect UNKNOWN', () => {
    const launch = manifest.deepReviewed.filter((r) => r.inLaunchCohort);
    expect(launch.length).toBe(manifest.launchCohortIds.length);
    for (const r of launch) {
      expect(r.visit.axis, `${r.candidateId} visit`).not.toBe('UNKNOWN');
      expect(r.collect.axis, `${r.candidateId} collect`).not.toBe('UNKNOWN');
      expect(r.launchEligible).toBe(true);
    }
  });

  it('marks Dig Maine Gems materialOriginSummary MIXED (not NATURAL)', () => {
    const dig = manifest.deepReviewed.find((r) => r.candidateId === 'deep-me-dig-maine');
    expect(dig).toBeTruthy();
    expect(dig!.materialOriginSummary).toBe('MIXED');
    expect(dig!.materials.some((m) => m.originClass === 'SEEDED')).toBe(true);
  });

  it('sets all diversity flags true where evidence permits', () => {
    expect(manifest.diversity.privateFeeMines).toBe(true);
    expect(manifest.diversity.publicCollecting).toBe(true);
    expect(manifest.diversity.mixedNativeSeeded).toBe(true);
    expect(manifest.diversity.appointmentOnly).toBe(true);
    expect(manifest.diversity.seasonal).toBe(true);
    expect(manifest.diversity.shopOrIdentification).toBe(true);
    expect(manifest.diversity.museumOrGeology).toBe(true);
    expect(manifest.diversity.platformManagedGovernment).toBe(true);
  });

  it('marks all five states DEEP_READY', () => {
    expect(manifest.stateReadiness).toEqual({
      NC: 'DEEP_READY',
      AR: 'DEEP_READY',
      CA: 'DEEP_READY',
      MT: 'DEEP_READY',
      ME: 'DEEP_READY',
    });
  });
});

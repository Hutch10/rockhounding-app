import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import {
  FeeSiteAdmissionStatus,
  MaterialCertainty,
  MaterialOccurrenceType,
  OperatingStatus,
  SiteType,
  evaluateFeeSitePublicationReadiness,
  normalizeMaterialClaimCertainty,
  parseFeeSiteEnvelope,
} from './fee-site-support';

describe('Crater of Diamonds real admission packet (Production-safe)', () => {
  const packet = JSON.parse(
    readFileSync(
      resolve(
        __dirname,
        '../../../qa-artifacts/rockhounding-fee-site-real-preview-proof-r1/candidate-envelope.json'
      ),
      'utf8'
    )
  ) as {
    insertStatus: string;
    insertedDataPlane?: string;
    metadata: Record<string, unknown>;
  };

  it('parses fee_site envelope as FEE_MINE with government-backed axes', () => {
    const envelope = parseFeeSiteEnvelope(packet.metadata);
    expect(envelope).not.toBeNull();
    expect(envelope!.siteType).toBe(SiteType.FEE_MINE);
    expect(envelope!.operatingStatus).toBe(OperatingStatus.OPEN_CONFIRMED);
    expect(envelope!.accessAxes?.collect).toBe('ALLOWED');
    expect(envelope!.collectingContext?.materialOrigin).toBe('NATURAL');
    expect(envelope!.admissionStatus).toBe(FeeSiteAdmissionStatus.EVIDENCE_SUFFICIENT);
  });

  it('keeps diamond PRIMARY as SUPPORTED not auto-VERIFIED', () => {
    const envelope = parseFeeSiteEnvelope(packet.metadata)!;
    const diamond = envelope.materialClaims.find((c) => c.materialName === 'Diamond');
    expect(diamond?.occurrenceType).toBe(MaterialOccurrenceType.PRIMARY);
    expect(diamond?.certainty).toBe(MaterialCertainty.SUPPORTED);
    expect(normalizeMaterialClaimCertainty(diamond!)).toBe(MaterialCertainty.SUPPORTED);
  });

  it('would pass publication readiness if ADMITTED; Production insert remains blocked', () => {
    // Local Option C isolation / Preview-via-tunnel may insert; Production must not.
    expect([
      'NOT_INSERTED',
      'INSERTED_LOCAL_ONLY',
      'INSERTED_LOCAL_AND_PREVIEW_VIA_TUNNEL',
    ]).toContain(packet.insertStatus);
    if (
      packet.insertStatus === 'INSERTED_LOCAL_ONLY' ||
      packet.insertStatus === 'INSERTED_LOCAL_AND_PREVIEW_VIA_TUNNEL'
    ) {
      expect(packet.insertedDataPlane).toMatch(/local-supabase/);
    }
    expect(packet.insertStatus).not.toBe('INSERTED_PRODUCTION');
    const readiness = evaluateFeeSitePublicationReadiness({
      identifiableSite: true,
      sufficientCoordinates: true,
      identifiableOperator: true,
      currentOperationEvidence: true,
      collectingActivityConfirmed: true,
      accessTermsSufficientlyKnown: true,
      unresolvedMisleadingContradiction: false,
      admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
    });
    expect(readiness.publishable).toBe(true);
  });
});

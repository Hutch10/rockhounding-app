import type { CertificationVerdict } from '@hutchstack/core-certification';

export const PACKAGE_VERSION = '0.0.0-phase0';

export type GateGroup = 'reliability' | 'field' | 'ops' | 'certification';

export interface ReadinessGate {
  id: string;
  group: GateGroup;
  description: string;
  critical: boolean;
  status?: CertificationVerdict;
}

export interface ReadinessScorecard {
  id: string;
  version: string;
  targetRelease: string;
  gates: ReadinessGate[];
}

export interface ReadinessCompletion {
  pass: number;
  partial: number;
  fail: number;
  pct: number;
  criticalComplete: boolean;
}

export interface ReadinessEvaluator {
  completion(scorecard: ReadinessScorecard): ReadinessCompletion;
  isProductionReady(scorecard: ReadinessScorecard): boolean;
}

export type { WaivedGate } from './extension-points';

export type { CertificationVerdict };

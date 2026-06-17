export const PACKAGE_VERSION = '0.0.0-phase0';

export type CertificationVerdict = 'PASS' | 'FAIL' | 'PENDING' | 'PASS_WITH_WAIVER';

export interface GateChecklistItem {
  id: string;
  description: string;
  required: boolean;
  completed?: boolean;
}

export interface GateSection {
  id: string;
  title: string;
  items: GateChecklistItem[];
}

export interface GateBlocker {
  id: string;
  description: string;
  failClosed: boolean;
}

export interface CertificationGate {
  id: string;
  milestone: string;
  entryCriteria: string[];
  exitCriteria: string[];
  sections: GateSection[];
  blockers: GateBlocker[];
}

export interface CertificationRecord {
  gateId: string;
  gitSha: string;
  certifiedAt: string;
  certifiedBy: string;
  verdict: CertificationVerdict;
  waiverIds?: string[];
}

export interface GateEvaluator {
  evaluate(gate: CertificationGate, checklist: Record<string, boolean>): CertificationVerdict;
}

export type { AutomatedGate, ManualGate, KnownRiskRegister, KnownRisk } from './extension-points';

export { evaluateGateStub } from './gate-evaluator-stub';

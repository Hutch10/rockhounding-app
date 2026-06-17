export interface AutomatedGate {
  id: string;
  ciTestName: string;
  required: boolean;
}

export interface ManualGate {
  id: string;
  description: string;
  approverRole: string;
}

export interface KnownRisk {
  id: string;
  description: string;
  acceptedBy?: string;
  acceptedAt?: string;
}

export interface KnownRiskRegister {
  risks: KnownRisk[];
  get(id: string): KnownRisk | undefined;
}

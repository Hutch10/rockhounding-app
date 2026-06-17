/**
 * Read-only certification gate evaluator stub (Phase 1).
 * No CLI — parity check against manual META-003 review only.
 */
import type { CertificationGate, CertificationVerdict } from './index';

export function evaluateGateStub(
  gate: CertificationGate,
  checklist: Record<string, boolean>
): CertificationVerdict {
  for (const blocker of gate.blockers) {
    if (!blocker.failClosed) continue;
    const blockerSatisfied = gate.sections.every((section) =>
      section.items.every((item) => {
        if (!item.required) return true;
        return checklist[item.id] === true;
      })
    );
    if (!blockerSatisfied) return 'FAIL';
  }

  const requiredIds = gate.sections.flatMap((s) =>
    s.items.filter((i) => i.required).map((i) => i.id)
  );
  const completed = requiredIds.filter((id) => checklist[id] === true).length;

  if (completed === requiredIds.length && requiredIds.length > 0) return 'PASS';
  if (completed === 0) return 'PENDING';
  return 'PENDING';
}

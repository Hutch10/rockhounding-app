import { MATERIAL_CONFIDENCE_WEIGHTS } from '../policy';
import type {
  IdentificationState,
  MaterialIdentificationInput,
  MaterialIdentificationResult,
  MaterialIdentificationTier,
} from '../types';

function weakestLink(values: number[]): number {
  const positive = values.filter((v) => v > 0);
  if (positive.length === 0) return 0;
  return Math.min(...positive);
}

export function evaluateMaterialIdentification(
  input: MaterialIdentificationInput
): MaterialIdentificationResult {
  const machine = Math.max(0, Math.min(1, input.classification_confidence));
  let visual = 0;
  let expert = 0;
  let consensus = 0;

  let identification_state: IdentificationState = 'PENDING_CLASSIFICATION';
  let identification_tier: MaterialIdentificationTier = 'VISUAL_GUESS';

  if (machine > 0) {
    identification_state = 'PENDING_USER_VALIDATION';
    identification_tier = 'VISUAL_GUESS';
  }

  if (input.is_lab_confirmed === true) {
    identification_tier = 'LAB_CONFIRMED';
    identification_state = 'USER_VALIDATED';
    expert = 1;
  } else if (input.is_expert_validation === true) {
    expert = 0.95;
    identification_tier = 'EXPERT_REVIEWED';
    identification_state = 'EXPERT_REVIEW';
  }

  if (
    input.has_user_validation === true &&
    input.is_lab_confirmed !== true &&
    input.is_expert_validation !== true
  ) {
    if (input.user_action === 'ACCEPT') {
      visual = input.is_self_validation === true ? 0.4 : 0.85;
      identification_state = 'USER_VALIDATED';
      identification_tier = 'COMMUNITY_SUPPORTED';
    } else if (input.user_action === 'REJECT_WITH_CORRECTION') {
      visual = 0.75;
      identification_state = 'CORRECTION_PENDING';
      identification_tier = 'VISUAL_GUESS';
    } else if (input.user_action === 'REJECT_UNCERTAIN') {
      visual = 0.2;
      identification_state = 'PENDING_USER_VALIDATION';
      identification_tier = 'VISUAL_GUESS';
    } else if (input.user_action === 'REQUEST_EXPERT') {
      identification_state = 'EXPERT_REVIEW';
      identification_tier = 'VISUAL_GUESS';
    }
  }

  if (
    (input.consensus_count ?? 0) >= 3 &&
    input.is_lab_confirmed !== true &&
    input.is_expert_validation !== true
  ) {
    consensus = 0.8;
    identification_tier = 'COMMUNITY_SUPPORTED';
  }

  if ((input.expert_validation_count ?? 0) >= 2 && input.user_action === 'REJECT_WITH_CORRECTION') {
    identification_state = 'DISPUTED';
    identification_tier = 'VISUAL_GUESS';
  }

  const total = weakestLink([
    machine * MATERIAL_CONFIDENCE_WEIGHTS.machine,
    visual > 0 ? visual * MATERIAL_CONFIDENCE_WEIGHTS.visual : 0,
    expert > 0 ? expert * MATERIAL_CONFIDENCE_WEIGHTS.expert : 0,
    consensus > 0 ? consensus * MATERIAL_CONFIDENCE_WEIGHTS.consensus : 0,
  ]);

  const ground_truth_eligible = Boolean(
    input.is_lab_confirmed === true ||
    (input.is_expert_validation === true &&
      input.user_action === 'ACCEPT' &&
      (input.user_confidence ?? 0) >= 4) ||
    (input.user_action === 'REJECT_WITH_CORRECTION' &&
      input.is_expert_validation === true &&
      (input.user_confidence ?? 0) >= 4)
  );

  return {
    identification_state,
    identification_tier,
    confidence_breakdown: {
      total,
      metrics: { machine, visual, expert, consensus },
      breakdown: {
        machine,
        visual: visual > 0 ? visual : undefined,
        expert: expert > 0 ? expert : undefined,
        consensus: consensus > 0 ? consensus : undefined,
      },
    },
    ground_truth_eligible,
  };
}

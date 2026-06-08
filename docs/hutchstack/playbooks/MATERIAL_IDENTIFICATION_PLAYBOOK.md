# Playbook: Material Identification Workflows

**Component:** `material_identification`  
**Owner:** AI/Data Steward  
**SLA:** Validation feedback loop weekly; expert review within 48h

---

## 1. Scope

Governs the path from camera capture → ML classification → user validation → FindLog/collection linkage.

Aligns with `CaptureSession` → `classification_results` → `validation_events` pipeline.

---

## 2. Identification States & Tiers

### Workflow States

| State                     | Meaning                 | User Experience                |
| ------------------------- | ----------------------- | ------------------------------ |
| `PENDING_CLASSIFICATION`  | Image queued for ML     | "Analyzing..."                 |
| `PENDING_USER_VALIDATION` | ML result awaiting user | Show prediction + confidence   |
| `USER_VALIDATED`          | User accepted           | Ready for FindLog (field tier) |
| `CORRECTION_PENDING`      | User corrected ID       | Awaiting expert review         |
| `EXPERT_REVIEW`           | Expert queue            | Badge: "Expert verified"       |
| `DISPUTED`                | Conflicting validations | Hold from ground truth         |

### Identification Tiers (Tier-0)

| Tier                  | Meaning                      | Ground Truth Eligible     |
| --------------------- | ---------------------------- | ------------------------- |
| `VISUAL_GUESS`        | ML or unconfirmed correction | No                        |
| `COMMUNITY_SUPPORTED` | User accept or consensus ≥ 3 | No                        |
| `EXPERT_REVIEWED`     | Expert validation            | Yes (with confidence ≥ 4) |
| `LAB_CONFIRMED`       | Laboratory analysis on file  | Yes                       |

---

## 3. Workflow Steps

### Step 1: Capture

- `CaptureSession` created within `FieldSession`
- `raw_capture.added` event with device/GPS metadata
- Offline: queue classification locally

### Step 2: Classification

- Preprocessing → model inference
- Store `classification_results` with `confidence_score` (0.0–1.0)
- If confidence < 0.6 → always require user validation
- If confidence ≥ 0.85 AND top-3 gap < 0.1 → suggest auto-accept (user must confirm)

### Step 3: User Validation

User actions (from `validation_events.action`):

| Action                   | Effect                                    |
| ------------------------ | ----------------------------------------- |
| `ACCEPT`                 | Lock material ID; boost visual confidence |
| `REJECT_WITH_CORRECTION` | Update material; ground truth eligible    |
| `REJECT_UNCERTAIN`       | Keep find; mark unidentified              |
| `REQUEST_EXPERT`         | Route to expert queue                     |
| `SKIP`                   | Remain `PENDING_USER_VALIDATION`          |

### Step 4: Expert Validation (trust_level ≥ 3)

- Expert validations weighted 0.4 in confidence breakdown
- `is_expert_validation = true` on event
- Can upgrade to `EXPERT_REVIEW` state

### Step 5: FindLog Linkage

- On `USER_VALIDATED` or `EXPERT_REVIEW` → eligible for `findlog.created_from_capture`
- Harness `material_identification` component scores final confidence

---

## 4. Confidence Breakdown Weights

| Source               | Default Weight | Condition                                  |
| -------------------- | -------------- | ------------------------------------------ |
| Machine (ML)         | 0.40           | Always present post-classification         |
| Visual (user accept) | 0.35           | ACCEPT action                              |
| Expert               | 0.40           | Expert validation (replaces visual weight) |
| Consensus            | 0.25           | ≥ 3 agreeing validations                   |

---

## 5. Quality Gates

| Gate | Rule                                                            |
| ---- | --------------------------------------------------------------- |
| G-M1 | No public material claim without user confirmation              |
| G-M2 | Confidence < 0.4 → show "unidentified" only                     |
| G-M3 | Expert correction overrides ML                                  |
| G-M4 | Ground truth requires `REJECT_WITH_CORRECTION` or expert ACCEPT |

---

## 6. Ground Truth Collection

Weekly job collects:

```sql
validation_events WHERE action IN ('ACCEPT', 'REJECT_WITH_CORRECTION')
  AND sync_status = 'SYNCED'
  AND (is_expert_validation = true OR user_confidence >= 4)
```

Feed to model retraining pipeline with provenance hash.

---

## 7. Escalation

| Condition                                                       | Action                                    |
| --------------------------------------------------------------- | ----------------------------------------- |
| Model systematically wrong for mineral family                   | Flag model version; reduce machine weight |
| User reports harmful misidentification (e.g., arsenic minerals) | Force expert review; safety advisory      |
| Taxonomy gap (unknown material)                                 | Route to taxonomy steward                 |

---

## 8. Outputs

- `MaterialIdentificationResult` in harness evaluation
- `validation.submitted` provenance events
- FindLog with `confidence_metrics` populated

---

## 9. Metrics

- AI assist acceptance rate (target ≥ 60%)
- Expert correction rate
- Ground truth samples per week
- Time-to-validation (capture → user confirm)

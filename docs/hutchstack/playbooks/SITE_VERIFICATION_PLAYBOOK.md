# Playbook: Site Verification

**Component:** `site_verification`  
**Owner:** Moderation Ops  
**SLA:** 72h for PENDING staging with verification gaps

---

## 1. Trigger

Run when:

- New location submission enters staging
- Existing canon location flagged for re-verification (> 180 days)
- User reports inaccurate site information
- Harness returns `REVERIFICATION_REQUIRED` or `gaps.length > 0`

---

## 2. Prerequisites

- [ ] Coordinates valid (WGS84, within US bounds for v1)
- [ ] Site name and state populated
- [ ] Access check completed (`rpc_check_access_v2`)

---

## 3. Verification Checklist

### Evidence Review

| Check               | Pass Criteria                                   | Weight |
| ------------------- | ----------------------------------------------- | ------ |
| GPS accuracy        | ≤ 50m reported accuracy OR multiple visits      | High   |
| Photo evidence      | ≥ 1 geo-tagged or session-linked photo          | High   |
| Visit corroboration | ≥ 2 independent contributors OR official source | High   |
| Description quality | Directions, parking, or season info present     | Medium |
| Official alignment  | Matches known agency site list (if applicable)  | High   |

### Verification States

| State                     | Meaning                     | Next Action                           |
| ------------------------- | --------------------------- | ------------------------------------- |
| `UNVERIFIED`              | Insufficient evidence       | Request more from submitter           |
| `PARTIALLY_VERIFIED`      | Some checks pass            | Publish without verified badge        |
| `VERIFIED`                | All high-weight checks pass | Set `is_verified = true` on promotion |
| `DISPUTED`                | Conflicting reports         | Hold; second admin review             |
| `REVERIFICATION_REQUIRED` | Stale verification          | Re-queue                              |

---

## 4. Procedure

### 4.1 Intake (Automated — Harness)

1. Harness evaluates `SiteVerificationInput`
2. Record `harness.site_evaluated` provenance event
3. Route to moderation queue with verification summary

### 4.2 Human Review (Admin)

1. Open staging record in `/admin/moderation`
2. Review harness gaps list
3. Cross-reference satellite imagery (optional)
4. Check duplicate candidates within 200m
5. Document decision in moderation notes

### 4.3 Approval Criteria

Approve with verified badge when:

- Harness confidence ≥ 85
- No unresolved `DISPUTED` flags
- Permit validation not `prohibited` (unless research-only site)

### 4.4 Rejection Criteria

Reject when:

- Coordinates appear fabricated (ocean, 0,0, duplicate spam)
- Site is on private land with no permission evidence
- Duplicate of existing canon entry

---

## 5. Escalation

| Condition                         | Escalate To                                    |
| --------------------------------- | ---------------------------------------------- |
| Federal wilderness / NPS conflict | Access Intelligence Steward                    |
| Sacred/culturally sensitive site  | Platform Steward — do not publish exact coords |
| Active mining claim overlap       | Hold + legal review                            |

---

## 6. Outputs

- Updated `is_verified` and `confidence_score` on promotion
- Provenance chain: `site.verification.completed`
- Contributor reputation delta via moderation RPC

---

## 7. Metrics

- Time-to-verify (staging → approved)
- Verified badge accuracy (dispute rate)
- Re-verification completion rate

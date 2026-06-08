# Playbook: Moderation Operations

**Component:** `moderation`  
**Owner:** Admin Moderator  
**SLA:** Atomic commits; PENDING queue triaged daily

---

## 1. Architecture

Moderation uses **Moderation v2** — hardened, identity-aware, idempotent RPC:

- **Route:** `POST /api/admin/moderate`
- **RPC:** `moderate_location_v2`
- **UI:** `/admin/moderation`

---

## 2. Moderation Contract (Locked)

### Admins May

- View ALL `PENDING` staging records
- `APPROVE` — promote to public `locations`
- `REJECT` — mark rejected with reason (≥ 10 chars)
- Dry-run validate (`p_dry_run = true`)
- Idempotent retry (`p_idempotency_key`)

### Non-Admins May Not

- Access moderation routes
- Approve or reject any record
- Bypass staging table

---

## 3. Pre-Moderation Checklist

Before acting, verify harness `ModerationGateResult`:

- [ ] `moderation_status = PENDING`
- [ ] Kill-switch `moderation_v2_enabled` is true
- [ ] No unresolved `ACCESS_CONFLICT` (or override documented)
- [ ] Harness overall risk tier reviewed
- [ ] Duplicate flags resolved

---

## 4. Approve Procedure

1. Confirm harness recommendation (may override with reason)
2. Generate `p_idempotency_key` (UUID) for retry safety
3. Call `POST /api/admin/moderate`:

```json
{
  "id": "<staging_id>",
  "action": "APPROVE",
  "p_idempotency_key": "<uuid>"
}
```

4. RPC effects:
   - Insert into `locations` with `is_verified = true`, confidence +10
   - Update staging `moderation_status = APPROVED`
   - Contributor `reputation_score + 10`
   - Write `moderation_audit_log`

5. Emit provenance: `moderation.approved` → `location.promoted`

---

## 5. Reject Procedure

1. Write clear `reason` (≥ 10 characters) — shown to contributor
2. Call with `action: REJECT`
3. RPC effects:
   - Staging `moderation_status = REJECTED`
   - Contributor `reputation_score - 20` (floor 0)
   - Audit log entry

---

## 6. Kill-Switch Protocol

When `moderation_v2_enabled = false` in `system_config`:

- All moderation RPCs fail with maintenance message
- Queue processing pauses
- Display banner in admin UI
- Platform Steward must announce ETA

**Activate kill-switch when:**

- P0 access display bug
- Suspected RPC corruption
- Active security incident

---

## 7. Dry-Run Usage

Before bulk moderation sessions:

```json
{ "id": "<staging_id>", "action": "APPROVE", "p_dry_run": true }
```

Validates locks and constraints without promotion.

---

## 8. Idempotency Recovery

If client timeout after apparent success:

1. Retry with **same** `p_idempotency_key`
2. RPC returns `IDEMPOTENT_SUCCESS` if already committed
3. Never generate new key for same intended action

---

## 9. Audit Requirements

Every action records:

| Field             | Source              |
| ----------------- | ------------------- |
| `moderator_id`    | `auth.uid()` in RPC |
| `staging_id`      | Request             |
| `action`          | APPROVE / REJECT    |
| `reason`          | Reject only         |
| `idempotency_key` | Client UUID         |
| `timestamp`       | `now()`             |

Monthly audit: 100% of rejections sampled for reason quality.

---

## 10. Escalation Matrix

| Scenario                            | Action                                             |
| ----------------------------------- | -------------------------------------------------- |
| Harness says block, admin disagrees | Override with 20+ char reason; second review in 7d |
| Sensitive cultural site             | Reject; do not publish coords                      |
| High-value contributor rejection    | Optional direct message                            |
| Queue > 50 PENDING                  | Alert Platform Steward                             |

---

## 11. Metrics

- Moderation SLA (PENDING age)
- Approve/reject ratio
- Idempotent retry rate
- Override frequency
- Contributor dispute rate

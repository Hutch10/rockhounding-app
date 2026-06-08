# HutchStack Provenance Policy

**Version:** 1.1  
**Policy ID:** `hutchstack-prov-v1.1`  
**Harness Version:** `1.1.0`

---

## 1. Definition

**Provenance** is the complete, auditable chain describing _who_ captured _what_, _when_, _where_, _how it was validated_, and _who authorized publication_.

Every canon discovery artifact must be reconstructable from provenance events alone.

---

## 2. Provenance Event Model

Each event is immutable and contains:

```typescript
{
  id: string,                   // evaluation_hash (replay-stable identity)
  entity_type: string,
  entity_id: string,
  event_type: string,           // e.g. 'harness.evaluated'
  actor_id: string,
  actor_role: 'user' | 'moderator' | 'harness' | 'system',
  hashes: {
    hash_alg: 'sha256-v1',
    harness_version: string,    // e.g. '1.1.0'
    policy_version: string,     // e.g. 'hutchstack-v1.1.0'
    policy_hash: string,        // SHA-256 of policy manifest
    input_hash: string,         // SHA-256 of canonical input preimage
    output_hash: string,        // SHA-256 of replay-stable output (no evaluated_at)
    evaluation_hash: string,    // SHA-256 identity digest
  },
  parent_event_id?: string,
  chain_sequence?: number,
  root_event_type?: string,
  root_event_id?: string,
  metadata: Record<string, unknown>,
  occurred_at: ISO8601          // observation time — NOT included in identity hashes
}
```

### Canonical Serialization (canonical-v1)

- Objects: keys sorted lexicographically at every nesting level
- Wrapper: `{ _canonical: 'canonical-v1', payload: ... }`
- Dates: ISO 8601 strings only (no `Date` objects)
- Strings: Unicode NFC normalized
- Timestamps (`evaluated_at`, `occurred_at`) are **never** hashed into `output_hash` or `evaluation_hash`

---

## 3. Mandatory Provenance Chain

### Location promotion (staging → canon)

```
submission.created
  → harness.pre_scored
  → moderation.queued
  → moderation.approved | moderation.rejected
  → [if approved] location.promoted
  → harness.post_canon_scored
```

### Find with material identification

```
capture.session_created
  → capture.media_added
  → classification.completed
  → validation.submitted
  → [optional] find.created
  → harness.material_evaluated
```

### Access rule application

```
access.rule_matched
  → harness.permit_evaluated
  → [optional] access.override_applied
```

---

## 4. Source Tier Provenance

| Tier               | Required Provenance                                 |
| ------------------ | --------------------------------------------------- |
| `OFFICIAL`         | `source_id`, authority URL, import batch ID         |
| `OPERATOR`         | Operator identity, verification date                |
| `SECONDARY`        | Citation URL or document reference                  |
| `COMMUNITY_STAGED` | `submitted_by`, evidence attachments, harness score |

---

## 5. Evidence Attachment Rules

Acceptable evidence types:

- **Photo** — EXIF GPS (if present), capture timestamp, device ID
- **Permit document** — URL or storage ref; `authority_url` required
- **Field visit log** — Linked `trip_id` or `field_session_id`
- **Expert attestation** — Expert user ID + trust_level ≥ 3

Evidence hashes are computed at ingest and stored; originals are immutable.

---

## 6. Retention

| Record Type                  | Retention                                     |
| ---------------------------- | --------------------------------------------- |
| Provenance events            | 7 years                                       |
| Rejected staging records     | 12 months minimum                             |
| Moderation audit log         | 7 years                                       |
| Harness evaluation snapshots | 90 days (full JSON); 7 years (hash + summary) |

---

## 7. Replay & Audit

- Any provenance chain MUST be replayable in staging using stored inputs + policy version.
- Monthly audit samples 50 random canon locations for chain completeness.
- Missing `harness.evaluated` event before promotion = **P1 incident**.

---

## 8. Privacy

- Exact coordinates in provenance metadata respect visibility rules.
- Public provenance displays fuzzy location when `is_fuzzy = true`.
- PII in evidence (faces, license plates) is out of scope for public provenance; moderation may redact.

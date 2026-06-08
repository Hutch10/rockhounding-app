# Playbook: Permit Validation

**Component:** `permit_validation`  
**Owner:** Access Intelligence Steward  
**SLA:** Real-time API; rule refresh weekly

---

## 1. Trigger

Run when:

- User requests access check at coordinates (`POST /api/v1/access/check`)
- Location submission includes `legal_tag` / access fields
- Field session starts near a new parcel boundary
- Harness full evaluation for staging promotion

---

## 2. Data Sources (Priority Order)

1. **Official** — BLM, USFS, NPS, state DNR published rules (`source_type = official`)
2. **Parcel boundary** — `land_parcels` spatial intersection
3. **Regional rules** — `regions` + `access_rules`
4. **Crowdsourced** — Community reports (`source_type = crowdsourced`) — never sole authority
5. **Derived** — Computed from parcel owner type when no explicit rule

---

## 3. Validation Procedure

### Step 1: Spatial Resolution

```
Coordinate → land_parcels (smallest area wins) → regions fallback
```

Log `boundary_match`: `parcel` | `region` | `none`

### Step 2: Rule Ranking

Select best rule by:

1. Severity rank (prohibited > restricted > caution > allowed > unknown)
2. Granularity (parcel > region)
3. `priority_weight` DESC
4. `authority_level` DESC

### Step 3: Conflict Detection

If two rules differ by severity ≥ 2:

- Apply **stricter** rule (fail-closed)
- Flag `ACCESS_CONFLICT`
- Queue for human review if crowdsourced vs official conflict

### Step 4: Staleness Check

| Source                | Stale After | Penalty          |
| --------------------- | ----------- | ---------------- |
| Crowdsourced          | 90 days     | −0.15 confidence |
| Official              | 365 days    | −0.05 confidence |
| No `last_verified_at` | Immediate   | −0.20 confidence |

### Step 5: Material Restrictions

If `material_id` provided:

- Check material-specific rules in rule metadata
- Append `reason_codes` for collection bans (e.g., meteorites, fossils)

---

## 4. Advisory Mapping

| Access Status | Advisory Level | User Message Pattern                                         |
| ------------- | -------------- | ------------------------------------------------------------ |
| `allowed`     | `safe`         | "Collection may be permitted. Verify current agency rules."  |
| `caution`     | `caution`      | "Some restrictions may apply. Check permit requirements."    |
| `restricted`  | `warning`      | "Collection likely restricted. Permit probably required."    |
| `prohibited`  | `critical`     | "Collection prohibited. Do not collect here."                |
| `unknown`     | `caution`      | "Access status unknown. Treat as restricted until verified." |

---

## 5. Override Protocol

Admin override permitted when:

- Official source updated but DB stale
- Requires: `override_reason` (≥ 20 chars), `authority_url`, admin ID
- Emits `access.override_applied` provenance event
- Re-verification within 30 days mandatory

---

## 6. Fail-Closed Rules

**Never:**

- Display `allowed` when best rule is `prohibited`
- Hide `authority_url` when rule is `restricted` or `prohibited`
- Auto-promote staging with `prohibited` unless `RESEARCH_ONLY` status

---

## 7. Outputs

- `PermitValidationResult` with `reason_codes`, `confidence_penalties`
- User-facing access check response per V1 contract
- Weekly stale-rule refresh report

---

## 8. Metrics

- Access conflict rate
- Stale rule percentage
- Override frequency
- User-reported access inaccuracy rate

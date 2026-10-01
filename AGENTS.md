# Rocky Atlas — Agent guidance

This repository is **Rocky Atlas** (rockhounding field platform). Agents increase **execution autonomy** without increasing **epistemic authority**.

## Read first

- Canonical coordinator: [`docs/FIELD_PLATFORM_COORDINATOR.md`](docs/FIELD_PLATFORM_COORDINATOR.md)
- Cursor rules (do not duplicate or conflict): [`.cursor/rules/`](.cursor/rules/)
  - Stable domain contracts → `.cursor/rules/stable-domain-contracts.mdc`
  - Field platform coordinator → `.cursor/rules/field-platform-coordinator.mdc`
- Optional skills (pointers only):
  - [`.cursor/skills/site-admission/SKILL.md`](.cursor/skills/site-admission/SKILL.md)
  - [`.cursor/skills/supabase-safety/SKILL.md`](.cursor/skills/supabase-safety/SKILL.md)

## Doctrine summary (non-authoritative)

- Certainty ≠ confidence. `PROHIBITED` is permission, not certainty.
- Source/resource authority ≠ assertion authority. Processing does not elevate authority.
- Observation ≠ UGES assertion. Sample ≠ Observation. Model output ≠ direct observation.
- Provenance explains lineage; it does not create truth.
- Accessibility ≠ authorization. Mapped ≠ open. Geological promise ≠ collection permission.
- Unknown/partial evidence stays unresolved. Correct history with a new record, not erasure.
- `retrievedAt` ≠ `sourceUpdatedAt`. Fresh ≠ true. Stale ≠ false. Missing ≠ fetch-failed. Coverage gap ≠ absence.
- Do not invent timestamps. Do not treat zero-result queries as confirmed absence.
- Operator Confirmed = business fields only — not geology verification or legal certification.

## Stable contracts

Do not silently change STABLE semantics (UGES, Geological Layer Registry, Resource Catalog, Source Governance, Observation/Sample/Sampling Event, Provenance Activity, Truth Clock / Evidence Availability). See the coordinator doc and Building Block Registry.

## Working rules

- Confirm branch, HEAD, origin, and `git status` before foundational work.
- Preserve unrelated dirty paths; do not reset or commit them unless asked.
- One implementation owner per foundational schema.
- Prefer truthful launch-cohort product language over national-completeness claims.
- Production domain/data/migrations require explicit owner authorization.

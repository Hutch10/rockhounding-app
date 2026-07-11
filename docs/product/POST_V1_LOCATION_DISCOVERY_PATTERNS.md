# Post-V1 Location Discovery Patterns

This document defines the operational patterns, data types, and trust-language rules for location discovery candidates proposed for Rockhound post-V1.0.

These guidelines exist to preserve Rockhound's mission and prevent scope creep, adhering strictly to the constraints of the platform.

## Post-V1 Evidence Gate

Before any post-V1 location discovery pattern or candidate is implemented, it must pass the following Evidence Gate:

- [ ] **META-003 PASS**: Operational closed-beta evidence has been collected and certified.
- [ ] **V1.0 Release Completion**: Active Version 1.0 feature freeze is lifted.
- [ ] **Demonstrated Need**: Repeated user demand or clear telemetry evidence validates the feature.
- [ ] **Architectural Alignment**: No competing architecture path exists, and the certified sync invariant (`StorageManager` -> `SyncManager` -> `POST /api/v1/sync/batch`) is not altered.
- [ ] **Explicit Approval**: Explicit sign-off from the Product Steward.

## Data Type Distinctions

All location and discovery data must be strictly categorized into one of the following domains to ensure users understand the reliability of the information they are viewing:

1. **Stable Factual Data**
   - Coordinates, geological boundaries, agency jurisdictions, and formal designations.
   - Updates infrequently.
2. **Time-Sensitive Operational Data**
   - Road closures, weather conditions, fire restrictions, and seasonal access rules.
   - Highly volatile; requires freshness indicators to be considered reliable.
3. **Community Observations**
   - Field reports from other users (e.g., "gate was closed", "parking is full", "road is muddy").
   - Subjective and potentially outdated. Must be clearly separated from factual data.
4. **Inferred or Uncertain Information**
   - Predicted crowding, algorithmic difficulty ratings, or automated interpretations.
   - Lowest confidence tier; must never be presented as authoritative.

## Trust-Language Rules

Rockhound's core mission is to present trustworthy information (G2) and help users navigate safely (G3). To maintain this, all UX patterns must adhere to the following rules:

1. **Never present observations as authoritative facts.** Community input is anecdotal, not official.
2. **Always show source and timestamp.** The user must know _who_ provided the information and _when_ it was recorded.
3. **Distinguish trust categories explicitly.** Clearly separate `official`, `verified`, `community`, and `unverified` data sources in the UI.
4. **Avoid implying causation or current legality without fresh evidence.** A site that was legal three years ago may not be legal today. Do not imply continuous safety or legality without recent verification.

## Exclusions

The following patterns violate Rockhound's core mission and are explicitly excluded from the platform:

- Social feeds and engagement loops
- Public exact-location sharing of active finds
- Gamification, loyalty programs, trending, or popularity scores
- Advertising systems or marketplace mechanics
- "Live geology" claims or unverified real-time assertions
- A second sync, observation, or write path outside the certified invariant

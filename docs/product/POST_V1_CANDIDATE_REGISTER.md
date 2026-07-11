# Post-V1 Candidate Register

This register catalogs UX and operational patterns inspired by location-based discovery platforms. These are post-V1 candidates only and must pass the Post-V1 Evidence Gate before implementation.

### 1. Data Freshness Indicators

- **G1-G7 Mapping:** G1 (Find legal locations), G2 (Present trustworthy info), G3 (Navigate safely)
- **User Problem Addressed:** Users cannot currently distinguish between a regulation verified yesterday vs. three years ago, leading to safety and legality risks.
- **Required Evidence:** Telemetry showing users visiting locations with outdated regulations, or user feedback requesting last-verified dates.
- **Dependencies:** Database schema updates to track granular verification timestamps.
- **Risks:** Data decay if community or admins do not actively update the timestamps.
- **Smallest Viable Implementation:** A "Last verified" date badge on the site detail page for official access rules.
- **Earliest Eligible Milestone:** M2
- **Verdict:** **ACCEPT**

### 2. Evidence-Based Field Observations

- **G1-G7 Mapping:** G2 (Present trustworthy info), G3 (Navigate safely)
- **User Problem Addressed:** Users arrive at sites to find unexpected physical barriers (closed gates, washed-out roads, snow) not reflected in official data.
- **Required Evidence:** High volume of find logs containing text notes about road conditions or access barriers.
- **Dependencies:** Sync engine extensions to handle a new observation payload type.
- **Risks:** Subjective reporting; malicious or incorrect reports blocking access for others.
- **Smallest Viable Implementation:** A simple "Condition Report" button yielding standard tags (Gate Closed, Snow/Mud, Water Level) with a timestamp.
- **Earliest Eligible Milestone:** M3
- **Verdict:** **ACCEPT**

### 3. Improved Discovery Filters

- **G1-G7 Mapping:** G1 (Find legal locations), G5 (Operate offline)
- **User Problem Addressed:** Users cannot easily slice the dataset to find specific material types or filter for offline-available sites in their immediate vicinity.
- **Required Evidence:** Search queries failing to find relevant sites, or users requesting advanced filtering in closed beta.
- **Dependencies:** Search index improvements, client-side filtering logic over PouchDB.
- **Risks:** UI clutter; client-side performance degradation if the offline dataset is large.
- **Smallest Viable Implementation:** A basic filter sheet on the map view for Material Type and Trust Category.
- **Earliest Eligible Milestone:** M2
- **Verdict:** **ACCEPT**

### 4. Operational-Awareness Presentation

- **G1-G7 Mapping:** G5 (Operate offline), G6 (Synchronize safely)
- **User Problem Addressed:** Users are uncertain if their logs have synced or if they are currently relying on stale offline data.
- **Required Evidence:** Support tickets indicating confusion about sync state or lost data fears.
- **Dependencies:** Hooking the existing sync queue events to a global UI context.
- **Risks:** Notification fatigue if sync status is too noisy during intermittent connectivity.
- **Smallest Viable Implementation:** A unified status indicator showing "Sync Pending (X items)" or "Up to date".
- **Earliest Eligible Milestone:** M2
- **Verdict:** **ACCEPT**

### 5. Post-V1 Trip Context

- **G1-G7 Mapping:** G3 (Navigate safely), G5 (Operate offline)
- **User Problem Addressed:** Users plan multi-stop trips but must use third-party tools to sequence them or understand surrounding infrastructure (fuel, camping).
- **Required Evidence:** Users actively requesting routing features or importing/exporting GPX data for trip planning.
- **Dependencies:** Complex offline routing capabilities or integration with external routing providers.
- **Risks:** Scope creep into becoming a full-fledged navigation/camping app; massive data storage requirements for offline campground/fuel data.
- **Smallest Viable Implementation:** Ability to "Save" a list of locations as a "Trip" and bulk-download their offline data.
- **Earliest Eligible Milestone:** M4
- **Verdict:** **DEFER** (Requires significant validation against scope creep).

### 6. Authoritative Operational Windows (Formerly "Future Event Discovery")

- **G1-G7 Mapping:** G1 (Find legal locations), G3 (Navigate safely)
- **User Problem Addressed:** Users need to know when a site is legally open for collecting, including seasonal openings, permit windows, or official public dig access.
- **Required Evidence:** Find logs indicating users arriving during closed seasons or missing brief permit windows.
- **Dependencies:** Structured metadata fields for seasonal dates, linked to site verification.
- **Risks:** Data decay leading to illegal collecting if opening windows change without the platform updating.
- **Smallest Viable Implementation:** A "Seasonally Open" badge that filters based on current date vs. established agency dates.
- **Earliest Eligible Milestone:** M3
- **Verdict:** **DEFER** (Narrowly bounded to authoritative legal access dates only; explicitly excludes social feeds, engagement systems, ticketing, event marketplaces, and speculative community-event discovery which remain REJECTED).

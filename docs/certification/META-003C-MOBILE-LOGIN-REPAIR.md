# META-003C: Mobile Login Layout P0 Repair Certification

## Objective

Repair the deployed Rockhound mobile login page so it renders as a compact, readable, field-ready interface on common phone viewports (360x800 to 412x915), eliminating oversized SVGs, form compression, and overlapping floating elements.

## Root Cause Analysis

1. **SyncStatusPanel Overlap**: The SyncStatusPanel component was permanently fixed to the bottom-right (ixed bottom-4 right-4 z-50), causing it to overlap with the login form on small mobile viewports where screen real-estate is limited.
2. **Unconstrained SVGs**: Heroicons (SVGs) did not have a strict lex-shrink-0 rule applied, which allowed them to stretch uncontrollably depending on the parent flex container's constraints.
3. **Form Row Compression**: The <form> layout in LoginForm.tsx lacked a structural lex-col constraint, leading to cramped layout on horizontal constraints.

## Corrections Applied

1. **Inline SyncStatusPanel Support**:
   - Upgraded SyncStatusPanel.tsx to conditionally accept an inline prop.
   - Suppressed the global floating instance on /login and replaced it with an inline card directly beneath the form, ensuring natural document flow without overlaps.
2. **SVG Constraints & Responsive Sizing**:
   - Added lex-shrink-0 to all icons and containers in the status panel.
   - Enforced fixed dimensions (e.g. h-6 w-6 md:h-5 md:w-5) to ensure icons never exceed 32px on small screens.
3. **Typography & Layout Updates**:
   - Replaced "Ledger Standby" with "Waiting for sign-in" and "Last Integrity Check" with "Not checked yet" when viewed on the login page for better UX.
   - Updated LoginForm.tsx to structurally wrap both the form and the sync status panel within a uniform container (lex flex-col gap-6), guaranteeing proper spacing and complete visibility.

## Verification

- Before-and-after screenshots across viewports:
  - 390x844 (iPhone 12/13/14)
  - 412x915 (Pixel 7 Pro)
  - 1280x720 (Desktop Landscape)
- Lint and type-check: Verified no new warnings or errors introduced.
- Build: Verified
  pm run build succeeds.
- Evidence saved under rtifacts/ui/mobile-login-repair/.

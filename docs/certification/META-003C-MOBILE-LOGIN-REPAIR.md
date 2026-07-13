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

- **Evidence Failure**: Attempted to capture "before" screenshots at parent commit `4217001` via a clean `git worktree`.
- **Blocker**: The baseline commit `4217001` is unbuildable. `pnpm install` fails initially, and even when forced, `pnpm build` for `@rockhounding/shared` crashes because it references workspace packages (`@hutchstack/core-offline-ledger`, `@hutchstack/core-sync-v1`) that were deleted or missing in that commit.
- **Impact**: Without `@rockhounding/shared`, the Next.js dev server fails to compile the application and throws HTTP 500s. Playwright times out waiting for the `webServer` to be ready.
- **Result**: Due to the strict isolation rule prohibiting altering the current working branch to reconstruct old screenshots, the "before" evidence cannot be authentically captured.
- **Conclusion**: `META_003C_MOBILE_LOGIN_REPAIR_FAIL`

- Evidence saved under `artifacts/ui/mobile-login-repair/` (partial - contains "after" screenshots only).

# Rockhound Field Test Playbook

For closed beta testers. Complete in the field with poor signal.

**Build required:** M2 Field Test (Sprint 3) or later  
**Time:** ~30 minutes

## Prerequisites

- [ ] Preview or beta URL from team
- [ ] Login email access
- [ ] Phone with GPS enabled
- [ ] Ability to toggle airplane mode

## Test 1 — Login (2 min)

1. Open app URL
2. Sign in with magic link
3. Confirm Home screen loads

**Pass:** Session persists after closing and reopening browser tab

## Test 2 — Map access answer <10s (5 min)

1. Open Map tab
2. Pan to seed state (AZ or OR)
3. Tap any pin
4. Without opening full detail, read popup

**Pass:** You can state allowed/caution/prohibited and trust level within 10 seconds

## Test 3 — Prohibited gating (3 min)

1. Open a known prohibited seed site
2. Attempt Quick Log

**Pass:** Collection/log action disabled or blocked with clear message

## Test 4 — Offline Quick Log (10 min)

1. Enable airplane mode
2. Open Field or Map → Quick Log
3. Select material, save (photo optional)
4. Confirm pending/sync indicator shows queued item
5. Disable airplane mode
6. Wait up to 60 seconds

**Pass:** Find appears in Collection with synced status

## Test 5 — Trust labels (5 min)

1. Find one site of each type if possible: Official, Verified, Community, Unverified
2. Note badge on popup

**Pass:** Badges differ visually; Community never shown as Official

## Feedback

Report:

- Device model + OS
- Build URL or git SHA if shown
- Test number failed (if any)
- Screenshots optional
- GPS accuracy issues

Send to: [team contact TBD]

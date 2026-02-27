# Rockhound Onboarding & First‑Run Experience Blueprint

This blueprint defines the onboarding flow for new users, including account creation, permissions, initial sync, first FieldSession, guided walkthroughs, accessibility, offline-first behavior, and analytics for onboarding success.

---

## 1. Onboarding Flow Overview

1. Welcome Screen
2. Account Creation/Sign-In
3. Permissions Request (camera, location, storage)
4. Initial Sync (with offline fallback)
5. First FieldSession Creation
6. Guided Walkthroughs: Capture, FindLog, Map
7. First Successful Find (Celebration)
8. Onboarding Complete → Home

---

## 2. Screen-by-Screen Descriptions

### Welcome Screen

- Logo, tagline, and “Get Started” button
- Option to sign in or create account
- Copy: “Welcome to Rockhound! Your digital field notebook.”

### Account Creation/Sign-In

- Email, password, or SSO options
- Progress indicator (step 1 of 6)
- Copy: “Create your account to save your finds and sync across devices.”
- Accessibility: Label all fields, support autofill, error messages for invalid input

### Permissions Request

- Sequential prompts for camera, location, and storage
- Rationale for each: “We need your camera to capture finds.”
- Progressive disclosure: Only request when needed
- Accessibility: VoiceOver/Screen Reader support, large tap targets

### Initial Sync

- Animated progress bar, offline fallback message
- Copy: “Syncing field data… You can explore while offline.”
- Retry option if sync fails

### First FieldSession Creation

- Simple form: session name, location (auto or manual), start button
- Copy: “Start your first FieldSession to begin logging finds.”
- Empty state: “No sessions yet. Let’s create one!”

### Guided Walkthroughs

- Overlay tooltips on Capture, FindLog, and Map buttons
- Step-by-step: “Tap here to capture a new find.”
- Progress dots or skip option
- Accessibility: Tooltips readable by screen readers

### First Successful Find (Celebration)

- Confetti animation, congratulatory message
- Copy: “First find logged! You’re officially a Rockhound.”
- Option to share or continue
- Haptic feedback (success pulse)

### Onboarding Complete → Home

- Summary: “You’re all set! Explore, capture, and discover.”
- Quick links to help, settings, and feedback

---

## 3. Copywriting Guidelines

- Friendly, concise, and action-oriented
- Use plain language, avoid jargon
- Reinforce value (“Save your finds, even offline!”)
- Accessibility: Avoid idioms, use descriptive button labels

---

## 4. Accessibility Requirements

- All flows navigable by screen reader
- High-contrast color scheme
- Large touch targets (min 48x48dp)
- Text scaling support
- Clear focus indicators
- Error messages announced and visible

---

## 5. Offline-First Behavior

- All onboarding steps (except sync) work offline
- If offline, defer sync and show “You can continue offline”
- Local storage for account and session data until online
- Retry sync automatically when connection restores

---

## 6. Progressive Disclosure & Tooltips

- Only request permissions when needed
- Contextual tooltips for new features
- Empty states with guidance (“No finds yet. Capture your first!”)
- Skip/close options for all walkthroughs

---

## 7. Integration Points

- **Settings**: Link to manage permissions, account, telemetry
- **Telemetry**: Track onboarding steps, permission grants, errors
- **Sync Engine**: Initial sync, retry logic, offline queue
- **Offline Storage**: Store onboarding progress, user data, and finds

---

## 8. Analytics Funnel for Onboarding Success

1. App Opened (first run)
2. Account Created/Signed In
3. Permissions Granted (camera, location, storage)
4. Initial Sync Completed
5. First FieldSession Created
6. Guided Walkthrough Completed (or skipped)
7. First Find Captured
8. Onboarding Complete (Home reached)

- Track drop-off at each step
- Measure time to completion
- Segment by platform, connectivity, and user type

---

**This blueprint ensures a smooth, accessible, and offline-friendly onboarding experience, with clear analytics to measure and improve user success.**

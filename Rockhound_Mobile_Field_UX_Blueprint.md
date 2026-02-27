# Rockhound Mobile Field UX Blueprint

This blueprint defines the mobile-first interaction model and wireframe-level descriptions for the Rockhound platform's fieldwork experience. It covers navigation, offline-first workflows, capture and FindLog flows, FieldSession controls, map interactions, sync visibility, and a unified design language for outdoor use.

---

## 1. Mobile-First Interaction Model

### Navigation Patterns

- **Bottom Tab Bar**: Home, Map, Capture, FindLog, Sync
- **Swipe Gestures**: Left/right to switch between main modules
- **Floating Action Button (FAB)**: Quick access to Capture or FindLog from any screen
- **Drawer/Overflow Menu**: Session controls, settings, help

### Offline-First Workflows

- All data entry and capture flows work fully offline
- Local queue for unsynced items, visible and actionable
- Background sync with status indicator and manual retry

### Capture Flows

- One-tap access to camera, audio, and note capture
- Step-by-step guidance for required fields
- Immediate feedback on save (success, error, retry)

### FindLog Creation Flows

- Guided form with location, specimen, notes, and media
- Auto-save progress locally
- Map pin drop for location selection

### FieldSession Controls

- Start, pause, resume, and end session
- Session summary and progress bar
- Quick switch between sessions

### Map Interactions

- Pinch/zoom, pan, and tap to add/view finds
- Clustered pins for dense areas
- Offline map tiles with fallback to static map if needed

### Background Sync Visibility

- Persistent sync status icon (color-coded)
- Offline queue screen with retry/cancel options
- Toasts for sync events (success, error, retrying)

---

## 2. Major Screens & Wireframe Descriptions

### Home

- Session overview (active, recent, start new)
- Quick stats (finds, distance, time)
- FAB for Capture/FindLog

### Active FieldSession

- Session timer, GPS status, weather
- List of recent finds
- Controls: pause, end, add note

### Capture Flow

- Camera view with overlay for specimen framing
- Stepper: photo → details → confirm
- Haptic feedback on capture
- Error/retry for failed saves

### FindLog Flow

- Form: location (map pin), specimen, notes, media
- Progress bar for completion
- Save/queue indicator

### Map View

- Fullscreen map with pins for finds
- Tap pin: preview, details, edit
- FAB: add new find at map center
- Offline tile indicator

### Offline Queue

- List of unsynced items (type, timestamp, error state)
- Retry all, retry individual, delete
- Sync status banner

### Sync Status

- Persistent icon in header/tab bar
- Tap: modal with sync log (last sync, errors, queued)
- Manual sync button

### Quick Actions

- Long-press on Home or Map for context menu (add note, mark location, quick photo)
- Haptic feedback on action

---

## 3. Gesture Patterns

- **Swipe**: Navigate between modules
- **Pinch/Zoom**: Map interactions
- **Long-Press**: Quick actions/context menu
- **Double-Tap**: Zoom map or focus camera
- **Pull-to-Refresh**: Manual sync or reload

---

## 4. Accessibility Requirements

- WCAG AA color contrast
- Large touch targets (min 48x48dp)
- VoiceOver/Screen Reader support for all controls
- Haptic cues for success/error
- Text scaling support
- Offline/online state clearly indicated

---

## 5. Haptic Feedback Cues

- **Success**: Short vibration
- **Error**: Double vibration
- **Capture**: Light tap
- **Long-Press/Quick Action**: Subtle pulse

---

## 6. Error/Retry UX

- Inline error banners for failed actions
- Retry button on failed sync/capture
- Persistent offline queue for unsynced data
- Toasts for transient errors
- Detailed error log in Sync Status modal

---

## 7. Low-Connectivity Behavior

- All actions default to local queue if offline
- Visual indicator when offline/low signal
- Map tiles cached, fallback to static map
- User prompted before destructive actions if unsynced data exists

---

## 8. Unified Design Language

- **Spacing**: Generous padding (16-24dp), clear separation for touch
- **Typography**: Large, high-contrast sans-serif (min 16sp), bold for headings
- **Color**: High-contrast, outdoor-friendly palette (dark text on light, or vice versa; avoid pure white)
- **Component Density**: Low density, large buttons, minimal text per screen
- **Iconography**: Simple, bold, easily recognizable
- **State Colors**: Green (synced/success), Yellow (pending), Red (error), Blue (active)

---

## 9. Recommended Component Library Structure

- **/components**
  - **/navigation**: TabBar, Drawer, FAB, SyncStatusIcon
  - **/fieldSession**: SessionHeader, SessionControls, SessionSummary
  - **/capture**: CameraView, CaptureStepper, CaptureFeedback
  - **/findLog**: FindLogForm, MapPinSelector, MediaUploader
  - **/map**: MapView, Pin, Cluster, OfflineTileIndicator
  - **/offline**: OfflineQueueList, RetryButton, SyncBanner
  - **/quickActions**: QuickActionMenu, HapticWrapper
  - **/common**: Button, Input, Banner, Toast, Modal, Icon

---

**This blueprint should guide the implementation of a robust, accessible, and field-optimized mobile experience for Rockhound.**

# Rockhound Live Demo Runbook (RUXL-DEMO-RUNBOOK)

---

## Canonical JSON: Live Demo Runbook

```json
{
  "runbook_id": "RUXL-DEMO-RUNBOOK",
  "purpose": "Operational runbook for deterministic, regeneration-safe delivery of the live Rockhound demo.",
  "sections": {
    "device_preparation": [
      "Charge all demo devices (mobile, desktop)",
      "Install final demo builds on each device",
      "Verify OS versions and connectivity",
      "Reset demo data to initial state"
    ],
    "environment_setup": [
      "Secure quiet, well-lit demo space",
      "Set up screen sharing/recording equipment",
      "Test Wi-Fi and offline fallback",
      "Prepare backup power sources"
    ],
    "timing_choreography": [
      "Scripted timing for each demo segment",
      "Choreograph device handoffs and screen transitions",
      "Practice pacing for each flow"
    ],
    "founder_narration": [
      "Follow integrated script with timing cues",
      "Narrate each feature and flow as performed",
      "Highlight demo data and user stories"
    ],
    "fallback_paths": [
      "Predefined fallback for each demo segment (e.g., skip to next device, use backup data)",
      "Quick data reset and app relaunch",
      "Switch to pre-recorded segment if live fails"
    ],
    "recovery_flows": [
      "Crash recovery: relaunch app, reload demo data",
      "Sync failure: retry, switch to offline mode",
      "Device failure: switch to backup device"
    ],
    "pacing": [
      "Maintain steady, unhurried pace",
      "Pause for audience questions at key points",
      "Keep within total allotted demo time"
    ],
    "closing_sequence": [
      "Summarize key flows and outcomes",
      "Show call-to-action on landing page",
      "Invite feedback and questions",
      "Thank audience and close demo"
    ]
  },
  "acceptance_criteria": [
    "All devices and environments are prepared and validated",
    "Demo flows are delivered in correct order and timing",
    "Founder narration is clear and synchronized",
    "Fallbacks and recovery are ready and tested",
    "Demo ends with clear call-to-action and no critical issues"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Live Demo Runbook (Ultra-Dense)

### Device Preparation

- Charge all devices, install final builds, verify OS/connectivity, reset demo data

### Environment Setup

- Quiet, well-lit space, screen sharing/recording, test Wi-Fi/offline, backup power

### Timing & Choreography

- Scripted timing per segment, device handoffs, practiced pacing

### Founder Narration

- Follow script with timing cues, narrate each feature/flow, highlight demo data/user stories

### Fallback Paths

- Predefined fallback per segment, quick data reset/relaunch, switch to pre-recorded if needed

### Recovery Flows

- Crash: relaunch/reload data; Sync: retry/offline; Device: switch to backup

### Pacing

- Steady, unhurried, pause for questions, stay within time

### Closing Sequence

- Summarize flows/outcomes, show call-to-action, invite feedback, thank/close

### Acceptance Criteria

- Devices/environments ready, flows/timing correct, narration clear, fallbacks/recovery tested, demo ends with CTA and no critical issues

---

_This runbook is deterministic, ultra-dense, single-pass, and regeneration-safe. All operational steps and flows are encoded in both canonical JSON and human-readable form for direct execution._

# Rockhound Live Demo Rehearsal & Delivery Protocol (RUXL-DEMO-REHEARSE)

---

## Canonical JSON: Live Demo Rehearsal & Delivery Protocol

```json
{
  "protocol_id": "RUXL-DEMO-REHEARSE",
  "purpose": "Deterministic, regeneration-safe protocol for rehearsing and delivering the live Rockhound demo.",
  "sections": {
    "rehearsal_schedule": [
      "T-7d: Initial full run-through (all flows, all devices)",
      "T-5d: UI polish and demo data validation",
      "T-3d: Device test matrix pass, backup device prep",
      "T-2d: Timing and choreography dry-run",
      "T-1d: Final full rehearsal with founder script, fallback drills"
    ],
    "timing_breakdown": [
      { "segment": "Intro & context", "minutes": 2 },
      { "segment": "Mobile demo (create, photo, sync)", "minutes": 4 },
      { "segment": "Desktop demo (review, organize, batch)", "minutes": 4 },
      { "segment": "Cross-device sync", "minutes": 2 },
      { "segment": "Q&A and closing", "minutes": 3 }
    ],
    "founder_narration_timing": [
      "Scripted cues for each segment",
      "Practice concise, clear delivery",
      "Pause for audience engagement at transitions"
    ],
    "device_prep_checklist": [
      "Charge all devices",
      "Install final demo builds",
      "Reset demo data",
      "Verify OS/connectivity",
      "Backup devices ready"
    ],
    "environment_setup_checklist": [
      "Quiet, well-lit space",
      "Screen sharing/recording set up",
      "Wi-Fi and offline fallback tested",
      "Backup power available"
    ],
    "failure_mode_drills": [
      "Simulate app crash and recovery",
      "Simulate sync failure and offline fallback",
      "Switch to backup device mid-flow",
      "Practice switching to pre-recorded segment"
    ],
    "pacing_guidance": [
      "Maintain steady, unhurried pace",
      "Time each segment in rehearsal",
      "Leave buffer for Q&A and unexpected issues"
    ],
    "demo_day_execution_flow": [
      "Arrive early, set up devices and environment",
      "Run device/environment checklists",
      "Review founder script and timing cues",
      "Begin demo on time, follow segment order",
      "Monitor timing, adjust as needed",
      "Use fallback/recovery if issues arise",
      "Conclude with Q&A and call-to-action"
    ]
  },
  "acceptance_criteria": [
    "All rehearsals completed on schedule",
    "Timing and narration are smooth and on-cue",
    "Devices and environment are fully prepared",
    "Failure-mode drills are practiced and ready",
    "Demo-day flow is executed without critical issues"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Live Demo Rehearsal & Delivery Protocol (Ultra-Dense)

### Rehearsal Schedule

- T-7d: Initial run-through (all flows/devices)
- T-5d: UI polish, demo data validation
- T-3d: Device test pass, backup prep
- T-2d: Timing/choreography dry-run
- T-1d: Final rehearsal, fallback drills

### Timing Breakdown

- Intro/context: 2m
- Mobile demo: 4m
- Desktop demo: 4m
- Cross-device sync: 2m
- Q&A/closing: 3m

### Founder Narration Timing

- Scripted cues per segment
- Practice concise, clear delivery
- Pause for engagement at transitions

### Device Prep Checklist

- Charge/install/reset/verify/backup

### Environment Setup Checklist

- Quiet, lit, screen sharing, Wi-Fi/offline, backup power

### Failure-Mode Drills

- App crash/recovery, sync fail/offline, backup device, pre-recorded switch

### Pacing Guidance

- Steady, unhurried, time segments, buffer for Q&A/issues

### Demo-Day Execution Flow

- Arrive early, set up, run checklists, review script, start on time, monitor/adjust, use fallback if needed, conclude with Q&A/CTA

### Acceptance Criteria

- Rehearsals on schedule, timing/narration smooth, devices/env ready, failure drills ready, demo-day flow without critical issues

---

_This protocol is deterministic, ultra-dense, single-pass, and regeneration-safe. All steps and flows are encoded in both canonical JSON and human-readable form for direct execution._

# Rockhound Demo Rehearsal Execution Plan (RUXL-DEMO-EXECUTE)

---

## Canonical JSON: Demo Rehearsal Execution Plan

```json
{
  "plan_id": "RUXL-DEMO-EXECUTE",
  "purpose": "Deterministic, regeneration-safe execution plan for carrying out the Rockhound demo rehearsal protocol.",
  "sections": {
    "day_by_day_schedule": [
      { "day": "T-7d", "actions": ["Full run-through (all flows/devices)", "Log issues"] },
      { "day": "T-6d", "actions": ["UI polish review", "Demo data validation"] },
      { "day": "T-5d", "actions": ["Device test pass", "Backup device prep"] },
      { "day": "T-4d", "actions": ["Scripted timing practice", "Founder narration review"] },
      { "day": "T-3d", "actions": ["Choreography dry-run", "Screen sharing/recording test"] },
      { "day": "T-2d", "actions": ["Final device/environment checklists", "Fallback drill"] },
      {
        "day": "T-1d",
        "actions": ["Full rehearsal with script", "Troubleshooting drills", "Demo data reset"]
      }
    ],
    "timing_practice_script": [
      "Follow segment-by-segment timing cues",
      "Practice concise narration for each flow",
      "Pause for transitions and Q&A",
      "Time each segment and adjust as needed"
    ],
    "device_prep_cadence": [
      "Charge all devices nightly",
      "Install latest demo builds after each rehearsal",
      "Reset demo data before each run",
      "Verify OS/connectivity daily"
    ],
    "environment_prep_cadence": [
      "Tidy and set up demo space each morning",
      "Test Wi-Fi and offline fallback",
      "Check screen sharing/recording equipment",
      "Prepare backup power sources"
    ],
    "troubleshooting_drills": [
      "Simulate app crash and recovery",
      "Simulate sync failure and offline fallback",
      "Switch to backup device mid-flow",
      "Practice switching to pre-recorded segment"
    ],
    "pacing_reinforcement": [
      "Maintain steady, unhurried pace",
      "Time each segment in rehearsal",
      "Leave buffer for Q&A and unexpected issues"
    ],
    "demo_day_morning_routine": [
      "Arrive early, set up devices and environment",
      "Run device/environment checklists",
      "Review founder script and timing cues",
      "Reset demo data and validate flows",
      "Test fallback and recovery paths"
    ]
  },
  "acceptance_criteria": [
    "All rehearsals executed on schedule",
    "Timing and narration are smooth and on-cue",
    "Devices and environment are fully prepared each day",
    "Troubleshooting drills are practiced and ready",
    "Demo-day morning routine is completed without issues"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Demo Rehearsal Execution Plan (Ultra-Dense)

### Day-by-Day Schedule

- T-7d: Full run-through (all flows/devices), log issues
- T-6d: UI polish review, demo data validation
- T-5d: Device test pass, backup device prep
- T-4d: Scripted timing practice, narration review
- T-3d: Choreography dry-run, screen sharing/recording test
- T-2d: Final device/env checklists, fallback drill
- T-1d: Full rehearsal with script, troubleshooting drills, demo data reset

### Timing Practice Script

- Segment-by-segment timing cues
- Concise narration for each flow
- Pause for transitions/Q&A
- Time/adjust each segment

### Device Prep Cadence

- Charge nightly, install builds after rehearsal, reset data before run, verify OS/connectivity daily

### Environment Prep Cadence

- Tidy/setup each morning, test Wi-Fi/offline, check screen sharing/recording, backup power

### Troubleshooting Drills

- App crash/recovery, sync fail/offline, backup device, pre-recorded switch

### Pacing Reinforcement

- Steady, unhurried, time segments, buffer for Q&A/issues

### Demo-Day Morning Routine

- Arrive early, set up, run checklists, review script/timing, reset data/validate flows, test fallback/recovery

### Acceptance Criteria

- Rehearsals on schedule, timing/narration smooth, devices/env ready daily, troubleshooting drills ready, demo-day routine completed without issues

---

_This execution plan is deterministic, ultra-dense, single-pass, and regeneration-safe. All steps and flows are encoded in both canonical JSON and human-readable form for direct execution._

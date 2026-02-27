# Rockhound Early-User Activation & Onboarding Cycle (RUXL-USER-ACTIVATE)

---

## Canonical JSON: Early-User Activation & Onboarding Cycle

```json
{
  "cycle_id": "RUXL-USER-ACTIVATE",
  "purpose": "Deterministic, regeneration-safe cycle for activating and onboarding early users post-demo.",
  "sections": {
    "onboarding_flows": [
      "Day 1: Welcome email with activation link and product value statement",
      "Day 2: Interactive onboarding walkthrough (in-app or video)",
      "Day 3: First-session checklist and quick win task",
      "Day 5: Feature highlight and usage tip",
      "Day 7: Invite to community or support channel",
      "Day 10: Progress nudge and advanced feature intro",
      "Day 14: Feedback request and next-step invitation"
    ],
    "activation_messaging": [
      "Personalized welcome and value reinforcement",
      "Clear next steps and activation CTA",
      "Social proof and community invitation"
    ],
    "first_session_guidance": [
      "Step-by-step guide for first use",
      "Highlight core feature and quick win",
      "Prompt to complete onboarding checklist"
    ],
    "habit_loops": [
      "Daily/weekly usage reminders",
      "Progress tracking and streaks",
      "Reward for consistent engagement (badge, unlock, recognition)"
    ],
    "retention_checkpoints": [
      "Day 3: Check-in email if inactive",
      "Day 7: Progress review and encouragement",
      "Day 10: Advanced tip or feature unlock",
      "Day 14: Retention CTA and feedback request"
    ],
    "activation_plan_14d": [
      {
        "day": 1,
        "actions": ["Send welcome/activation email", "Tag user as 'activated' in telemetry"]
      },
      { "day": 2, "actions": ["Deliver onboarding walkthrough"] },
      { "day": 3, "actions": ["Send first-session checklist", "Check for first use"] },
      { "day": 5, "actions": ["Feature highlight email"] },
      { "day": 7, "actions": ["Community invite", "Retention checkpoint"] },
      {
        "day": 10,
        "actions": ["Progress nudge", "Advanced feature intro", "Retention checkpoint"]
      },
      { "day": 14, "actions": ["Feedback request", "Conversion CTA", "Final retention checkpoint"] }
    ],
    "user_telemetry_tagging": [
      "Activation status: invited, activated, onboarded, engaged, retained",
      "Engagement events: first session, checklist complete, feature used, community joined, feedback given"
    ],
    "conversion_ctas": ["Upgrade to paid tier", "Refer a friend", "Share testimonial or case study"]
  },
  "acceptance_criteria": [
    "All early users receive and complete onboarding flows",
    "Activation messaging and first-session guidance delivered",
    "Habit loops and retention checkpoints executed on schedule",
    "User telemetry accurately tagged and tracked",
    "14-day activation plan executed without drift",
    "Conversion CTAs delivered at key moments"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Early-User Activation & Onboarding Cycle (Ultra-Dense)

### Onboarding Flows

- Day 1: Welcome/activation email, value statement
- Day 2: Interactive onboarding walkthrough
- Day 3: First-session checklist, quick win
- Day 5: Feature highlight/tip
- Day 7: Community/support invite
- Day 10: Progress nudge, advanced feature
- Day 14: Feedback request, next steps

### Activation Messaging

- Personalized welcome, value reinforcement
- Clear next steps, activation CTA
- Social proof, community invite

### First-Session Guidance

- Step-by-step guide
- Highlight core feature/quick win
- Prompt onboarding checklist

### Habit Loops

- Daily/weekly reminders
- Progress tracking/streaks
- Rewards for engagement

### Retention Checkpoints

- Day 3: Inactivity check-in
- Day 7: Progress review
- Day 10: Advanced tip/unlock
- Day 14: Retention CTA, feedback

### 14-Day Activation Plan

- Day 1: Welcome/activation, tag as activated
- Day 2: Onboarding walkthrough
- Day 3: Checklist, first use check
- Day 5: Feature highlight
- Day 7: Community invite, retention checkpoint
- Day 10: Progress nudge, advanced feature, retention checkpoint
- Day 14: Feedback, conversion CTA, retention checkpoint

### User Telemetry Tagging

- Activation status: invited, activated, onboarded, engaged, retained
- Engagement events: first session, checklist, feature, community, feedback

### Conversion CTAs

- Upgrade to paid
- Refer a friend
- Share testimonial/case study

### Acceptance Criteria

- All users onboarded, activated, guided, and tagged
- Habit loops/retention checkpoints executed
- 14-day plan and CTAs delivered without drift

---

_This cycle is deterministic, ultra-dense, single-pass, and regeneration-safe. All steps and flows are encoded in both canonical JSON and human-readable form for direct execution._

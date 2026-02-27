# Rockhound Early-User Retention & Engagement Cycle (RUXL-USER-RETAIN)

---

## Canonical JSON: Early-User Retention & Engagement Cycle

```json
{
  "cycle_id": "RUXL-USER-RETAIN",
  "purpose": "Deterministic, regeneration-safe cycle for retaining and engaging early users post-activation.",
  "sections": {
    "weekly_habit_loops": [
      "Weekly usage reminders (email/push)",
      "Progress tracking and streaks",
      "Weekly challenge or goal",
      "Recognition for consistent engagement"
    ],
    "milestone_reinforcement": [
      "Celebrate first week, 2-week, and 1-month milestones",
      "Unlock badges or rewards at key usage points",
      "Share user progress and impact stats"
    ],
    "community_integration": [
      "Invite to join user community (chat/forum)",
      "Highlight community events or AMAs",
      "Feature user stories or spotlights"
    ],
    "feedback_harvesting": [
      "Bi-weekly feedback requests",
      "In-app feedback prompts after key actions",
      "Offer incentives for detailed feedback"
    ],
    "churn_prevention_triggers": [
      "Detect inactivity >7 days: send re-engagement email",
      "Detect drop in usage: offer help/resources",
      "Exit intent: prompt with retention CTA or survey"
    ],
    "retention_checkpoints": [
      "Day 7: Usage review and encouragement",
      "Day 14: Milestone celebration, feedback request",
      "Day 21: Community invite, advanced feature intro",
      "Day 30: Retention CTA, testimonial request"
    ],
    "retention_plan_30d": [
      { "day": 1, "actions": ["Welcome to retention phase", "Tag user as 'retained'"] },
      { "day": 7, "actions": ["Usage review", "Weekly habit loop", "Retention checkpoint"] },
      {
        "day": 14,
        "actions": ["Milestone celebration", "Feedback request", "Retention checkpoint"]
      },
      {
        "day": 21,
        "actions": ["Community invite", "Advanced feature intro", "Retention checkpoint"]
      },
      { "day": 28, "actions": ["Weekly habit loop", "Progress update"] },
      { "day": 30, "actions": ["Retention CTA", "Testimonial request", "Final checkpoint"] }
    ],
    "conversion_ctas": ["Upgrade to paid tier", "Refer a friend", "Share testimonial or case study"]
  },
  "acceptance_criteria": [
    "All users receive weekly habit loops and milestone reinforcement",
    "Community integration and feedback harvesting executed",
    "Churn-prevention triggers monitored and acted upon",
    "Retention checkpoints and 30-day plan executed without drift",
    "Conversion CTAs delivered at key moments"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Early-User Retention & Engagement Cycle (Ultra-Dense)

### Weekly Habit Loops

- Weekly reminders (email/push)
- Progress tracking/streaks
- Weekly challenge/goal
- Recognition for engagement

### Milestone Reinforcement

- Celebrate 1-week, 2-week, 1-month
- Unlock badges/rewards
- Share progress/impact stats

### Community Integration

- Community invite (chat/forum)
- Highlight events/AMAs
- Feature user stories

### Feedback Harvesting

- Bi-weekly feedback requests
- In-app prompts after key actions
- Incentives for feedback

### Churn-Prevention Triggers

- Inactivity >7 days: re-engagement
- Drop in usage: offer help/resources
- Exit intent: retention CTA/survey

### Retention Checkpoints

- Day 7: Usage review, encouragement
- Day 14: Milestone, feedback
- Day 21: Community, advanced feature
- Day 30: Retention CTA, testimonial

### 30-Day Retention Plan

- Day 1: Welcome/tag as retained
- Day 7: Usage review, habit loop, checkpoint
- Day 14: Milestone, feedback, checkpoint
- Day 21: Community, advanced feature, checkpoint
- Day 28: Habit loop, progress update
- Day 30: Retention CTA, testimonial, final checkpoint

### Conversion CTAs

- Upgrade to paid
- Refer a friend
- Share testimonial/case study

### Acceptance Criteria

- All users receive habit loops, milestone reinforcement, community integration, and feedback prompts
- Churn triggers monitored and acted on
- 30-day plan and CTAs delivered without drift

---

_This cycle is deterministic, ultra-dense, single-pass, and regeneration-safe. All steps and flows are encoded in both canonical JSON and human-readable form for direct execution._

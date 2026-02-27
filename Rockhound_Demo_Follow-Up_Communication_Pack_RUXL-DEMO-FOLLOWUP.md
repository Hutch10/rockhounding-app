# Rockhound Demo Follow-Up Communication Pack (RUXL-DEMO-FOLLOWUP)

---

## Canonical JSON: Demo Follow-Up Communication Pack

```json
{
  "pack_id": "RUXL-DEMO-FOLLOWUP",
  "purpose": "Deterministic, regeneration-safe follow-up and outreach pack for post-demo traction.",
  "sections": {
    "email_templates": {
      "investor": "Subject: Thank You for Attending the Rockhound Demo\n\nHi [Name],\n\nThank you for joining our live demo. We’re excited to share Rockhound’s progress and would love to discuss next steps or answer any questions.\n\nDemo highlights: [link] | Deck: [link] | Video: [link]\n\nLet’s connect for a deeper dive or feedback call.\n\nBest,\n[Founder]",
      "advisor": "Subject: Grateful for Your Support at the Rockhound Demo\n\nHi [Name],\n\nThank you for your guidance and for attending our demo. Your insights are invaluable. If you have feedback or suggestions, I’d love to hear them.\n\nDemo highlights: [link] | Deck: [link]\n\nAppreciate your continued support!\n\nBest,\n[Founder]",
      "early_user": "Subject: Thanks for Experiencing Rockhound Live!\n\nHi [Name],\n\nThank you for joining our demo. We’d love your feedback and to invite you to our early access program.\n\nSign up here: [link] | Demo video: [link]\n\nLet us know what you think!\n\nBest,\n[Founder]",
      "partner": "Subject: Excited to Explore Collaboration After the Rockhound Demo\n\nHi [Name],\n\nThank you for attending our demo. We see strong alignment and would love to discuss partnership opportunities.\n\nDemo deck: [link] | Highlights: [link]\n\nLet’s schedule a call to explore synergies.\n\nBest,\n[Founder]"
    },
    "dm_templates": {
      "investor": "Thanks for joining the Rockhound demo! Would love to hear your thoughts or set up a follow-up call.",
      "advisor": "Appreciate your support at the demo—any feedback is welcome!",
      "early_user": "Thanks for checking out Rockhound! Sign up for early access: [link]",
      "partner": "Great to see you at the demo. Let’s connect about partnership ideas!"
    },
    "thank_you_messages": [
      "Thank you for attending the Rockhound demo—your support means a lot!",
      "Grateful for your time and feedback at our live demo.",
      "Thanks for being part of the Rockhound journey!"
    ],
    "next_step_ctas": [
      "Let’s schedule a follow-up call.",
      "Sign up for early access.",
      "Share your feedback or questions.",
      "Download the demo deck or video."
    ],
    "outreach_cadence_7d": [
      { "day": 1, "actions": ["Send thank-you emails/DMs", "Update landing page"] },
      { "day": 2, "actions": ["Targeted investor/partner outreach"] },
      { "day": 3, "actions": ["Invite early users to sign up"] },
      { "day": 4, "actions": ["Share demo highlights on social channels"] },
      { "day": 5, "actions": ["Follow up with top leads"] },
      { "day": 6, "actions": ["Respond to feedback, schedule calls"] },
      { "day": 7, "actions": ["Post recap, announce next milestone"] }
    ],
    "post_demo_landing_page": {
      "headline": "Rockhound Demo: See What’s Next in Field Discovery",
      "cta": "Sign up for early access or schedule a call.",
      "highlights": [
        "Live demo video",
        "Downloadable deck",
        "User testimonials",
        "Join the waitlist"
      ],
      "feedback_prompt": "Share your thoughts or questions—let’s build Rockhound together!"
    }
  },
  "acceptance_criteria": [
    "All follow-up messages are ready and sent on schedule",
    "Outreach is personalized and covers all key audiences",
    "Landing page is updated with demo assets and CTAs",
    "7-day cadence is executed without drift"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Demo Follow-Up Communication Pack (Ultra-Dense)

### Email Templates

- Investor: thank you, highlights, next steps, call invite
- Advisor: gratitude, feedback request, deck/highlights
- Early user: thanks, feedback, early access invite
- Partner: thanks, partnership call, deck/highlights

### DM Templates

- Investor: thanks, follow-up call
- Advisor: thanks, feedback
- Early user: thanks, early access link
- Partner: thanks, partnership connect

### Thank-You Messages

- Thank you for attending/support/being part of Rockhound

### Next-Step CTAs

- Schedule call, sign up, share feedback, download assets

### 7-Day Outreach Cadence

- Day 1: Thank-you, landing update
- Day 2: Investor/partner outreach
- Day 3: Early user invites
- Day 4: Social highlights
- Day 5: Top lead follow-up
- Day 6: Feedback/calls
- Day 7: Recap/next milestone

### Post-Demo Landing Page

- Headline, CTA, highlights (video, deck, testimonials, waitlist), feedback prompt

### Acceptance Criteria

- All messages sent on schedule, outreach covers all audiences, landing updated, cadence executed without drift

---

_This pack is deterministic, ultra-dense, single-pass, and regeneration-safe. All templates, flows, and assets are encoded in both canonical JSON and human-readable form for direct execution._

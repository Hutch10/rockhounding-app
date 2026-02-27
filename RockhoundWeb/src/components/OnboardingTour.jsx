// OnboardingTour.jsx - v1.4.0
import React from 'react';

export default function OnboardingTour({ steps = [], onComplete, onSkip }) {
  // Minimal deterministic onboarding tour
  return (
    <div className="onboarding-tour">
      <h2>Welcome to Rockhound!</h2>
      <p>This guided tour will help you get started.</p>
      <button onClick={onComplete}>Complete Tour</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  );
}

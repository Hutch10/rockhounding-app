// Onboarding Storage for v1.4.0
const STORAGE_KEY = 'rockhound_onboarding_state';

export function loadOnboardingState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { completed: false, completedAt: null };
  return JSON.parse(raw);
}

export function saveOnboardingState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

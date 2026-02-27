// Custom View Storage for v1.4.0
const STORAGE_KEY = 'rockhound_custom_views';

export function loadCustomViews() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveCustomViews(views) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function seedDemoCustomViews(demoViews) {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveCustomViews(demoViews);
  }
}

// Specimen Storage for v1.4.0
import { migrateAllSpecimensV130toV140 } from '../models/Migration';
const STORAGE_KEY = 'rockhound_specimens';

export function loadSpecimens() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let specimens = JSON.parse(raw);
  specimens = migrateAllSpecimensV130toV140(specimens);
  return specimens;
}

export function saveSpecimens(specimens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(specimens));
}

export function seedDemoSpecimens(demoSpecimens) {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveSpecimens(demoSpecimens);
  }
}

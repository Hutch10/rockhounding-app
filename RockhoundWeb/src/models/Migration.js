// Migration logic from v1.3.0 to v1.4.0
export function migrateSpecimenV130toV140(specimen) {
  const migrated = { ...specimen };
  if (!Array.isArray(migrated.relatedIds)) migrated.relatedIds = [];
  if (!Array.isArray(migrated.annotations)) migrated.annotations = [];
  return migrated;
}

// Idempotent, deterministic migration for all specimens
export function migrateAllSpecimensV130toV140(specimens) {
  return specimens.map(migrateSpecimenV130toV140);
}

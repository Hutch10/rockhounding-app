// migrationUtils.js - v1.4.0
import { migrateAllSpecimensV130toV140 } from '../models/Migration';

export function runMigrationIfNeeded(specimens) {
  return migrateAllSpecimensV130toV140(specimens);
}

import { handleDbError, logInfo, logSuccess } from './db';
import { seedMaterials } from './seed_materials';
import { seedRulesets } from './seed_rulesets';
import { seedStagingLocations } from './seed_staging_locations';

/**
 * Run all seed scripts in the correct order
 * Order matters: rulesets and materials must exist before staging locations
 */

async function seedAll(): Promise<void> {
  logInfo('Starting full database seed...');
  logInfo('');

  try {
    // Step 1: Seed materials (no dependencies)
    logInfo('Step 1/3: Seeding materials...');
    await seedMaterials();
    logInfo('');

    // Step 2: Seed rulesets (no dependencies)
    logInfo('Step 2/3: Seeding rulesets...');
    await seedRulesets();
    logInfo('');

    // Step 3: Seed staging locations (depends on materials + rulesets)
    logInfo('Step 3/3: Seeding staging locations...');
    await seedStagingLocations();
    logInfo('');

    logSuccess('🎉 All seed data loaded successfully!');
    logInfo('');
    logInfo('Next steps:');
    logInfo('  1. Start Supabase local: supabase start');
    logInfo('  2. Review staging locations in Supabase Studio');
    logInfo('  3. Test moderation workflow (approve/reject)');
  } catch (error) {
    handleDbError(error, 'seedAll');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      handleDbError(error, 'seedAll main');
    });
}

export { seedAll };

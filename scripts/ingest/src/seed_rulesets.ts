import { handleDbError, logInfo, logSuccess, supabase } from './db';

/**
 * Seed rulesets table with federal and state-level legal rulesets
 * Idempotent: Uses upsert with name as unique constraint
 *
 * These rulesets power the "Why?" links in the UI (Build Document Rule #5)
 */

interface Ruleset {
  name: string;
  description: string;
  ruleset_url: string;
  jurisdiction: string;
}

const RULESETS: Ruleset[] = [
  // Federal - BLM
  {
    name: 'BLM Rockhounding Rules',
    description:
      'Bureau of Land Management regulations for casual mineral collecting on public lands. Allows collection of reasonable amounts for personal, non-commercial use.',
    ruleset_url: 'https://www.blm.gov/programs/energy-and-minerals/mining-and-minerals/minerals',
    jurisdiction: 'federal',
  },
  {
    name: 'BLM Wilderness Areas',
    description:
      'Special regulations for BLM wilderness areas. Mechanized equipment prohibited, collection may be restricted.',
    ruleset_url:
      'https://www.blm.gov/programs/recreation/recreation-programs/wilderness-and-wild-and-scenic-rivers',
    jurisdiction: 'federal',
  },

  // Federal - USFS
  {
    name: 'USFS Rockhounding Guidelines',
    description:
      'U.S. Forest Service regulations for mineral collecting on national forest lands. Typically allows small-scale hobby collecting without permit.',
    ruleset_url: 'https://www.fs.usda.gov/geology',
    jurisdiction: 'federal',
  },
  {
    name: 'USFS Wilderness Areas',
    description:
      'Restrictions for designated wilderness areas within National Forests. No motorized vehicles or mechanized equipment.',
    ruleset_url: 'https://www.fs.usda.gov/visit/know-before-you-go/wilderness',
    jurisdiction: 'federal',
  },

  // Federal - NPS
  {
    name: 'National Park Service - No Collecting',
    description:
      'National Parks prohibit all collecting of rocks, minerals, fossils, plants, and natural objects. Look but don\'t take.',
    ruleset_url: 'https://www.nps.gov/articles/leave-no-trace.htm',
    jurisdiction: 'federal',
  },

  // State - California
  {
    name: 'California State Parks Rockhounding',
    description:
      'California State Parks generally prohibit collecting except in designated rockhound areas. Check specific park regulations.',
    ruleset_url: 'https://www.parks.ca.gov/',
    jurisdiction: 'state',
  },
  {
    name: 'California Desert Conservation Area',
    description:
      'BLM California Desert District regulations. Allows casual collecting of rocks and minerals for non-commercial purposes.',
    ruleset_url: 'https://www.blm.gov/programs/natural-resources/geology-and-minerals/california',
    jurisdiction: 'state',
  },

  // State - Arizona
  {
    name: 'Arizona State Trust Land',
    description:
      'Arizona State Land Department requires permits for collecting on state trust lands. Contact ASLD for permit information.',
    ruleset_url: 'https://land.az.gov/',
    jurisdiction: 'state',
  },
  {
    name: 'Arizona Rockhounding Guidelines',
    description:
      'General guidelines for rockhounding in Arizona. Many BLM lands allow casual collecting.',
    ruleset_url: 'https://www.azgs.arizona.edu/',
    jurisdiction: 'state',
  },

  // State - Colorado
  {
    name: 'Colorado BLM Rockhounding',
    description:
      'Colorado BLM lands allow casual mineral collecting. Limits apply: hand tools only, personal use.',
    ruleset_url: 'https://www.blm.gov/colorado',
    jurisdiction: 'state',
  },

  // County
  {
    name: 'County Roads and Rights-of-Way',
    description:
      'General guidance: County road rights-of-way may allow surface collecting, but verify with county regulations.',
    ruleset_url: 'https://example.com/county-guidelines',
    jurisdiction: 'county',
  },

  // Private
  {
    name: 'Fee Dig Sites - Commercial Operations',
    description:
      'Commercial fee dig sites operate on private land. Follow site-specific rules, fees apply.',
    ruleset_url: 'https://example.com/fee-sites',
    jurisdiction: 'private',
  },
  {
    name: 'Private Land - Permission Required',
    description:
      'Collecting on private land REQUIRES explicit permission from landowner. Trespassing is illegal.',
    ruleset_url: 'https://example.com/private-land-ethics',
    jurisdiction: 'private',
  },
];

async function seedRulesets(): Promise<void> {
  logInfo(`Seeding ${RULESETS.length} rulesets...`);

  for (const ruleset of RULESETS) {
    const { error } = await supabase.from('rulesets').upsert(
      {
        name: ruleset.name,
        description: ruleset.description,
        ruleset_url: ruleset.ruleset_url,
        jurisdiction: ruleset.jurisdiction,
      },
      {
        onConflict: 'name',
        ignoreDuplicates: false, // Update if exists
      }
    );

    if (error) {
      handleDbError(error, `seeding ruleset: ${ruleset.name}`);
    }

    logInfo(`  - ${ruleset.name} (${ruleset.jurisdiction})`);
  }

  logSuccess(`Successfully seeded ${RULESETS.length} rulesets`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRulesets()
    .then(() => {
      logSuccess('Rulesets seed completed');
      process.exit(0);
    })
    .catch((error) => {
      handleDbError(error, 'seedRulesets');
    });
}

export { seedRulesets };

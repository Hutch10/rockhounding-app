import { LegalTag, SourceTier, Status } from '@rockhounding/shared';

import { handleDbError, logInfo, logSuccess, supabase } from './db';

/**
 * Seed locations_staging table with sample locations for moderation testing
 * Build Document Rule #6: User submissions NEVER publish directly
 *
 * All locations MUST have (Build Document Rule #5):
 * - legal_tag
 * - legal_confidence (0-100)
 * - source_tier
 * - primary_ruleset_id
 * - verification_date OR status=RESEARCH_REQUIRED
 *
 * Idempotent: Uses upsert on unique constraint (name + lat + lon composite)
 */

interface StagingLocation {
  name: string;
  description: string;
  lat: number;
  lon: number;
  state: string;
  county: string | null;
  legal_tag: LegalTag;
  legal_confidence: number;
  access_model: string;
  status: Status;
  source_tier: SourceTier;
  verification_date: string | null;
  primary_ruleset_name: string; // Will be resolved to ID
  difficulty: number | null;
  kid_friendly: boolean;
  directions: string | null;
  parking_info: string | null;
  fees_cost: string | null;
  materials: string[]; // Material names to link
}

const STAGING_LOCATIONS: StagingLocation[] = [
  {
    name: 'Crystal Peak Recreation Area',
    description:
      'Popular BLM area known for quartz crystals and smoky quartz. Surface collecting allowed.',
    lat: 39.0833,
    lon: -105.4167,
    state: 'CO',
    county: 'Teller',
    legal_tag: LegalTag.LEGAL_PUBLIC,
    legal_confidence: 95,
    access_model: 'PUBLIC_LAND',
    status: Status.OPEN,
    source_tier: SourceTier.OFFICIAL,
    verification_date: '2024-06-15T00:00:00Z',
    primary_ruleset_name: 'Colorado BLM Rockhounding',
    difficulty: 2,
    kid_friendly: true,
    directions: 'Take US-24 west from Colorado Springs, turn north on County Road 11.',
    parking_info: 'Parking available at trailhead, high-clearance vehicle recommended.',
    fees_cost: 'Free',
    materials: ['Quartz', 'Amethyst'],
  },
  {
    name: 'Oceanview Mine Fee Dig',
    description:
      'Commercial fee dig site for tourmaline and other gemstones. Tools and equipment provided.',
    lat: 33.3167,
    lon: -116.9333,
    state: 'CA',
    county: 'San Diego',
    legal_tag: LegalTag.LEGAL_FEE_SITE,
    legal_confidence: 100,
    access_model: 'FEE_SITE',
    status: Status.SEASONAL,
    source_tier: SourceTier.OPERATOR,
    verification_date: '2024-08-20T00:00:00Z',
    primary_ruleset_name: 'Fee Dig Sites - Commercial Operations',
    difficulty: 3,
    kid_friendly: false,
    directions: 'Located off Highway 76 near Pala. Call ahead for directions and reservations.',
    parking_info: 'On-site parking available.',
    fees_cost: '$50 per person per day, keep what you find',
    materials: ['Topaz', 'Garnet'],
  },
  {
    name: 'Apache Tears Collecting Area',
    description:
      'BLM public land with abundant obsidian nodules (Apache Tears). Easy surface collecting.',
    lat: 32.9667,
    lon: -111.0833,
    state: 'AZ',
    county: 'Pinal',
    legal_tag: LegalTag.LEGAL_PUBLIC,
    legal_confidence: 90,
    access_model: 'PUBLIC_LAND',
    status: Status.OPEN,
    source_tier: SourceTier.OFFICIAL,
    verification_date: '2024-05-10T00:00:00Z',
    primary_ruleset_name: 'Arizona Rockhounding Guidelines',
    difficulty: 1,
    kid_friendly: true,
    directions: 'From Superior, AZ take US-60 east. Look for pullouts along highway.',
    parking_info: 'Roadside parking, watch for traffic.',
    fees_cost: 'Free',
    materials: ['Obsidian'],
  },
  {
    name: 'Fossil Creek Beds - Research Site',
    description:
      'Known fossil locality but legal status unclear. More research needed on land ownership.',
    lat: 34.5,
    lon: -118.25,
    state: 'CA',
    county: 'Los Angeles',
    legal_tag: LegalTag.RESEARCH_ONLY,
    legal_confidence: 40,
    access_model: 'UNKNOWN',
    status: Status.RESEARCH_REQUIRED,
    source_tier: SourceTier.COMMUNITY_STAGED,
    verification_date: null, // NULL because status=RESEARCH_REQUIRED
    primary_ruleset_name: 'California State Parks Rockhounding',
    difficulty: null,
    kid_friendly: false,
    directions: 'Location intentionally vague pending research',
    parking_info: 'Unknown',
    fees_cost: 'Unknown',
    materials: ['Ammonite', 'Brachiopod'],
  },
  {
    name: 'Turquoise Mountain',
    description:
      'Historic turquoise mining area. Claims overlap, some areas may be private or claimed.',
    lat: 35.2,
    lon: -114.5,
    state: 'AZ',
    county: 'Mohave',
    legal_tag: LegalTag.GRAY_AREA,
    legal_confidence: 50,
    access_model: 'PERMISSION_REQUIRED',
    status: Status.UNKNOWN,
    source_tier: SourceTier.SECONDARY,
    verification_date: '2023-11-05T00:00:00Z',
    primary_ruleset_name: 'Arizona State Trust Land',
    difficulty: 4,
    kid_friendly: false,
    directions: 'Access uncertain. Contact local BLM office before visiting.',
    parking_info: 'Unmaintained roads, 4WD required',
    fees_cost: 'Unknown - verify claim status first',
    materials: ['Turquoise'],
  },
  {
    name: 'Gem Mountain Sapphire Mine',
    description:
      'Commercial sapphire mining operation. Bags of ore available for purchase and processing.',
    lat: 46.5167,
    lon: -113.3833,
    state: 'MT',
    county: 'Granite',
    legal_tag: LegalTag.LEGAL_FEE_SITE,
    legal_confidence: 100,
    access_model: 'FEE_SITE',
    status: Status.SEASONAL,
    source_tier: SourceTier.OPERATOR,
    verification_date: '2024-07-01T00:00:00Z',
    primary_ruleset_name: 'Fee Dig Sites - Commercial Operations',
    difficulty: 2,
    kid_friendly: true,
    directions: 'Located near Philipsburg, MT. Well-marked from Highway 1.',
    parking_info: 'Large parking lot, RV accessible.',
    fees_cost: '$30-100 depending on bucket size',
    materials: ['Garnet'],
  },
  {
    name: 'Calcite Crystal Cave - Club Only',
    description:
      'Cave containing calcite formations. Access restricted to mineral club members only.',
    lat: 38.5,
    lon: -109.75,
    state: 'UT',
    county: 'Grand',
    legal_tag: LegalTag.LEGAL_CLUB_SUPERVISED,
    legal_confidence: 85,
    access_model: 'CLUB_ONLY',
    status: Status.OPEN,
    source_tier: SourceTier.SECONDARY,
    verification_date: '2024-03-15T00:00:00Z',
    primary_ruleset_name: 'BLM Rockhounding Rules',
    difficulty: 4,
    kid_friendly: false,
    directions: 'Exact location disclosed to club members only. Contact local mineral club.',
    parking_info: 'Accessed via unmarked dirt roads',
    fees_cost: 'Club membership required',
    materials: ['Calcite'],
  },
  {
    name: 'Petrified Forest Fragments',
    description:
      'Scattered petrified wood on BLM land near national monument boundary. Legal to collect small specimens.',
    lat: 34.9,
    lon: -109.8,
    state: 'AZ',
    county: 'Apache',
    legal_tag: LegalTag.LEGAL_PUBLIC,
    legal_confidence: 80,
    access_model: 'PUBLIC_LAND',
    status: Status.OPEN,
    source_tier: SourceTier.OFFICIAL,
    verification_date: '2024-04-20T00:00:00Z',
    primary_ruleset_name: 'BLM Rockhounding Rules',
    difficulty: 2,
    kid_friendly: true,
    directions: 'Along BLM roads south of Petrified Forest National Park. Stay outside park boundaries.',
    parking_info: 'Pull-off areas along dirt roads',
    fees_cost: 'Free',
    materials: ['Petrified Wood'],
  },
];

async function seedStagingLocations(): Promise<void> {
  logInfo(`Seeding ${STAGING_LOCATIONS.length} staging locations...`);

  // First, get all rulesets and materials for ID mapping
  const { data: rulesets, error: rulesetsError } = await supabase
    .from('rulesets')
    .select('id, name');

  if (rulesetsError) {
    handleDbError(rulesetsError, 'fetching rulesets');
  }

  if (!rulesets || rulesets.length === 0) {
    handleDbError(
      new Error('No rulesets found. Run seed_rulesets.ts first.'),
      'checking rulesets'
    );
  }

  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('id, name');

  if (materialsError) {
    handleDbError(materialsError, 'fetching materials');
  }

  if (!materials || materials.length === 0) {
    handleDbError(
      new Error('No materials found. Run seed_materials.ts first.'),
      'checking materials'
    );
  }

  // Create lookup map for rulesets
  const rulesetMap = new Map(rulesets.map((r) => [r.name, r.id]));

  for (const location of STAGING_LOCATIONS) {
    // Resolve primary_ruleset_id
    const primaryRulesetId = rulesetMap.get(location.primary_ruleset_name);
    if (!primaryRulesetId) {
      logInfo(`  ⚠️  Warning: Ruleset not found: ${location.primary_ruleset_name}`);
      continue;
    }

    // Insert staging location
    const { error: locationError } = await supabase
      .from('locations_staging')
      .upsert(
        {
          name: location.name,
          description: location.description,
          geom: `POINT(${location.lon} ${location.lat})`, // PostGIS WKT format
          lat: location.lat,
          lon: location.lon,
          state: location.state,
          county: location.county,
          legal_tag: location.legal_tag,
          legal_confidence: location.legal_confidence,
          access_model: location.access_model,
          status: location.status,
          source_tier: location.source_tier,
          verification_date: location.verification_date,
          primary_ruleset_id: primaryRulesetId,
          difficulty: location.difficulty,
          kid_friendly: location.kid_friendly,
          directions: location.directions,
          parking_info: location.parking_info,
          fees_cost: location.fees_cost,
          moderation_status: 'PENDING',
        },
        {
          onConflict: 'name',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (locationError) {
      handleDbError(locationError, `seeding staging location: ${location.name}`);
    }

    logInfo(`  - ${location.name} (${location.state}, ${location.legal_tag})`);
  }

  logSuccess(`Successfully seeded ${STAGING_LOCATIONS.length} staging locations`);
  logInfo('These locations are in PENDING moderation status and ready for admin review.');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedStagingLocations()
    .then(() => {
      logSuccess('Staging locations seed completed');
      process.exit(0);
    })
    .catch((error) => {
      handleDbError(error, 'seedStagingLocations');
    });
}

export { seedStagingLocations };

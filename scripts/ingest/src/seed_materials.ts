import { handleDbError, logInfo, logSuccess, supabase } from './db';

/**
 * Seed materials table with common rockhounding collectibles
 * Idempotent: Uses upsert with name as unique constraint
 */

interface Material {
  name: string;
  category: string;
  description: string;
}

const MATERIALS: Material[] = [
  // Minerals
  {
    name: 'Quartz',
    category: 'minerals',
    description: 'Common silicon dioxide mineral, often forms clear or milky crystals',
  },
  {
    name: 'Amethyst',
    category: 'minerals',
    description: 'Purple variety of quartz, highly sought after for its color',
  },
  {
    name: 'Calcite',
    category: 'minerals',
    description: 'Calcium carbonate mineral, often forms in sedimentary environments',
  },
  {
    name: 'Fluorite',
    category: 'minerals',
    description: 'Colorful calcium fluoride mineral, commonly purple, green, or blue',
  },
  {
    name: 'Pyrite',
    category: 'minerals',
    description: 'Iron sulfide, known as "fool\'s gold" due to metallic luster',
  },
  {
    name: 'Garnet',
    category: 'minerals',
    description: 'Group of silicate minerals, often red or burgundy crystals',
  },
  {
    name: 'Turquoise',
    category: 'minerals',
    description: 'Blue-green copper aluminum phosphate, prized for jewelry',
  },

  // Gemstones
  {
    name: 'Agate',
    category: 'gemstones',
    description: 'Banded variety of chalcedony, often with colorful patterns',
  },
  {
    name: 'Jasper',
    category: 'gemstones',
    description: 'Opaque variety of quartz, available in many colors',
  },
  {
    name: 'Opal',
    category: 'gemstones',
    description: 'Hydrated silica with internal play of colors',
  },
  {
    name: 'Topaz',
    category: 'gemstones',
    description: 'Aluminum silicate fluoride mineral, often yellow or blue',
  },

  // Rocks
  {
    name: 'Obsidian',
    category: 'rocks',
    description: 'Volcanic glass formed from rapidly cooled lava',
  },
  {
    name: 'Petrified Wood',
    category: 'rocks',
    description: 'Fossilized wood where organic material is replaced by minerals',
  },
  {
    name: 'Geode',
    category: 'rocks',
    description: 'Rounded rock containing a hollow cavity lined with crystals',
  },

  // Fossils
  {
    name: 'Trilobite',
    category: 'fossils',
    description: 'Extinct marine arthropod, common in Paleozoic rocks',
  },
  {
    name: 'Ammonite',
    category: 'fossils',
    description: 'Extinct marine mollusk with spiral shell',
  },
  {
    name: 'Brachiopod',
    category: 'fossils',
    description: 'Marine invertebrate with two-part shell, resembles clams',
  },

  // Specialty
  {
    name: 'Gold',
    category: 'minerals',
    description: 'Native metallic element, highly valued precious metal',
  },
  {
    name: 'Selenite',
    category: 'minerals',
    description: 'Crystalline variety of gypsum, often forms large transparent crystals',
  },
];

async function seedMaterials(): Promise<void> {
  logInfo(`Seeding ${MATERIALS.length} materials...`);

  for (const material of MATERIALS) {
    const { error } = await supabase.from('materials').upsert(
      {
        name: material.name,
        category: material.category,
        description: material.description,
      },
      {
        onConflict: 'name',
        ignoreDuplicates: false, // Update if exists
      }
    );

    if (error) {
      handleDbError(error, `seeding material: ${material.name}`);
    }

    logInfo(`  - ${material.name} (${material.category})`);
  }

  logSuccess(`Successfully seeded ${MATERIALS.length} materials`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMaterials()
    .then(() => {
      logSuccess('Materials seed completed');
      process.exit(0);
    })
    .catch((error) => {
      handleDbError(error, 'seedMaterials');
    });
}

export { seedMaterials };

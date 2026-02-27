/**
 * Generate State Packs - Supabase Edge Function
 * Build Document Step 11: Background job to generate state packs
 *
 * Flow:
 * 1. Get list of all states with approved locations
 * 2. For each state:
 *    - Query all approved locations in state
 *    - Query referenced rulesets
 *    - Query referenced materials
 *    - Build vector-only JSON pack
 *    - Upload to Supabase Storage
 *    - Update/insert state_packs table record
 *
 * Deploy: supabase functions deploy state-packs
 * Schedule: Run nightly via pg_cron or external scheduler
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  legal_tag: string;
  access_model: string;
  difficulty: number;
  kid_friendly: boolean;
  status: string;
  state: string;
}

interface Ruleset {
  id: string;
  legal_tag: string;
  body: string;
}

interface Material {
  id: string;
  name: string;
  category: string;
}

interface StatePackContent {
  state: string;
  generated_at: string;
  locations: any[];
  rulesets: Ruleset[];
  materials: Material[];
  metadata: {
    version: string;
    location_count: number;
    ruleset_count: number;
    material_count: number;
  };
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get all states with approved locations
    const { data: states, error: statesError } = await supabase
      .from('locations')
      .select('state')
      .eq('status', 'approved')
      .not('state', 'is', null);

    if (statesError) {
      throw new Error(`Failed to fetch states: ${statesError.message}`);
    }

    // Get unique states
    const uniqueStates = [...new Set(states?.map((s) => s.state) || [])];

    if (uniqueStates.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No states with approved locations found' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Process each state
    const results = await Promise.allSettled(
      uniqueStates.map((state) => generateStatePack(supabase, state))
    );

    const summary = {
      total_states: uniqueStates.length,
      succeeded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      states_processed: uniqueStates,
    };

    return new Response(
      JSON.stringify({ message: 'State packs generated', summary }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Generate state packs error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Generate a single state pack
 */
async function generateStatePack(supabase: any, state: string) {
  try {
    console.log(`Generating pack for ${state}...`);

    // 1. Query all approved locations in state
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, latitude, longitude, legal_tag, access_model, difficulty, kid_friendly, status, state')
      .eq('state', state)
      .eq('status', 'approved')
      .order('name', { ascending: true });

    if (locationsError) {
      throw new Error(`Failed to query locations: ${locationsError.message}`);
    }

    if (!locations || locations.length === 0) {
      console.log(`No approved locations found for ${state}`);
      return;
    }

    // 2. Get unique legal tags from locations
    const legalTags = [...new Set(locations.map((loc: Location) => loc.legal_tag))];

    // 3. Query rulesets for those legal tags
    const { data: rulesets, error: rulesetsError } = await supabase
      .from('rulesets')
      .select('id, legal_tag, body')
      .in('legal_tag', legalTags);

    if (rulesetsError) {
      console.error(`Failed to query rulesets: ${rulesetsError.message}`);
    }

    // 4. Get all location-material relationships for this state
    const locationIds = locations.map((loc: Location) => loc.id);
    const { data: locationMaterials, error: locationMaterialsError } = await supabase
      .from('location_materials')
      .select('material_id')
      .in('location_id', locationIds);

    if (locationMaterialsError) {
      console.error(`Failed to query location_materials: ${locationMaterialsError.message}`);
    }

    // 5. Query materials referenced by locations
    const materialIds = [
      ...new Set(locationMaterials?.map((lm: any) => lm.material_id) || []),
    ];

    let materials: Material[] = [];
    if (materialIds.length > 0) {
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id, name, category')
        .in('id', materialIds);

      if (materialsError) {
        console.error(`Failed to query materials: ${materialsError.message}`);
      } else {
        materials = materialsData || [];
      }
    }

    // 6. Build state pack content (vector-only)
    const packContent: StatePackContent = {
      state,
      generated_at: new Date().toISOString(),
      locations: locations.map((loc: Location) => ({
        id: loc.id,
        name: loc.name,
        lat: loc.latitude,
        lon: loc.longitude,
        legal_tag: loc.legal_tag,
        access_model: loc.access_model,
        difficulty: loc.difficulty,
        kid_friendly: loc.kid_friendly,
        status: loc.status,
      })),
      rulesets: rulesets || [],
      materials,
      metadata: {
        version: '1.0',
        location_count: locations.length,
        ruleset_count: (rulesets || []).length,
        material_count: materials.length,
      },
    };

    // 7. Convert to JSON
    const jsonContent = JSON.stringify(packContent, null, 2);
    const fileSize = new Blob([jsonContent]).size;

    // 8. Upload to Supabase Storage
    const filePath = `${state}.json`;
    const { error: uploadError } = await supabase.storage
      .from('state-packs')
      .upload(filePath, jsonContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 9. Update/insert state_packs table record
    const { error: upsertError } = await supabase
      .from('state_packs')
      .upsert(
        {
          state,
          file_path: filePath,
          size_bytes: fileSize,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'state',
        }
      );

    if (upsertError) {
      throw new Error(`Failed to update state_packs table: ${upsertError.message}`);
    }

    console.log(`Successfully generated pack for ${state}: ${locations.length} locations, ${fileSize} bytes`);
  } catch (error) {
    console.error(`Failed to generate pack for ${state}:`, error);
    throw error;
  }
}

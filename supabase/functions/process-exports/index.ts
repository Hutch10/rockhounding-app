/**
 * Process Exports - Supabase Edge Function
 * Build Document Step 10: Background job to process export jobs
 *
 * Flow:
 * 1. Poll for PENDING exports
 * 2. Mark as RUNNING
 * 3. Query locations based on scope/filters
 * 4. Generate format-specific file (GeoJSON/KML/CSV)
 * 5. Upload to Supabase Storage
 * 6. Mark as COMPLETE with file_path
 * 7. Handle errors (mark as FAILED)
 *
 * Deploy: supabase functions deploy process-exports
 * Schedule: Run every minute via pg_cron or external scheduler
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Export {
  id: string;
  user_id: string;
  format: 'geojson' | 'kml' | 'csv';
  scope: 'single_location_id' | 'bbox' | 'state';
  scope_params: any;
  filters: any;
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch PENDING exports
    const { data: pendingExports, error: fetchError } = await supabase
      .from('exports')
      .select('*')
      .eq('status', 'PENDING')
      .limit(5); // Process up to 5 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch pending exports: ${fetchError.message}`);
    }

    if (!pendingExports || pendingExports.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending exports' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Process each export
    const results = await Promise.allSettled(
      pendingExports.map((exp) => processExport(supabase, exp))
    );

    const summary = {
      processed: results.length,
      succeeded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };

    return new Response(
      JSON.stringify({ message: 'Exports processed', summary }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Process exports error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Process a single export job
 */
async function processExport(supabase: any, exportJob: Export) {
  try {
    // Mark as RUNNING
    await supabase
      .from('exports')
      .update({ status: 'RUNNING' })
      .eq('id', exportJob.id);

    // Query locations based on scope
    const locations = await queryLocations(supabase, exportJob);

    if (locations.length === 0) {
      throw new Error('No locations found for the specified scope/filters');
    }

    // Generate file based on format
    let fileContent: string;
    let fileExtension: string;
    let mimeType: string;

    switch (exportJob.format) {
      case 'geojson':
        fileContent = generateGeoJSON(locations);
        fileExtension = 'geojson';
        mimeType = 'application/geo+json';
        break;
      case 'kml':
        fileContent = generateKML(locations);
        fileExtension = 'kml';
        mimeType = 'application/vnd.google-earth.kml+xml';
        break;
      case 'csv':
        fileContent = generateCSV(locations);
        fileExtension = 'csv';
        mimeType = 'text/csv';
        break;
      default:
        throw new Error('Unsupported format');
    }

    // Upload to Supabase Storage
    const filePath = `${exportJob.user_id}/${exportJob.id}.${fileExtension}`;
    const { error: uploadError } = await supabase
      .storage
      .from('exports')
      .upload(filePath, fileContent, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Mark as COMPLETE
    await supabase
      .from('exports')
      .update({
        status: 'COMPLETE',
        file_path: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportJob.id);

    console.log(`Export ${exportJob.id} completed successfully`);
  } catch (error) {
    console.error(`Export ${exportJob.id} failed:`, error);

    // Mark as FAILED
    await supabase
      .from('exports')
      .update({
        status: 'FAILED',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportJob.id);
  }
}

/**
 * Query locations based on scope and filters
 */
async function queryLocations(supabase: any, exportJob: Export) {
  let query = supabase
    .from('locations')
    .select(`
      id,
      name,
      description,
      latitude,
      longitude,
      state,
      difficulty,
      kid_friendly,
      legal_tag,
      access_model,
      fee_amount_cents,
      created_at
    `)
    .eq('status', 'approved'); // Only approved locations

  // Apply scope
  if (exportJob.scope === 'single_location_id') {
    query = query.eq('id', exportJob.scope_params.location_id);
  } else if (exportJob.scope === 'bbox') {
    const { min_lng, max_lng, min_lat, max_lat } = exportJob.scope_params;
    query = query
      .gte('longitude', min_lng)
      .lte('longitude', max_lng)
      .gte('latitude', min_lat)
      .lte('latitude', max_lat);
  } else if (exportJob.scope === 'state') {
    query = query.eq('state', exportJob.scope_params.state);
  }

  // Apply filters
  if (exportJob.filters) {
    if (exportJob.filters.legal_tag) {
      query = query.eq('legal_tag', exportJob.filters.legal_tag);
    }
    if (exportJob.filters.access_model) {
      query = query.eq('access_model', exportJob.filters.access_model);
    }
    if (exportJob.filters.difficulty_max) {
      query = query.lte('difficulty', exportJob.filters.difficulty_max);
    }
    if (exportJob.filters.kid_friendly === true) {
      query = query.eq('kid_friendly', true);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Generate GeoJSON format
 */
function generateGeoJSON(locations: any[]): string {
  const features = locations.map((loc) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [loc.longitude, loc.latitude],
    },
    properties: {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      state: loc.state,
      difficulty: loc.difficulty,
      kid_friendly: loc.kid_friendly,
      legal_tag: loc.legal_tag,
      access_model: loc.access_model,
      fee_amount_cents: loc.fee_amount_cents,
      created_at: loc.created_at,
    },
  }));

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features,
    },
    null,
    2
  );
}

/**
 * Generate KML format
 */
function generateKML(locations: any[]): string {
  const placemarks = locations
    .map(
      (loc) => `
    <Placemark>
      <name>${escapeXml(loc.name)}</name>
      <description><![CDATA[
        <p>${escapeXml(loc.description || '')}</p>
        <p><strong>State:</strong> ${loc.state}</p>
        <p><strong>Difficulty:</strong> ${loc.difficulty}/5</p>
        <p><strong>Kid Friendly:</strong> ${loc.kid_friendly ? 'Yes' : 'No'}</p>
        <p><strong>Legal Tag:</strong> ${loc.legal_tag}</p>
        <p><strong>Access Model:</strong> ${loc.access_model}</p>
      ]]></description>
      <Point>
        <coordinates>${loc.longitude},${loc.latitude},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Rockhounding Locations</name>
    ${placemarks}
  </Document>
</kml>`;
}

/**
 * Generate CSV format
 */
function generateCSV(locations: any[]): string {
  const headers = [
    'id',
    'name',
    'description',
    'latitude',
    'longitude',
    'state',
    'difficulty',
    'kid_friendly',
    'legal_tag',
    'access_model',
    'fee_amount_cents',
    'created_at',
  ];

  const rows = locations.map((loc) =>
    headers.map((header) => {
      const value = loc[header];
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

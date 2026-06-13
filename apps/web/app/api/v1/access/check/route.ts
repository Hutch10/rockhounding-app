/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment */
import { AccessCheckRequestSchema, AccessCheckResponseSchema } from '@rockhounding/shared';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * ACCESS CHECK API (V1)
 *
 * Performs high-precision geospatial intersection to determine legal
 * collection status at a specific coordinate.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = AccessCheckRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const { lat, lon, material_id } = validated.data;
    const supabase = createClient();

    // Call the V2 hardened RPC
    const { data, error } = await supabase.rpc('rpc_check_access_v2', {
      p_lat: lat,
      p_lon: lon,
      p_material_id: material_id || null,
    });

    if (error) {
      console.error('Access Check RPC Error:', error);
      return NextResponse.json({ error: 'Geospatial engine failure' }, { status: 500 });
    }

    // Validate the RPC response against the contract
    const response = AccessCheckResponseSchema.safeParse(data);
    if (!response.success) {
      console.error('Access Contract Violation:', response.error);
      // Even if contract fails, we return the raw data but log the error
      return NextResponse.json(data);
    }

    return NextResponse.json(response.data);
  } catch (e) {
    console.error('Access API Critical Error:', e);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}

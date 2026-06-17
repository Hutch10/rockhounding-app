import { ProfileV1Schema } from '@rockhounding/shared';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url: string | null;
  reputation_score: number;
  trust_level?: number;
  is_admin?: boolean;
  preferences?: Record<string, unknown> | null;
  created_at: string;
}

function mapProfileRow(row: ProfileRow): ReturnType<typeof ProfileV1Schema.parse> {
  return ProfileV1Schema.parse({
    id: row.id,
    username: row.username,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url,
    reputation_score: row.reputation_score,
    trust_level: row.trust_level ?? 1,
    is_admin: row.is_admin ?? false,
    preferences: row.preferences ?? {},
    created_at: row.created_at,
  });
}

/**
 * API-005: GET /api/v1/me — authenticated ProfileV1
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user == null) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, reputation_score, trust_level, is_admin, preferences, created_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error != null) {
      console.error('[v1/me] profile query error:', error);
      return NextResponse.json(
        { error: 'Failed to load profile', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (data == null) {
      const fallback = mapProfileRow({
        id: user.id,
        username: (user.user_metadata.username as string | undefined) ?? null,
        display_name: (user.user_metadata.display_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
        reputation_score: 100,
        trust_level: 1,
        is_admin: false,
        preferences: {},
        created_at: user.created_at,
      });
      return NextResponse.json(fallback, { status: 200 });
    }

    const profile = mapProfileRow(data as ProfileRow);
    return NextResponse.json(profile, { status: 200 });
  } catch (err) {
    console.error('[v1/me] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

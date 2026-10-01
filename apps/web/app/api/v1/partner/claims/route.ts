import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  handleListMyClaims,
  handleRevokeClaim,
  handleSubmitClaim,
  handleVerifyClaim,
} from '@/lib/partner/handlers';

export const dynamic = 'force-dynamic';

async function requireUser(): Promise<{ userId: string } | { error: NextResponse }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) {
    return {
      error: NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }
  return { userId: user.id };
}

/** GET /api/v1/partner/claims — list authenticated user's claims */
export async function GET(): Promise<NextResponse> {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ claims: handleListMyClaims(auth.userId) });
}

/** POST /api/v1/partner/claims — submit claim (always PENDING) */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  const result = handleSubmitClaim(auth.userId, body as never);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, code: result.code },
      { status: result.code === 'UNAUTHENTICATED' ? 401 : 403 }
    );
  }
  return NextResponse.json({ claim: result.claim }, { status: 201 });
}

/**
 * PATCH /api/v1/partner/claims — admin verify or revoke
 * body: { claim_id, action: 'verify' | 'revoke', reason?: string }
 * Uses profiles.is_admin when available; otherwise rejects.
 * Local/staging only until Production authorization — never fabricate operators.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', auth.userId)
    .maybeSingle();

  if (profile?.is_admin !== true) {
    return NextResponse.json({ error: 'Admin required', code: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { claim_id?: string; action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.claim_id || (body.action !== 'verify' && body.action !== 'revoke')) {
    return NextResponse.json(
      { error: 'Unsupported action', code: 'INVALID_ACTION' },
      { status: 400 }
    );
  }

  if (body.action === 'revoke') {
    const reason =
      typeof body.reason === 'string' && body.reason.trim().length > 0
        ? body.reason.trim()
        : 'Admin revocation';
    const result = handleRevokeClaim(body.claim_id, reason);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason, code: result.code }, { status: 400 });
    }
    return NextResponse.json({ claim: result.claim });
  }

  const result = handleVerifyClaim(body.claim_id, auth.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason, code: result.code }, { status: 400 });
  }
  return NextResponse.json({ claim: result.claim });
}

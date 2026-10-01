import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { handleDeleteProvenanceAttempt, handlePartnerFieldUpdate } from '@/lib/partner/handlers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/partner/sites/[id]/update
 * Body: { field, value, reason? }
 * Fail-closed allowlist enforcement (UI bypass still hits authorizePartnerFieldMutation).
 */
export async function POST(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { field?: string; value?: unknown; reason?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  if (body.action === 'delete_provenance') {
    const denied = handleDeleteProvenanceAttempt(user.id);
    return NextResponse.json({ error: denied.reason, code: denied.code }, { status: 403 });
  }

  if (!body.field) {
    return NextResponse.json({ error: 'field required', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const result = handlePartnerFieldUpdate({
    userId: user.id,
    siteId: context.params.id,
    field: body.field,
    value: body.value,
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason, code: result.code }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    moderation: result.moderation,
    provenance: result.provenance,
  });
}

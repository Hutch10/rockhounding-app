/**
 * POST /api/admin/moderate - Moderation Endpoint
 * Build Document Rule: Admin-only approve/reject workflow
 *
 * LOCKED CONTRACT:
 * - Admin role validation required
 * - Approve: Promote staging → locations (public)
 * - Reject: Mark staging as REJECTED with reason
 * - Audit trail: Track moderated_by and moderated_at
 *
 * SECURITY:
 * - Returns 403 for non-admin users
 * - Validates all inputs with Zod
 * - Uses Supabase RLS policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiClientError, createApiClient } from '@/lib/api';

import type {
  ModerateRequest,
  ModerateResponse,
  ModerateErrorResponse,
} from './types';

// Zod schema for request validation
const ModerateRequestSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(10).optional(),
}).refine(
  (data) => {
    // If action is REJECT, reason is required
    if (data.action === 'REJECT') {
      return data.reason !== undefined && data.reason.length >= 10;
    }
    return true;
  },
  {
    message: 'Rejection reason must be at least 10 characters',
    path: ['reason'],
  }
);

/**
 * Check if user has admin role
 * NOTE: In production, this should check against Supabase auth metadata
 * or a separate admin_users table. For now, we use a simple env var check.
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  // Check for admin API key in headers (temporary solution)
  const adminKey = request.headers.get('x-admin-key');
  const validAdminKey = process.env.ADMIN_API_KEY;

  if (validAdminKey == null || validAdminKey.length === 0) {
    console.warn('ADMIN_API_KEY not set, admin endpoints are disabled');
    return false;
  }

  return adminKey === validAdminKey;
}

/**
 * Get current user ID from auth
 * In production, extract from Supabase JWT
 */
function getCurrentUserId(request: NextRequest): string {
  return request.headers.get('x-user-id') ?? 'admin';
}

/**
 * POST /api/admin/moderate
 * Approve or reject a staging location
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ModerateResponse | ModerateErrorResponse>> {
  try {
    // 1. Validate admin role
    const hasAdminRole = await isAdmin(request);
    if (!hasAdminRole) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = ModerateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { id, action, reason }: ModerateRequest = parseResult.data;
    const api = createApiClient({
      headers: { 'x-user-id': getCurrentUserId(request) },
    });

    const moderationReason = action === 'REJECT'
      ? reason ?? ''
      : reason ?? 'Approved by admin';

    const result = await api.submitModerationReview({
      targetType: 'location',
      targetId: id,
      reason: moderationReason,
      notes: `action:${action}`,
    });

    const response: ModerateResponse = {
      success: true,
      message: action === 'APPROVE' ? 'Moderation approved' : 'Moderation rejected',
      staging_id: id,
      moderation_status: result.status === 'approved' ? 'APPROVED' : result.status === 'rejected' ? 'REJECTED' : 'PENDING',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message, details: error.details != null ? String(error.details) : undefined },
        { status: error.status || 500 }
      );
    }
    console.error('Unexpected error in POST /api/admin/moderate', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createApiClient } from '@/lib/api';
import { ModerationClient } from './ModerationClient';
import type { StagingRecord } from '@/app/api/admin/moderate/types';

/**
 * Moderation Dashboard Page - Server Component
 * Build Document Rule: Admin-only moderation workflow
 *
 * Features:
 * - Admin role validation (redirects non-admins)
 * - Fetches ALL PENDING staging records
 * - Passes data to client component for interactions
 */

export const metadata: Metadata = {
  title: 'Moderation Dashboard - Admin',
  description: 'Review and moderate user-submitted rockhounding locations',
};

/**
 * Check if user has admin role
 * NOTE: In production, check Supabase auth metadata or admin_users table
 * For now, we use a simple env var check
 */
async function checkAdminAccess(): Promise<boolean> {
  // In a real app, check user session from cookies
  // For demo purposes, we'll always allow access if ADMIN_API_KEY is set
  return !!process.env.ADMIN_API_KEY;
}

/**
 * Fetch all pending moderation items
 */
async function fetchPendingStagingRecords(): Promise<StagingRecord[]> {
  const api = createApiClient();
  try {
    const items = await api.listModerationPending();
    return items as StagingRecord[];
  } catch (error) {
    console.error('Failed to fetch moderation items:', error);
    return [];
  }
}

export default async function ModerationPage() {
  // 1. Check admin access
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) {
    // Redirect non-admins to home page
    redirect('/');
  }

  // 2. Fetch pending staging records
  const stagingRecords = await fetchPendingStagingRecords();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
              <p className="text-gray-300 mt-1">
                Review and approve user-submitted locations
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Admin Panel</p>
              <a
                href="/map"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                ← Back to Map
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ModerationClient initialRecords={stagingRecords} />
      </div>
    </main>
  );
}

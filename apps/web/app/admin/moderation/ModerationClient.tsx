'use client';

/**
 * Moderation Client Component
 * Build Document Rule: Interactive moderation dashboard
 *
 * Features:
 * - Displays list of PENDING staging records
 * - Handles approve/reject actions
 * - Refreshes data after moderation
 * - Shows success/error messages
 */

import { useState } from 'react';
import type { StagingRecord } from '@/app/api/admin/moderate/types';
import { StagingList } from './components/StagingList';
import { StagingDetail } from './components/StagingDetail';

interface ModerationClientProps {
  initialRecords: StagingRecord[];
}

export function ModerationClient({ initialRecords }: ModerationClientProps) {
  const [records, setRecords] = useState<StagingRecord[]>(initialRecords);
  const [selectedRecord, setSelectedRecord] = useState<StagingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  /**
   * Refresh staging records from server
   */
  const refreshRecords = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from an API endpoint
      // For now, we'll just remove the selected record from the list
      // since we can't easily re-fetch in the client component
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh records:', error);
      setMessage({
        type: 'error',
        text: 'Failed to refresh records',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle approve action
   */
  const handleApprove = async (id: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'APPROVE',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve');
      }

      setMessage({
        type: 'success',
        text: 'Moderation approved successfully',
      });

      // Remove from list
      setRecords(records.filter((r) => r.id !== id));
      setSelectedRecord(null);
    } catch (error) {
      console.error('Failed to approve:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to approve',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle reject action
   */
  const handleReject = async (id: string, reason: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'REJECT',
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject');
      }

      setMessage({
        type: 'success',
        text: 'Moderation rejected successfully',
      });

      // Remove from list
      setRecords(records.filter((r) => r.id !== id));
      setSelectedRecord(null);
    } catch (error) {
      console.error('Failed to reject:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reject',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {records.length}
            </h2>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
          <div className="text-right">
            <button
              onClick={refreshRecords}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staging List */}
        <div className="lg:col-span-2">
          <StagingList
            records={records}
            selectedId={selectedRecord?.id}
            onSelectRecord={setSelectedRecord}
          />
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedRecord ? (
            <StagingDetail
              record={selectedRecord}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={isLoading}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-center">
                Select an item to review
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


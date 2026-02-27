'use client';

/**
 * Staging Detail Component
 * Build Document Rule: Detail drawer with approve/reject actions
 *
 * Shows:
 * - Target metadata
 * - Approve/reject controls
 */

import { useState } from 'react';
import type { StagingRecord } from '@/app/api/admin/moderate/types';

interface StagingDetailProps {
  record: StagingRecord;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

export function StagingDetail({
  record,
  onApprove,
  onReject,
  isLoading,
}: StagingDetailProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (window.confirm('Are you sure you want to APPROVE this item?')) {
      await onApprove(record.id);
    }
  };

  const handleReject = async () => {
    if (rejectionReason.length < 10) {
      alert('Rejection reason must be at least 10 characters');
      return;
    }

    if (window.confirm('Are you sure you want to REJECT this item?')) {
      await onReject(record.id, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden sticky top-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Moderation Details</h2>
        <p className="text-sm text-gray-500 mt-1">Review before moderating</p>
      </div>

      {/* Content */}
      <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Target Type
            </label>
            <p className="text-sm text-gray-900 mt-1">{record.targetType}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Target ID
            </label>
            <p className="text-sm text-gray-900 mt-1 break-all">{record.targetId}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Status
            </label>
            <p className="text-sm text-gray-900 mt-1">{record.status}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Created At
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(record.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        {!showRejectForm ? (
          <div className="space-y-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition-colors"
            >
              ✓ Approve
            </button>

            <button
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a clear reason for rejection (min 10 characters)..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/10 characters minimum
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isLoading || rejectionReason.length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold text-sm transition-colors"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

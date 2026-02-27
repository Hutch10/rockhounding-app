'use client';

/**
 * Exports List Client Component
 * Build Document Step 10: Display export jobs with download buttons
 */

import { useState } from 'react';
import type { ExportDetail, ExportSummary } from '@/lib/api';

interface ExportsListProps {
  exports: ExportSummary[];
}

export function ExportsList({ exports: initialExports }: ExportsListProps) {
  const [exports, setExports] = useState<ExportSummary[]>(initialExports);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  /**
   * Refresh a specific export to check status
   */
  async function refreshExport(exportId: string) {
    setRefreshing(exportId);
    try {
      const response = await fetch(`/api/exports/${exportId}`, {
        headers: {
          'x-user-id': 'demo-user', // Temporary
        },
      });

      if (response.ok) {
        const updated: ExportDetail = await response.json();
        setExports((prev) =>
          prev.map((exp) =>
            exp.id === exportId
              ? { ...exp, status: updated.status }
              : exp
          )
        );
      }
    } catch (error) {
      console.error('Failed to refresh export:', error);
    } finally {
      setRefreshing(null);
    }
  }

  /**
   * Download export file
   */
  async function downloadExport(exportId: string) {
    try {
      const response = await fetch(`/api/exports/${exportId}`, {
        headers: {
          'x-user-id': 'demo-user', // Temporary
        },
      });

      if (response.ok) {
        const data: ExportDetail = await response.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Failed to download export:', error);
    }
  }

  return (
    <div className="space-y-4">
      {exports.map((exportJob) => (
        <div
          key={exportJob.id}
          className="bg-white rounded-lg shadow p-6 border border-gray-200"
        >
          <div className="flex items-start justify-between">
            {/* Export Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {exportJob.type.toUpperCase()} Export
                </h3>
                <StatusBadge status={exportJob.status} />
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Type:</strong> {formatType(exportJob.type)}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(exportJob.createdAt).toLocaleString()}
                </p>
                {typeof (exportJob as ExportDetail).errorMessage === 'string' && (
                  <p className="text-red-600">
                    <strong>Error:</strong> {(exportJob as ExportDetail).errorMessage}
                  </p>
                )}
              </div>

            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 ml-4">
              {exportJob.status === 'complete' && (
                <button
                  onClick={() => downloadExport(exportJob.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
                >
                  📥 Download
                </button>
              )}
              
              {(exportJob.status === 'pending' || exportJob.status === 'processing') && (
                <button
                  onClick={() => refreshExport(exportJob.id)}
                  disabled={refreshing === exportJob.id}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {refreshing === exportJob.id ? '⏳ Refreshing...' : '🔄 Refresh'}
                </button>
              )}

              {exportJob.status === 'failed' && (
                <button
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium text-sm cursor-not-allowed"
                  disabled
                >
                  ❌ Failed
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Format scope for display
 */
function formatType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

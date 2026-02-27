/**
 * New Export Page
 * Build Document Step 10: Form to create new export job
 */

import Link from 'next/link';
import { ExportForm } from './ExportForm';

export default function NewExportPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/exports"
          className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
        >
          ← Back to Exports
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Export</h1>
        <p className="text-gray-600 mt-2">
          Download rockhounding location data in your preferred format
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <ExportForm />
      </div>

      {/* Help Card */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Export Types</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <strong className="text-gray-900">Full Dataset:</strong> Everything available in a single export.
          </div>
          <div>
            <strong className="text-gray-900">Observations:</strong> Field notes and user observation entries.
          </div>
          <div>
            <strong className="text-gray-900">Collections/Materials:</strong> Metadata for curated sets and materials.
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Export generation may take a few moments for large datasets.
            You'll be able to download the file once processing is complete.
          </p>
        </div>
      </div>
    </div>
  );
}

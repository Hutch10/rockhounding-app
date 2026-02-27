/**
 * Storage Analytics Page
 * 
 * Storage location-level analytics with capacity management
 */

'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useStorageLocationAnalyticsList } from '@/app/hooks/useAnalytics';
import {
  GridLayout,
  SectionHeader,
  LoadingSpinner,
  ProgressBar,
  Badge,
  EmptyState,
} from '@/app/components/ui';
import { CubeIcon } from '@heroicons/react/24/outline';

export default function StoragePage() {
  const userId = 'current-user-id';
  const { data: storageList, isLoading, error } = useStorageLocationAnalyticsList(userId);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading storage analytics..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load storage analytics</p>
      </div>
    );
  }

  if (!storageList || storageList.length === 0) {
    return (
      <EmptyState
        icon={<CubeIcon className="h-12 w-12 text-gray-400" />}
        title="No storage locations"
        description="Create storage locations to track capacity and organization"
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Storage Analytics"
        description={`${storageList.length} storage locations`}
      />

      <GridLayout cols={3}>
        {storageList.map((storage) => {
          const utilizationColor = 
            storage.is_at_capacity ? 'red' :
            storage.is_nearly_full ? 'yellow' :
            'green';

          return (
            <Link
              key={storage.storage_location_id}
              href={`/dashboard/storage/${storage.storage_location_id}`}
              className="block hover:scale-[1.02] transition-transform"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {storage.location_name}
                    </h3>
                    {storage.is_at_capacity && (
                      <Badge variant="error" size="sm">Full</Badge>
                    )}
                    {storage.is_nearly_full && !storage.is_at_capacity && (
                      <Badge variant="warning" size="sm">Nearly Full</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {storage.location_code} • {storage.location_type}
                  </p>
                </div>

                {/* Capacity */}
                {storage.capacity && (
                  <div className="mb-4">
                    <ProgressBar
                      value={storage.current_count}
                      max={storage.capacity}
                      color={utilizationColor}
                      label="Capacity"
                    />
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Specimens</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {storage.current_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Materials</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {storage.unique_materials}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Weight</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {storage.total_weight_grams.toFixed(0)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${storage.total_estimated_value.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Top Materials */}
                {storage.materials_stored && storage.materials_stored.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Top Materials
                    </p>
                    <div className="space-y-1">
                      {storage.materials_stored.slice(0, 3).map((material: any) => (
                        <div key={material.material_id} className="text-xs text-gray-700 dark:text-gray-300">
                          {material.material_name} ({material.count})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nested Locations */}
                {storage.child_location_count && storage.child_location_count > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {storage.child_location_count} nested location(s)
                    </p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </GridLayout>
    </div>
  );
}

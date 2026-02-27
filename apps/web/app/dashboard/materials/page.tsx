/**
 * Material Analytics Page
 */

'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useMaterialAnalyticsList } from '@/app/hooks/useAnalytics';
import { 
  GridLayout, 
  SectionHeader, 
  LoadingSpinner,
  EmptyState,
} from '@/app/components/ui';
import { BeakerIcon } from '@heroicons/react/24/outline';

export default function MaterialsPage() {
  const userId = 'current-user-id';
  const { data: materialList, isLoading } = useMaterialAnalyticsList(userId);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading material analytics..." />;
  }

  if (!materialList || materialList.length === 0) {
    return (
      <EmptyState
        icon={<BeakerIcon className="h-12 w-12 text-gray-400" />}
        title="No materials found"
        description="Add specimens to see material analytics"
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Material Analytics"
        description={`${materialList.length} unique materials`}
      />

      <GridLayout cols={3}>
        {materialList.map((material) => (
          <Link
            key={`${material.material_id}-${material.user_id}`}
            href={`/dashboard/materials/${material.material_id}`}
            className="block hover:scale-[1.02] transition-transform"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {material.material_name}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Specimens</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {material.specimen_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Varieties</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {material.unique_varieties}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Weight</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {material.total_weight_grams.toFixed(0)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${material.total_estimated_value.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Added (30d)</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{material.specimens_added_last_30_days}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </GridLayout>
    </div>
  );
}

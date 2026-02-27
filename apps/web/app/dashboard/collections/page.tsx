/**
 * Collection Groups Analytics Page
 */

'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useCollectionGroupAnalyticsList } from '@/app/hooks/useAnalytics';
import { 
  GridLayout, 
  SectionHeader, 
  LoadingSpinner,
  Badge,
  EmptyState,
} from '@/app/components/ui';
import { FolderIcon } from '@heroicons/react/24/outline';

export default function CollectionsPage() {
  const userId = 'current-user-id';
  const { data: collectionList, isLoading } = useCollectionGroupAnalyticsList(userId);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading collection analytics..." />;
  }

  if (!collectionList || collectionList.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon className="h-12 w-12 text-gray-400" />}
        title="No collections found"
        description="Create collections to group related specimens"
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Collection Analytics"
        description={`${collectionList.length} collections`}
      />

      <GridLayout cols={2}>
        {collectionList.map((collection) => (
          <Link
            key={collection.collection_group_id}
            href={`/dashboard/collections/${collection.collection_group_id}` as any}
            className="block hover:scale-[1.01] transition-transform"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {collection.group_name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge size="sm">{collection.group_type}</Badge>
                    {collection.is_public && <Badge variant="info" size="sm">Public</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Specimens</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {collection.specimen_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Materials</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {collection.unique_materials}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {(collection.total_weight_grams / 1000).toFixed(1)}kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Value</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${(collection.total_estimated_value / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Growth (30d)</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{collection.specimens_added_last_30_days}
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

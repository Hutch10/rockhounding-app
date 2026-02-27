/**
 * Tag Analytics Page
 */

'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useTagAnalyticsList } from '@/app/hooks/useAnalytics';
import { 
  GridLayout, 
  SectionHeader, 
  LoadingSpinner,
  Badge,
  EmptyState,
} from '@/app/components/ui';

import { TagIcon } from '@heroicons/react/24/outline';

export default function TagsPage() {
  const userId = 'current-user-id';
  const { data: tagList, isLoading } = useTagAnalyticsList(userId);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading tag analytics..." />;
  }

  if (!tagList || tagList.length === 0) {
    return (
      <EmptyState
        icon={<TagIcon className="h-12 w-12 text-gray-400" />}
        title="No tags found"
        description="Create tags to organize your collection"
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Tag Analytics"
        description={`${tagList.length} tags`}
      />

      <GridLayout cols={3}>
        {tagList.map((tag) => (
          <Link
            key={tag.tag_id}
            href={`/dashboard/tags/${tag.tag_id}`}
            className="block hover:scale-[1.02] transition-transform"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {tag.tag_name}
                  </h3>
                  <Badge size="sm">{tag.tag_type}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Specimens</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tag.specimen_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Materials</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tag.unique_materials}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${tag.total_estimated_value.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Added (30d)</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{tag.specimens_added_last_30_days}
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

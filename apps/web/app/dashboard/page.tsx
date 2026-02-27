/**
 * User Analytics Dashboard Page
 * 
 * Main overview with user-level analytics
 */

'use client';

export const dynamic = 'force-dynamic';

import { useUserAnalytics, useRefreshAnalytics } from '@/app/hooks/useAnalytics';
import { 
  StatCard, 
  MetricCard, 
  GridLayout, 
  SectionHeader, 
  LoadingSpinner,
  Badge,
} from '@/app/components/ui';
import {
  PieChart,
  BarChart,
  Histogram,
  MaterialDistributionChart,
  StorageUtilizationWidget,
} from '@/app/components/charts';
import {
  CubeIcon,
  BeakerIcon,
  StarIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  // Get current user ID (replace with actual auth)
  const userId = 'current-user-id';
  
  const { data: analytics, isLoading, error, refetch } = useUserAnalytics(userId);
  const refreshMutation = useRefreshAnalytics();

  const handleRefresh = () => {
    refreshMutation.mutate(userId, {
      onSuccess: () => refetch(),
    });
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading analytics..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">
          Failed to load analytics
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <SectionHeader
        title="Collection Overview"
        description="Complete analytics of your specimen collection"
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            aria-label="Refresh analytics"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      {/* Key Metrics */}
      <GridLayout cols={4}>
        <StatCard
          label="Total Specimens"
          value={analytics.total_specimens}
          icon={<CubeIcon className="h-6 w-6 text-blue-600" />}
          trend={{
            value: analytics.growth_rate_monthly,
            direction: analytics.growth_rate_monthly > 0 ? 'up' : 'down',
          }}
        />
        <StatCard
          label="Unique Materials"
          value={analytics.unique_materials}
          icon={<BeakerIcon className="h-6 w-6 text-purple-600" />}
        />
        <StatCard
          label="Total Value"
          value={`$${analytics.total_estimated_value.toLocaleString()}`}
          icon={<ShoppingBagIcon className="h-6 w-6 text-green-600" />}
        />
        <StatCard
          label="Favorites"
          value={analytics.favorite_specimens}
          icon={<StarIcon className="h-6 w-6 text-yellow-600" />}
        />
      </GridLayout>

      {/* Activity Stats */}
      <GridLayout cols={3}>
        <MetricCard title="Recent Activity">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Added in last 30 days
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.specimens_added_last_30_days}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Added in last 90 days
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.specimens_added_last_90_days}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Monthly growth rate
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.growth_rate_monthly.toFixed(1)}%
              </p>
            </div>
          </div>
        </MetricCard>

        <MetricCard title="Organization">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Storage Locations
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.total_storage_locations}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tags
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.total_tags}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Collections
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.total_collection_groups}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Avg Tags/Specimen
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.average_tags_per_specimen.toFixed(1)}
              </span>
            </div>
          </div>
        </MetricCard>

        <MetricCard title="Physical Metrics">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Weight
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.total_weight_grams.toLocaleString()}g
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Avg: {analytics.average_weight_grams.toFixed(1)}g
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Estimated Value
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${analytics.total_estimated_value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Avg: ${analytics.average_estimated_value.toFixed(2)}
              </p>
            </div>
          </div>
        </MetricCard>
      </GridLayout>

      {/* Material Distribution */}
      <GridLayout cols={2}>
        <MetricCard title="Top Materials">
          <MaterialDistributionChart
            materials={analytics.top_materials}
            limit={10}
          />
        </MetricCard>

        <MetricCard title="Acquisition Methods">
          <PieChart
            data={analytics.acquisition_methods}
            height={250}
          />
        </MetricCard>
      </GridLayout>

      {/* Distributions */}
      <GridLayout cols={2}>
        <MetricCard title="Weight Distribution">
          <Histogram
            data={analytics.weight_distribution}
            color="rgb(59, 130, 246)"
            height={250}
          />
        </MetricCard>

        <MetricCard title="Value Distribution">
          <Histogram
            data={analytics.value_distribution}
            color="rgb(16, 185, 129)"
            height={250}
          />
        </MetricCard>
      </GridLayout>

      {/* State and Condition */}
      <GridLayout cols={2}>
        <MetricCard title="Specimen State">
          <PieChart
            data={analytics.specimens_by_state}
            height={250}
          />
        </MetricCard>

        <MetricCard title="Condition Distribution">
          <BarChart
            data={Object.entries(analytics.specimens_by_condition).map(([label, value]) => ({
              label,
              value,
            }))}
            color="rgb(245, 158, 11)"
          />
        </MetricCard>
      </GridLayout>

      {/* Storage Utilization */}
      <StorageUtilizationWidget utilization={analytics.storage_utilization} />

      {/* Special Collections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">On Display</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.specimens_on_display}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Studio</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.specimens_in_studio}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">For Sale</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.specimens_for_sale}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">For Trade</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {analytics.specimens_for_trade}
          </p>
        </div>
      </div>

      {/* Cache Status */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Last updated: {analytics.calculated_at.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <span>Calculation time: {analytics.calculation_time_ms}ms</span>
          <Badge variant={analytics.cache_status === 'FRESH' ? 'success' : 'warning'}>
            {analytics.cache_status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

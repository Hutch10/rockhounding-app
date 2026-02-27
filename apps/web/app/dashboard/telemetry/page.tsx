/**
 * Telemetry Dashboard Page
 * 
 * Full telemetry analytics page with trends, error spikes, and performance regressions
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { 
  useTelemetrySummary, 
  usePerformanceTrends, 
  useRecentErrors,
  useRefreshTelemetryViews,
} from '@/app/hooks/useTelemetry';
import { 
  GridLayout, 
  SectionHeader, 
  StatCard, 
  MetricCard,
  Badge,
  LoadingSpinner,
  EmptyState,
} from '@/app/components/ui';
import { LineChart, BarChart } from '@/app/components/charts';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  ArrowPathIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

const TIME_RANGES = [
  { label: '24 Hours', value: 1 },
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

export default function TelemetryPage() {
  const userId = 'current-user-id';
  const [timeRange, setTimeRange] = useState(7);

  const { data: summary, isLoading: summaryLoading, refetch } = useTelemetrySummary(userId, timeRange);
  const { data: trends, isLoading: trendsLoading } = usePerformanceTrends(userId, timeRange);
  const { data: recentErrors, isLoading: errorsLoading } = useRecentErrors(userId, 20);
  const { mutate: refreshViews, isPending: isRefreshing } = useRefreshTelemetryViews();

  const handleRefresh = () => {
    refreshViews(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  if (summaryLoading || trendsLoading || errorsLoading) {
    return <LoadingSpinner size="lg" label="Loading telemetry data..." />;
  }

  if (!summary) {
    return (
      <EmptyState
        icon={<ChartBarIcon className="h-12 w-12 text-gray-400" />}
        title="No telemetry data"
        description="Start using the application to generate telemetry data"
      />
    );
  }

  // Calculate metrics
  const performanceScore = summary.avg_page_load_time_ms 
    ? Math.max(0, Math.min(100, 100 - (summary.avg_page_load_time_ms / 50)))
    : null;

  // Format data for charts
  const performanceTrendData = trends?.map(t => ({
    date: new Date(t.metric_date).toISOString(),
    value: t.avg_lcp || 0,
  })) || [];

  const errorTrendData = trends?.map(t => ({
    date: new Date(t.metric_date).toISOString(),
    value: t.sample_count || 0,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SectionHeader
            title="System Telemetry"
            description="Performance metrics, error tracking, and system health"
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <GridLayout cols={4}>
        <StatCard
          icon={<ChartBarIcon className="h-6 w-6" />}
          label="Total Events"
          value={summary.total_events.toLocaleString()}
          loading={false}
        />
        <StatCard
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          label="Total Errors"
          value={summary.total_errors.toLocaleString()}
          trend={
            summary.error_rate > 0.05
              ? { direction: 'up', value: summary.error_rate * 100 }
              : undefined
          }
          loading={false}
        />
        <StatCard
          icon={<BoltIcon className="h-6 w-6" />}
          label="Performance Score"
          value={performanceScore?.toFixed(0) || 'N/A'}
          trend={
            performanceScore && performanceScore < 70
              ? { direction: 'down', value: 100 - performanceScore }
              : undefined
          }
          loading={false}
        />
        <StatCard
          icon={<ServerIcon className="h-6 w-6" />}
          label="Cache Hit Rate"
          value={summary.cache_hit_rate ? `${(summary.cache_hit_rate * 100).toFixed(1)}%` : 'N/A'}
          loading={false}
        />
      </GridLayout>

      {/* Performance Trends */}
      <GridLayout cols={2}>
        <MetricCard title="Page Load Time Trend">
          {performanceTrendData.length > 0 ? (
            <LineChart
              data={performanceTrendData}
              title="LCP (ms)"
              height={250}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No performance data</p>
          )}
        </MetricCard>

        <MetricCard title="Error Rate Over Time">
          {errorTrendData.length > 0 ? (
            <LineChart
              data={errorTrendData}
              title="Events per day"
              height={250}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No error data</p>
          )}
        </MetricCard>
      </GridLayout>

      {/* Performance Details */}
      <MetricCard title="Core Web Vitals">
        <div className="grid grid-cols-3 gap-6">
          {trends && trends.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LCP (Largest Contentful Paint)
                </h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {trends[0]?.avg_lcp?.toFixed(0) || 'N/A'}
                  <span className="text-lg text-gray-500 ml-1">ms</span>
                </p>
                <Badge 
                  variant={
                    (trends[0]?.avg_lcp || 0) < 2500 ? 'success' :
                    (trends[0]?.avg_lcp || 0) < 4000 ? 'warning' : 'error'
                  }
                  size="sm"
                >
                  {(trends[0]?.avg_lcp || 0) < 2500 ? 'Good' :
                   (trends[0]?.avg_lcp || 0) < 4000 ? 'Needs Improvement' : 'Poor'}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FID (First Input Delay)
                </h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {trends[0]?.avg_fid?.toFixed(0) || 'N/A'}
                  <span className="text-lg text-gray-500 ml-1">ms</span>
                </p>
                <Badge 
                  variant={
                    (trends[0]?.avg_fid || 0) < 100 ? 'success' :
                    (trends[0]?.avg_fid || 0) < 300 ? 'warning' : 'error'
                  }
                  size="sm"
                >
                  {(trends[0]?.avg_fid || 0) < 100 ? 'Good' :
                   (trends[0]?.avg_fid || 0) < 300 ? 'Needs Improvement' : 'Poor'}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CLS (Cumulative Layout Shift)
                </h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {trends[0]?.avg_cls?.toFixed(3) || 'N/A'}
                </p>
                <Badge 
                  variant={
                    (trends[0]?.avg_cls || 0) < 0.1 ? 'success' :
                    (trends[0]?.avg_cls || 0) < 0.25 ? 'warning' : 'error'
                  }
                  size="sm"
                >
                  {(trends[0]?.avg_cls || 0) < 0.1 ? 'Good' :
                   (trends[0]?.avg_cls || 0) < 0.25 ? 'Needs Improvement' : 'Poor'}
                </Badge>
              </div>
            </>
          )}
        </div>
      </MetricCard>

      {/* Recent Errors */}
      <MetricCard title="Recent Errors">
        {recentErrors && recentErrors.length > 0 ? (
          <div className="space-y-3">
            {recentErrors.map((error) => (
              <div
                key={error.error_id}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="error" size="sm">
                      {error.error_type}
                    </Badge>
                    <Badge 
                      variant={
                        error.severity === 'critical' ? 'error' :
                        error.severity === 'error' ? 'warning' : 'default'
                      }
                      size="sm"
                    >
                      {error.severity}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(error.occurred_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {error.error_message}
                </p>
                {error.component_name && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    in {error.component_name}
                  </p>
                )}
                {error.file_path && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                    {error.file_path}
                    {error.line_number && `:${error.line_number}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ExclamationTriangleIcon className="h-10 w-10 text-gray-400" />}
            title="No recent errors"
            description="Your application is running smoothly!"
          />
        )}
      </MetricCard>

      {/* Top Errors Summary */}
      {summary.top_errors && summary.top_errors.length > 0 && (
        <MetricCard title="Most Frequent Errors">
          <BarChart
            data={summary.top_errors.map(e => ({
              label: e.error_message.substring(0, 50) + (e.error_message.length > 50 ? '...' : ''),
              value: e.count,
            }))}
            title="Error Count"
            color="#EF4444"
            height={300}
          />
        </MetricCard>
      )}
    </div>
  );
}



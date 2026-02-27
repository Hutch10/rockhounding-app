/**
 * Telemetry Dashboard Widget
 * 
 * Compact widget for displaying telemetry overview in the main dashboard
 */

'use client';

import { useTelemetrySummary, usePerformanceTrends } from '@/app/hooks/useTelemetry';
import { 
  MetricCard, 
  StatCard, 
  Badge, 
  LoadingSpinner,
  GridLayout,
} from '@/app/components/ui';
import { LineChart } from '@/app/components/charts';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  BoltIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TelemetryWidgetProps {
  userId: string;
  days?: number;
}

export default function TelemetryWidget({ userId, days = 7 }: TelemetryWidgetProps) {
  const { data: summary, isLoading: summaryLoading } = useTelemetrySummary(userId, days);
  const { data: trends, isLoading: trendsLoading } = usePerformanceTrends(userId, days);

  if (summaryLoading || trendsLoading) {
    return (
      <MetricCard title="System Telemetry">
        <LoadingSpinner size="md" label="Loading telemetry..." />
      </MetricCard>
    );
  }

  if (!summary) {
    return (
      <MetricCard title="System Telemetry">
        <p className="text-gray-500 dark:text-gray-400">No telemetry data available</p>
      </MetricCard>
    );
  }

  // Calculate performance score (0-100)
  const performanceScore = summary.avg_page_load_time_ms 
    ? Math.max(0, Math.min(100, 100 - (summary.avg_page_load_time_ms / 50)))
    : null;

  // Format performance trends for chart
  const performanceData = trends?.map((t: any) => ({
    date: new Date(t.metric_date).toISOString(),
    value: t.avg_lcp || 0,
  })) || [];

  return (
    <MetricCard 
      title="System Telemetry"
      action={
        <Link 
          href="/dashboard/telemetry"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Details
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <GridLayout cols={2} gap="sm">
          <StatCard
            icon={<ChartBarIcon className="h-5 w-5" />}
            label="Total Events"
            value={summary.total_events.toLocaleString()}
            loading={false}
          />
          <StatCard
            icon={<ExclamationTriangleIcon className="h-5 w-5" />}
            label="Errors"
            value={summary.total_errors.toLocaleString()}
            loading={false}
          />
        </GridLayout>

        {/* Error Rate */}
        {summary.error_rate > 0 && (
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-900 dark:text-red-100">
                Error Rate
              </span>
            </div>
            <Badge variant="error">
              {(summary.error_rate * 100).toFixed(2)}%
            </Badge>
          </div>
        )}

        {/* Performance Score */}
        {performanceScore !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Performance Score
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceScore.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  performanceScore >= 80
                    ? 'bg-green-500'
                    : performanceScore >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Cache Hit Rate */}
        {summary.cache_hit_rate !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Cache Hit Rate
              </span>
              <Badge variant={summary.cache_hit_rate >= 0.8 ? 'success' : 'warning'}>
                {(summary.cache_hit_rate * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Performance Trend */}
        {performanceData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Page Load Time Trend
            </h4>
            <LineChart
              data={performanceData}
              height={100}
            />
          </div>
        )}

        {/* Top Errors */}
        {summary.top_errors && summary.top_errors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Top Errors
            </h4>
            <ul className="space-y-2">
              {summary.top_errors.slice(0, 3).map((error, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                >
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                    {error.error_message}
                  </span>
                  <Badge size="sm" variant="error">
                    {error.count}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </MetricCard>
  );
}

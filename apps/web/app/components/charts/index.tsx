/**
 * Chart Components
 * 
 * Visualization components for analytics data
 */

'use client';

import { useMemo } from 'react';
import { HistogramBin, MaterialCount } from '@rockhounding/shared';

// =====================================================
// PIE CHART
// =====================================================

export interface PieChartProps {
  data: Record<string, number> | Array<{ label: string; value: number }>;
  title?: string;
  height?: number;
}

export function PieChart({ data, title, height = 300 }: PieChartProps) {
  const chartData = useMemo(() => {
    const entries = Array.isArray(data)
      ? data.map(d => [d.label, d.value] as [string, number])
      : Object.entries(data);

    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    
    let currentAngle = 0;
    return entries.map(([label, value]) => {
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      const slice = {
        label,
        value,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return slice;
    });
  }, [data]);

  const colors = [
    'rgb(59, 130, 246)',   // blue-500
    'rgb(16, 185, 129)',   // green-500
    'rgb(245, 158, 11)',   // amber-500
    'rgb(239, 68, 68)',    // red-500
    'rgb(139, 92, 246)',   // violet-500
    'rgb(236, 72, 153)',   // pink-500
    'rgb(14, 165, 233)',   // sky-500
    'rgb(34, 197, 94)',    // green-500
  ];

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* SVG Pie Chart */}
        <svg
          width={height}
          height={height}
          viewBox="0 0 200 200"
          className="flex-shrink-0"
        >
          {chartData.map((slice, index) => {
            const { startAngle, endAngle } = slice;
            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

            const startX = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);

            const pathData = [
              `M 100 100`,
              `L ${startX} ${startY}`,
              `A 90 90 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`,
            ].join(' ');

            return (
              <g key={index}>
                <path
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${slice.label}: ${slice.value} (${slice.percentage.toFixed(1)}%)`}</title>
                </path>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {chartData.map((slice, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {slice.label}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {slice.value}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                {slice.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// BAR CHART
// =====================================================

export interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  title?: string;
  color?: string;
  height?: number;
}

export function BarChart({ data, title, color = 'rgb(59, 130, 246)', height = 300 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      <div className="space-y-3" style={{ minHeight: height }}>
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.value}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all duration-300 ease-out rounded-full"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color,
                }}
                role="progressbar"
                aria-valuenow={item.value}
                aria-valuemin={0}
                aria-valuemax={maxValue}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// HISTOGRAM
// =====================================================

export interface HistogramProps {
  data: HistogramBin[];
  title?: string;
  color?: string;
  height?: number;
}

export function Histogram({ data, title, color = 'rgb(59, 130, 246)', height = 300 }: HistogramProps) {
  const maxCount = Math.max(...data.map(bin => bin.count));

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      <div className="flex items-end gap-2 justify-between" style={{ height }}>
        {data.map((bin, index) => {
          const heightPercentage = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: height - 40 }}>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {bin.count}
                </span>
                <div
                  className="w-full rounded-t transition-all duration-300 ease-out hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${heightPercentage}%`,
                    backgroundColor: color,
                    minHeight: bin.count > 0 ? '4px' : '0',
                  }}
                  role="img"
                  aria-label={`${bin.label}: ${bin.count} items`}
                >
                  <title>{`${bin.label}: ${bin.count} items`}</title>
                </div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                {bin.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// MATERIAL DISTRIBUTION CHART
// =====================================================

export interface MaterialDistributionChartProps {
  materials: MaterialCount[];
  title?: string;
  limit?: number;
}

export function MaterialDistributionChart({ materials, title, limit = 10 }: MaterialDistributionChartProps) {
  const displayMaterials = materials.slice(0, limit);
  const maxCount = Math.max(...displayMaterials.map(m => m.count));

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      <div className="space-y-3">
        {displayMaterials.map((material, index) => (
          <div key={material.material_id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {material.material_name}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {material.count}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500 w-12 text-right">
                  {material.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all duration-300 ease-out rounded-full"
                style={{
                  width: `${material.percentage}%`,
                  backgroundColor: `hsl(${(index * 360) / displayMaterials.length}, 70%, 50%)`,
                }}
                role="progressbar"
                aria-valuenow={material.count}
                aria-valuemin={0}
                aria-valuemax={maxCount}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// LINE CHART (for growth trends)
// =====================================================

export interface LineChartProps {
  data: Array<{ date: Date; value: number }>;
  title?: string;
  color?: string;
  height?: number;
}

export function LineChart({ data, title, color = 'rgb(59, 130, 246)', height = 300 }: LineChartProps) {
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-700" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-700" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-700" />

        {/* Area under line */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={color}
          opacity="0.1"
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Points */}
        {data.map((d, index) => {
          const x = (index / (data.length - 1 || 1)) * 100;
          const y = 100 - ((d.value - minValue) / range) * 100;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1"
              fill={color}
              className="hover:r-2 transition-all cursor-pointer"
            >
              <title>{`${d.date.toLocaleDateString()}: ${d.value}`}</title>
            </circle>
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {data[0]?.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {data[data.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// STORAGE UTILIZATION WIDGET
// =====================================================

export interface StorageUtilizationWidgetProps {
  utilization: {
    total_locations: number;
    total_capacity?: number;
    total_used: number;
    overall_utilization_percentage?: number;
    locations_full: number;
    locations_nearly_full: number;
    locations_available: number;
  };
}

export function StorageUtilizationWidget({ utilization }: StorageUtilizationWidgetProps) {
  const percentage = utilization.overall_utilization_percentage || 0;
  
  const getColor = () => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'yellow';
    return 'green';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Storage Utilization
      </h4>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {utilization.total_used}
          </span>
          {utilization.total_capacity && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / {utilization.total_capacity} capacity
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              getColor() === 'red' ? 'bg-red-600 dark:bg-red-500' :
              getColor() === 'yellow' ? 'bg-yellow-600 dark:bg-yellow-500' :
              'bg-green-600 dark:bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          {percentage.toFixed(1)}% utilized
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {utilization.locations_full}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Full</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {utilization.locations_nearly_full}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Nearly Full</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {utilization.locations_available}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Available</p>
        </div>
      </div>
    </div>
  );
}

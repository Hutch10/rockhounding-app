/**
 * Dashboard Layout
 * 
 * Main layout with navigation, sync indicators, and offline support
 */

'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChartBarIcon, 
  CubeIcon, 
  TagIcon, 
  FolderIcon,
  BeakerIcon,
  ClockIcon,
  ArrowPathIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: ChartBarIcon },
  { name: 'Storage', href: '/dashboard/storage', icon: CubeIcon },
  { name: 'Tags', href: '/dashboard/tags', icon: TagIcon },
  { name: 'Collections', href: '/dashboard/collections', icon: FolderIcon },
  { name: 'Materials', href: '/dashboard/materials', icon: BeakerIcon },
  { name: 'Timeline', href: '/dashboard/timeline', icon: ClockIcon },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { isOnline, isSyncing, lastSyncTime, syncError } = useSyncStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with sync status */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                Rockhound
              </Link>
            </div>

            {/* Sync Status */}
            <div className="flex items-center gap-4">
              <SyncIndicator
                isOnline={isOnline}
                isSyncing={isSyncing}
                lastSyncTime={lastSyncTime}
                syncError={syncError}
              />

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Sidebar">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Sync Indicator Component
 */
interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  syncError?: string;
}

function SyncIndicator({ isOnline, isSyncing, lastSyncTime, syncError }: SyncIndicatorProps) {
  if (syncError) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm"
        role="alert"
        aria-live="polite"
      >
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Sync Error</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm"
        role="status"
        aria-live="polite"
      >
        <ArrowPathIcon className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm"
        role="status"
        aria-live="polite"
      >
        <WifiIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span className="hidden sm:inline">
        {lastSyncTime ? `Synced ${formatRelativeTime(lastSyncTime)}` : 'Online'}
      </span>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

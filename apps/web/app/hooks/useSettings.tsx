/**
 * Rockhound Settings - React Hooks & Context
 * 
 * React hooks and context provider for settings management:
 * - SettingsProvider context with change subscriptions
 * - useSettings, useSetting hooks for reading
 * - useUpdateSettings for writing
 * - Category-specific hooks (useTheme, useUnits, etc.)
 * - Export/import hooks
 * - React Query integration
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import {
  UserSettings,
  SettingsChangeEvent,
  SettingsExport,
  ThemeSettings,
  UnitsSettings,
  AccessibilitySettings,
  SyncSettings,
  CacheSettings,
  CameraSettings,
  AnalyticsSettings,
  TelemetrySettings,
  DeveloperSettings,
  PrivacySettings,
  ThemeMode,
} from '@rockhounding/shared/settings-schema';
import {
  SettingsManager,
  getSettingsManager,
  initSettingsManager,
  SettingsManagerConfig,
} from '@/lib/settings/manager';

// ==================== QUERY KEYS ====================

export const settingsKeys = {
  all: ['settings'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
  theme: () => [...settingsKeys.all, 'theme'] as const,
  units: () => [...settingsKeys.all, 'units'] as const,
  accessibility: () => [...settingsKeys.all, 'accessibility'] as const,
  sync: () => [...settingsKeys.all, 'sync'] as const,
  cache: () => [...settingsKeys.all, 'cache'] as const,
  camera: () => [...settingsKeys.all, 'camera'] as const,
  analytics: () => [...settingsKeys.all, 'analytics'] as const,
  telemetry: () => [...settingsKeys.all, 'telemetry'] as const,
  developer: () => [...settingsKeys.all, 'developer'] as const,
  privacy: () => [...settingsKeys.all, 'privacy'] as const,
  path: (path: string) => [...settingsKeys.all, 'path', path] as const,
};

// ==================== CONTEXT ====================

interface SettingsContextValue {
  manager: SettingsManager | null;
  isInitialized: boolean;
  error: Error | null;
}

const SettingsContext = createContext<SettingsContextValue>({
  manager: null,
  isInitialized: false,
  error: null,
});

export interface SettingsProviderProps {
  children: ReactNode;
  config?: SettingsManagerConfig;
  userId?: string;
  deviceId?: string;
}

/**
 * Settings provider - wraps app with settings context
 */
export function SettingsProvider({
  children,
  config,
  userId,
  deviceId,
}: SettingsProviderProps) {
  const [manager, setManager] = useState<SettingsManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let mounted = true;
    
    async function init(): Promise<void> {
      try {
        const instance = await initSettingsManager(config, userId, deviceId);
        
        if (mounted) {
          setManager(instance);
          setIsInitialized(true);
          
          // Subscribe to changes
          const unsubscribe = instance.onChange((event: SettingsChangeEvent) => {
            // Invalidate queries based on changed category
            queryClient.invalidateQueries({ queryKey: settingsKeys.all });
            const categoryKey = (settingsKeys as any)[event.category];
            if (typeof categoryKey === 'function') {
              queryClient.invalidateQueries({ queryKey: categoryKey() });
            }
          });
          
          return;
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          console.error('[SettingsProvider] Initialization failed:', err);
        }
      }
    }
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [config, userId, deviceId, queryClient]);
  
  const value = useMemo(
    () => ({
      manager,
      isInitialized,
      error,
    }),
    [manager, isInitialized, error]
  );
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings context
 */
function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('[useSettingsContext] Must be used within SettingsProvider');
  }
  
  return context;
}

// ==================== READ HOOKS ====================

/**
 * Get all settings
 */
export function useSettings(): UseQueryResult<UserSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getSettings();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get theme settings
 */
export function useTheme(): UseQueryResult<ThemeSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.theme(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getTheme();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get units settings
 */
export function useUnits(): UseQueryResult<UnitsSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.units(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getUnits();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get accessibility settings
 */
export function useAccessibility(): UseQueryResult<AccessibilitySettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.accessibility(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getAccessibility();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get sync settings
 */
export function useSyncSettings(): UseQueryResult<SyncSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.sync(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getSync();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get cache settings
 */
export function useCacheSettings(): UseQueryResult<CacheSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.cache(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getCache();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get camera settings
 */
export function useCameraSettings(): UseQueryResult<CameraSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.camera(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getCamera();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get analytics settings
 */
export function useAnalyticsSettings(): UseQueryResult<AnalyticsSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.analytics(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getAnalytics();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get telemetry settings
 */
export function useTelemetrySettings(): UseQueryResult<TelemetrySettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.telemetry(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getTelemetry();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get developer settings
 */
export function useDeveloperSettings(): UseQueryResult<DeveloperSettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.developer(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getDeveloper();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get privacy settings
 */
export function usePrivacySettings(): UseQueryResult<PrivacySettings, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.privacy(),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getPrivacy();
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

/**
 * Get single setting by path
 */
export function useSetting<T = unknown>(path: string): UseQueryResult<T, Error> {
  const { manager, isInitialized } = useSettingsContext();
  
  return useQuery({
    queryKey: settingsKeys.path(path),
    queryFn: () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.getSetting<T>(path);
    },
    enabled: isInitialized && !!manager,
    staleTime: 60000,
  });
}

// ==================== WRITE HOOKS ====================

/**
 * Update settings (partial or full)
 */
export function useUpdateSettings(): UseMutationResult<
  UserSettings,
  Error,
  Partial<UserSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateSettings(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Update theme settings
 */
export function useUpdateTheme(): UseMutationResult<
  UserSettings,
  Error,
  Partial<ThemeSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (theme: Partial<ThemeSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateTheme(theme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.theme() });
    },
  });
}

/**
 * Update units settings
 */
export function useUpdateUnits(): UseMutationResult<
  UserSettings,
  Error,
  Partial<UnitsSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (units: Partial<UnitsSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateUnits(units);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.units() });
    },
  });
}

/**
 * Update accessibility settings
 */
export function useUpdateAccessibility(): UseMutationResult<
  UserSettings,
  Error,
  Partial<AccessibilitySettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accessibility: Partial<AccessibilitySettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateAccessibility(accessibility);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.accessibility() });
    },
  });
}

/**
 * Update sync settings
 */
export function useUpdateSync(): UseMutationResult<
  UserSettings,
  Error,
  Partial<SyncSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sync: Partial<SyncSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateSync(sync);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.sync() });
    },
  });
}

/**
 * Update cache settings
 */
export function useUpdateCache(): UseMutationResult<
  UserSettings,
  Error,
  Partial<CacheSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cache: Partial<CacheSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateCache(cache);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.cache() });
    },
  });
}

/**
 * Update camera settings
 */
export function useUpdateCamera(): UseMutationResult<
  UserSettings,
  Error,
  Partial<CameraSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (camera: Partial<CameraSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateCamera(camera);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.camera() });
    },
  });
}

/**
 * Update analytics settings
 */
export function useUpdateAnalytics(): UseMutationResult<
  UserSettings,
  Error,
  Partial<AnalyticsSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (analytics: Partial<AnalyticsSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateAnalytics(analytics);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.analytics() });
    },
  });
}

/**
 * Update telemetry settings
 */
export function useUpdateTelemetry(): UseMutationResult<
  UserSettings,
  Error,
  Partial<TelemetrySettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (telemetry: Partial<TelemetrySettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateTelemetry(telemetry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.telemetry() });
    },
  });
}

/**
 * Update developer settings
 */
export function useUpdateDeveloper(): UseMutationResult<
  UserSettings,
  Error,
  Partial<DeveloperSettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (developer: Partial<DeveloperSettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateDeveloper(developer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.developer() });
    },
  });
}

/**
 * Update privacy settings
 */
export function useUpdatePrivacy(): UseMutationResult<
  UserSettings,
  Error,
  Partial<PrivacySettings>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (privacy: Partial<PrivacySettings>) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updatePrivacy(privacy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.privacy() });
    },
  });
}

/**
 * Update single setting by path
 */
export function useUpdateSetting(): UseMutationResult<
  UserSettings,
  Error,
  { path: string; value: unknown }
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ path, value }: { path: string; value: unknown }) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.updateSetting(path, value);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.invalidateQueries({ queryKey: settingsKeys.path(variables.path) });
    },
  });
}

// ==================== RESET HOOKS ====================

/**
 * Reset all settings to defaults
 */
export function useResetSettings(): UseMutationResult<
  UserSettings,
  Error,
  { keepUserId?: boolean; keepDeviceId?: boolean }
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options: { keepUserId?: boolean; keepDeviceId?: boolean } = {}) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.resetSettings(options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Reset specific category to defaults
 */
export function useResetCategory(): UseMutationResult<
  UserSettings,
  Error,
  keyof Pick<UserSettings, 'theme' | 'units' | 'accessibility' | 'sync' | 'cache' | 'camera' | 'analytics' | 'telemetry' | 'developer' | 'privacy'>
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.resetCategory(category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ==================== EXPORT/IMPORT HOOKS ====================

/**
 * Export settings
 */
export function useExportSettings(): UseMutationResult<SettingsExport, Error, void> {
  const { manager } = useSettingsContext();
  
  return useMutation({
    mutationFn: async () => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.exportSettings();
    },
  });
}

/**
 * Import settings
 */
export function useImportSettings(): UseMutationResult<
  UserSettings,
  Error,
  { exportData: SettingsExport; merge?: boolean }
> {
  const { manager } = useSettingsContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exportData, merge }: { exportData: SettingsExport; merge?: boolean }) => {
      if (!manager) throw new Error('Settings manager not initialized');
      return manager.importSettings(exportData, { merge });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ==================== UTILITY HOOKS ====================

/**
 * Subscribe to settings changes
 */
export function useSettingsChange(callback: (event: SettingsChangeEvent) => void): void {
  const { manager, isInitialized } = useSettingsContext();
  
  useEffect(() => {
    if (!manager || !isInitialized) return;
    
    return manager.onChange(callback);
  }, [manager, isInitialized, callback]);
}

/**
 * Subscribe to category-specific changes
 */
export function useCategoryChange(
  category: string,
  callback: (event: SettingsChangeEvent) => void
): void {
  const { manager, isInitialized } = useSettingsContext();
  
  useEffect(() => {
    if (!manager || !isInitialized) return;
    
    return manager.onCategoryChange(category, callback);
  }, [manager, isInitialized, category, callback]);
}

/**
 * Get current theme mode (resolved from AUTO)
 */
export function useResolvedThemeMode(): ThemeMode {
  const { data: theme } = useTheme();
  const [resolvedMode, setResolvedMode] = useState<ThemeMode>(ThemeMode.LIGHT);
  
  useEffect(() => {
    if (!theme) return;
    
    if (theme.mode === ThemeMode.AUTO) {
      // Listen to system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const updateMode = () => {
        setResolvedMode(mediaQuery.matches ? ThemeMode.DARK : ThemeMode.LIGHT);
      };
      
      updateMode();
      mediaQuery.addEventListener('change', updateMode);
      
      return () => mediaQuery.removeEventListener('change', updateMode);
    } else {
      setResolvedMode(theme.mode);
      return;
    }
  }, [theme]);
  
  return resolvedMode;
}

/**
 * Combined hook for easy theme management
 */
export function useThemeManager() {
  const { data: theme, isLoading } = useTheme();
  const updateTheme = useUpdateTheme();
  const resolvedMode = useResolvedThemeMode();
  
  const setMode = useCallback(
    (mode: ThemeMode) => {
      updateTheme.mutate({ mode });
    },
    [updateTheme]
  );
  
  const toggleMode = useCallback(() => {
    const current = resolvedMode;
    const next = current === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT;
    updateTheme.mutate({ mode: next });
  }, [resolvedMode, updateTheme]);
  
  return {
    theme,
    resolvedMode,
    isLoading,
    setMode,
    toggleMode,
    updateTheme: updateTheme.mutate,
    isUpdating: updateTheme.isPending,
  };
}

/**
 * Get migration log
 */
export function useMigrationLog(): Array<{ from: number; to: number; timestamp: string }> {
  const { manager } = useSettingsContext();
  const [log, setLog] = useState<Array<{ from: number; to: number; timestamp: string }>>([]);
  
  useEffect(() => {
    if (!manager) return;
    
    setLog(manager.getMigrationLog());
    
    const handleMigration = (event: any) => {
      setLog(event.log);
    };
    
    manager.on('migrated', handleMigration);
    
    return () => {
      manager.off('migrated', handleMigration);
    };
  }, [manager]);
  
  return log;
}

/**
 * Check if settings are initialized
 */
export function useSettingsInitialized(): boolean {
  const { isInitialized } = useSettingsContext();
  return isInitialized;
}

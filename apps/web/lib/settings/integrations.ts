/**
 * Rockhound Settings - Integration Helpers
 * 
 * Integration functions for applying settings across subsystems:
 * - Theme application to DOM
 * - Units formatting configuration
 * - Accessibility settings
 * - Sync Engine configuration
 * - Cache policy configuration
 * - Camera defaults
 * - Analytics visibility
 * - Telemetry sampling
 */

import {
  UserSettings,
  ThemeSettings,
  ThemeMode,
  UnitsSettings,
  AccessibilitySettings,
  SyncSettings,
  CacheSettings,
  CameraSettings,
  AnalyticsSettings,
  TelemetrySettings,
  MeasurementUnit,
  ContrastLevel,
  MotionPreference,
  TextSize,
} from '@rockhounding/shared/settings-schema';

// ==================== THEME INTEGRATION ====================

/**
 * Apply theme settings to DOM
 */
export function applyThemeToDOM(theme: ThemeSettings): void {
  const root = document.documentElement;
  
  // Resolve theme mode
  let resolvedMode = theme.mode;
  if (theme.mode === ThemeMode.AUTO) {
    resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? ThemeMode.DARK
      : ThemeMode.LIGHT;
  }
  
  // Apply theme mode
  root.setAttribute('data-theme', resolvedMode);
  root.classList.toggle('dark', resolvedMode === ThemeMode.DARK);
  root.classList.toggle('light', resolvedMode === ThemeMode.LIGHT);
  
  // Apply color scheme
  root.setAttribute('data-color-scheme', theme.colorScheme);
  
  // Apply density
  root.setAttribute('data-density', theme.density);
  
  // Apply font preference
  root.classList.toggle('system-font', theme.useSystemFont);
  
  // Apply background images
  root.classList.toggle('no-bg-images', !theme.showBackgroundImages);
}

/**
 * Listen to system theme changes
 */
export function watchSystemTheme(callback: (isDark: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => mediaQuery.removeEventListener('change', handler);
}

// ==================== UNITS INTEGRATION ====================

/**
 * Configure units formatting
 */
export function configureUnitsFormatting(units: UnitsSettings): void {
  // Store in global config for formatters to use
  if (typeof window !== 'undefined') {
    (window as any).__ROCKHOUND_UNITS__ = units;
  }
}

/**
 * Format measurement value
 */
export function formatMeasurement(
  value: number,
  type: 'length' | 'weight',
  units: UnitsSettings
): string {
  if (units.measurement === MeasurementUnit.METRIC) {
    const unit = type === 'length' ? 'cm' : 'kg';
    return `${value} ${units.showUnitLabels ? unit : ''}`;
  } else {
    const unit = type === 'length' ? 'in' : 'lb';
    const converted = type === 'length' ? value / 2.54 : value / 0.453592;
    return `${converted.toFixed(2)} ${units.showUnitLabels ? unit : ''}`;
  }
}

/**
 * Format coordinates
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  format: UnitsSettings['coordinates']
): string {
  if (format === 'decimal') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } else if (format === 'dms') {
    return `${toDMS(lat, true)}, ${toDMS(lng, false)}`;
  } else {
    return `${toDM(lat, true)}, ${toDM(lng, false)}`;
  }
}

function toDMS(value: number, isLat: boolean): string {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = ((abs - degrees - minutes / 60) * 3600).toFixed(2);
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${degrees}°${minutes}'${seconds}"${dir}`;
}

function toDM(value: number, isLat: boolean): string {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = ((abs - degrees) * 60).toFixed(3);
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${degrees}°${minutes}'${dir}`;
}

// ==================== ACCESSIBILITY INTEGRATION ====================

/**
 * Apply accessibility settings to DOM
 */
export function applyAccessibilitySettings(accessibility: AccessibilitySettings): void {
  const root = document.documentElement;
  
  // Apply contrast
  root.setAttribute('data-contrast', accessibility.contrast);
  
  // Apply motion preference
  root.setAttribute('data-motion', accessibility.motion);
  if (accessibility.motion === MotionPreference.NONE) {
    root.style.setProperty('--animation-duration', '0ms');
    root.style.setProperty('--transition-duration', '0ms');
  } else if (accessibility.motion === MotionPreference.REDUCED) {
    root.style.setProperty('--animation-duration', '100ms');
    root.style.setProperty('--transition-duration', '100ms');
  }
  
  // Apply text size
  const textSizeMap = {
    [TextSize.SMALL]: '0.875',
    [TextSize.NORMAL]: '1',
    [TextSize.LARGE]: '1.25',
    [TextSize.XLARGE]: '1.5',
  };
  root.style.setProperty('--text-size-multiplier', textSizeMap[accessibility.textSize]);
  
  // Apply screen reader optimization
  root.classList.toggle('screen-reader-optimized', accessibility.screenReaderOptimized);
  
  // Apply keyboard navigation hints
  root.classList.toggle('show-keyboard-hints', accessibility.keyboardNavigationHints);
  
  // Apply focus indicators
  root.classList.toggle('enhanced-focus', accessibility.focusIndicators);
  
  // Apply color blind mode
  root.classList.toggle('color-blind-mode', accessibility.colorBlindMode);
}

// ==================== SYNC ENGINE INTEGRATION ====================

/**
 * Configure sync engine with settings
 */
export function configureSyncEngine(sync: SyncSettings): void {
  if (typeof window !== 'undefined') {
    (window as any).__ROCKHOUND_SYNC_CONFIG__ = {
      autoSync: sync.autoSync,
      syncFrequency: sync.syncFrequency,
      conflictResolution: sync.conflictResolution,
      networkPreference: sync.networkPreference,
      syncPhotos: sync.syncPhotos,
      syncAnalytics: sync.syncAnalytics,
      syncTelemetry: sync.syncTelemetry,
      backgroundSync: sync.backgroundSync,
      showNotifications: sync.showSyncNotifications,
    };
  }
}

// ==================== CACHE POLICY INTEGRATION ====================

/**
 * Configure cache/storage policy
 */
export function configureCachePolicy(cache: CacheSettings): void {
  if (typeof window !== 'undefined') {
    (window as any).__ROCKHOUND_CACHE_CONFIG__ = {
      maxStorageMB: cache.maxStorageMB,
      evictionPolicy: cache.evictionPolicy,
      cachePhotos: cache.cachePhotos,
      cacheAnalytics: cache.cacheAnalytics,
      cacheTelemetry: cache.cacheTelemetry,
      compactionEnabled: cache.compactionEnabled,
      compactionIntervalHours: cache.compactionIntervalHours,
      ttlOverrides: cache.ttlOverrides,
    };
  }
}

// ==================== CAMERA INTEGRATION ====================

/**
 * Configure camera defaults
 */
export function configureCameraDefaults(camera: CameraSettings): void {
  if (typeof window !== 'undefined') {
    (window as any).__ROCKHOUND_CAMERA_CONFIG__ = {
      defaultQuality: camera.defaultQuality,
      defaultFormat: camera.defaultFormat,
      enableGPS: camera.enableGPS,
      embedMetadata: camera.embedMetadata,
      autoCapture: camera.autoCapture,
      captureSound: camera.captureSound,
      gridOverlay: camera.gridOverlay,
      flashDefault: camera.flashDefault,
      saveToGallery: camera.saveToGallery,
    };
  }
}

// ==================== ANALYTICS INTEGRATION ====================

/**
 * Configure analytics visibility
 */
export function configureAnalyticsVisibility(analytics: AnalyticsSettings): void {
  if (typeof window !== 'undefined') {
    (window as any).__ROCKHOUND_ANALYTICS_CONFIG__ = {
      enableAnalytics: analytics.enableAnalytics,
      showDashboard: analytics.showDashboard,
      showInsights: analytics.showInsights,
      shareAnonymousData: analytics.shareAnonymousData,
      trackUsagePatterns: analytics.trackUsagePatterns,
      cacheComputedMetrics: analytics.cacheComputedMetrics,
    };
  }
}

// ==================== TELEMETRY INTEGRATION ====================

/**
 * Configure telemetry sampling
 */
export function configureTelemetrySampling(telemetry: TelemetrySettings): void {
  if (typeof window !== 'undefined') {
    const samplingMap = {
      none: 0,
      low: 0.1,
      medium: 0.5,
      high: 1.0,
    };
    
    (window as any).__ROCKHOUND_TELEMETRY_CONFIG__ = {
      samplingRate: samplingMap[telemetry.samplingRate],
      captureErrors: telemetry.captureErrors,
      capturePerformance: telemetry.capturePerformance,
      captureUserActions: telemetry.captureUserActions,
      captureNetworkEvents: telemetry.captureNetworkEvents,
      shareDeviceInfo: telemetry.shareDeviceInfo,
    };
  }
}

// ==================== DASHBOARD INTEGRATION ====================

/**
 * Get settings summary for dashboard
 */
export function getSettingsSummary(settings: UserSettings): Record<string, any> {
  return {
    theme: `${settings.theme.mode} (${settings.theme.colorScheme})`,
    units: settings.units.measurement,
    sync: settings.sync.autoSync ? settings.sync.syncFrequency : 'manual',
    storage: `${settings.cache.maxStorageMB}MB`,
    accessibility: {
      contrast: settings.accessibility.contrast,
      motion: settings.accessibility.motion,
      textSize: settings.accessibility.textSize,
    },
    privacy: {
      shareLocation: settings.privacy.shareLocation,
      publicProfile: settings.privacy.allowPublicProfile,
    },
  };
}

// ==================== TELEMETRY TRACKING ====================

/**
 * Track settings change for telemetry
 */
export function trackSettingsChange(
  category: string,
  changedKeys: string[],
  newValues: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && (window as any).__ROCKHOUND_TRACK_EVENT__) {
    (window as any).__ROCKHOUND_TRACK_EVENT__({
      category: 'settings',
      event_name: 'settings_changed',
      severity: 'info',
      data: {
        category,
        changedKeys,
        newValues,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// ==================== COMPLETE INTEGRATION ====================

/**
 * Apply all settings across subsystems
 */
export function applyAllSettings(settings: UserSettings): void {
  applyThemeToDOM(settings.theme);
  applyAccessibilitySettings(settings.accessibility);
  configureUnitsFormatting(settings.units);
  configureSyncEngine(settings.sync);
  configureCachePolicy(settings.cache);
  configureCameraDefaults(settings.camera);
  configureAnalyticsVisibility(settings.analytics);
  configureTelemetrySampling(settings.telemetry);
}

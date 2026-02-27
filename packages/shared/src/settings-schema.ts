/**
 * Rockhound Settings & Personalization - Data Model & Zod Schemas
 * 
 * Complete type-safe settings system with:
 * - 10 setting categories (theme, units, accessibility, sync, cache, camera, analytics, telemetry, developer, privacy)
 * - Versioned migrations (v1 -> v2 -> v3)
 * - Zod validation for all settings
 * - Defaults and validation utilities
 * - Export/import support
 */

import { z } from 'zod';

// ==================== ENUMS ====================

/**
 * Theme mode options
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto', // Follows system preference
}

/**
 * Color scheme options
 */
export enum ColorScheme {
  DEFAULT = 'default', // Brand colors
  OCEAN = 'ocean', // Blue tones
  FOREST = 'forest', // Green tones
  DESERT = 'desert', // Orange/brown tones
  NIGHT = 'night', // Dark with purple accents
}

/**
 * Display density options
 */
export enum DisplayDensity {
  COMFORTABLE = 'comfortable', // More spacing
  COMPACT = 'compact', // Less spacing
}

/**
 * Measurement unit systems
 */
export enum MeasurementUnit {
  METRIC = 'metric', // cm, kg, °C
  IMPERIAL = 'imperial', // in, lb, °F
}

/**
 * Coordinate format options
 */
export enum CoordinateFormat {
  DECIMAL = 'decimal', // 40.7128, -74.0060
  DMS = 'dms', // 40°42'46"N 74°00'22"W
  DM = 'dm', // 40°42.767'N 74°0.360'W
}

/**
 * Temperature unit options
 */
export enum TemperatureUnit {
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
}

/**
 * Contrast level for accessibility
 */
export enum ContrastLevel {
  NORMAL = 'normal', // WCAG AA
  HIGH = 'high', // WCAG AAA
  MAXIMUM = 'maximum', // Extra high for low vision
}

/**
 * Motion preference for animations
 */
export enum MotionPreference {
  FULL = 'full', // All animations enabled
  REDUCED = 'reduced', // Essential animations only
  NONE = 'none', // No animations
}

/**
 * Text size multiplier
 */
export enum TextSize {
  SMALL = 'small', // 0.875x
  NORMAL = 'normal', // 1x
  LARGE = 'large', // 1.25x
  XLARGE = 'xlarge', // 1.5x
}

/**
 * Sync conflict resolution strategies
 */
export enum ConflictResolution {
  ASK = 'ask', // Prompt user
  SERVER_WINS = 'server_wins', // Use server version
  CLIENT_WINS = 'client_wins', // Use local version
  NEWEST_WINS = 'newest_wins', // Use most recent
}

/**
 * Sync frequency options
 */
export enum SyncFrequency {
  REALTIME = 'realtime', // Immediate sync
  EVERY_5_MIN = 'every_5_min',
  EVERY_15_MIN = 'every_15_min',
  EVERY_HOUR = 'every_hour',
  MANUAL = 'manual', // User-triggered only
}

/**
 * Network preference for sync
 */
export enum NetworkPreference {
  ANY = 'any', // WiFi or cellular
  WIFI_ONLY = 'wifi_only', // WiFi only
}

/**
 * Cache eviction policy override
 */
export enum CacheEvictionPolicy {
  DEFAULT = 'default', // Use storage manager default (LRU)
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  TTL = 'ttl', // Time-based only
  PRIORITY = 'priority', // Priority-based
}

/**
 * Camera image quality
 */
export enum ImageQuality {
  LOW = 'low', // 720p, higher compression
  MEDIUM = 'medium', // 1080p, moderate compression
  HIGH = 'high', // 1080p, low compression
  MAXIMUM = 'maximum', // Full resolution, minimal compression
}

/**
 * Camera image format
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
}

/**
 * Telemetry sampling rate
 */
export enum TelemetrySamplingRate {
  NONE = 'none', // No telemetry
  LOW = 'low', // 10% sampling
  MEDIUM = 'medium', // 50% sampling
  HIGH = 'high', // 100% sampling
}

// ==================== SCHEMAS ====================

/**
 * Theme settings
 */
export const ThemeSettingsSchema = z.object({
  mode: z.nativeEnum(ThemeMode).default(ThemeMode.AUTO),
  colorScheme: z.nativeEnum(ColorScheme).default(ColorScheme.DEFAULT),
  density: z.nativeEnum(DisplayDensity).default(DisplayDensity.COMFORTABLE),
  showBackgroundImages: z.boolean().default(true),
  useSystemFont: z.boolean().default(false),
});

export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;

/**
 * Units settings
 */
export const UnitsSettingsSchema = z.object({
  measurement: z.nativeEnum(MeasurementUnit).default(MeasurementUnit.METRIC),
  coordinates: z.nativeEnum(CoordinateFormat).default(CoordinateFormat.DECIMAL),
  temperature: z.nativeEnum(TemperatureUnit).default(TemperatureUnit.CELSIUS),
  showUnitLabels: z.boolean().default(true),
});

export type UnitsSettings = z.infer<typeof UnitsSettingsSchema>;

/**
 * Accessibility settings
 */
export const AccessibilitySettingsSchema = z.object({
  contrast: z.nativeEnum(ContrastLevel).default(ContrastLevel.NORMAL),
  motion: z.nativeEnum(MotionPreference).default(MotionPreference.FULL),
  textSize: z.nativeEnum(TextSize).default(TextSize.NORMAL),
  screenReaderOptimized: z.boolean().default(false),
  keyboardNavigationHints: z.boolean().default(true),
  focusIndicators: z.boolean().default(true),
  colorBlindMode: z.boolean().default(false),
  hapticFeedback: z.boolean().default(true),
});

export type AccessibilitySettings = z.infer<typeof AccessibilitySettingsSchema>;

/**
 * Sync behavior settings
 */
export const SyncSettingsSchema = z.object({
  autoSync: z.boolean().default(true),
  syncFrequency: z.nativeEnum(SyncFrequency).default(SyncFrequency.EVERY_15_MIN),
  conflictResolution: z.nativeEnum(ConflictResolution).default(ConflictResolution.ASK),
  networkPreference: z.nativeEnum(NetworkPreference).default(NetworkPreference.WIFI_ONLY),
  syncPhotos: z.boolean().default(true),
  syncAnalytics: z.boolean().default(false),
  syncTelemetry: z.boolean().default(true),
  backgroundSync: z.boolean().default(true),
  showSyncNotifications: z.boolean().default(true),
});

export type SyncSettings = z.infer<typeof SyncSettingsSchema>;

/**
 * Cache/Storage settings
 */
export const CacheSettingsSchema = z.object({
  maxStorageMB: z.number().min(10).max(500).default(50),
  evictionPolicy: z.nativeEnum(CacheEvictionPolicy).default(CacheEvictionPolicy.DEFAULT),
  cachePhotos: z.boolean().default(true),
  cacheAnalytics: z.boolean().default(true),
  cacheTelemetry: z.boolean().default(true),
  compactionEnabled: z.boolean().default(true),
  compactionIntervalHours: z.number().min(1).max(24).default(1),
  ttlOverrides: z.object({
    fieldSessions: z.number().optional(), // Override default TTL in ms
    findLogs: z.number().optional(),
    specimens: z.number().optional(),
    analytics: z.number().optional(),
    telemetry: z.number().optional(),
  }).optional(),
});

export type CacheSettings = z.infer<typeof CacheSettingsSchema>;

/**
 * Camera defaults
 */
export const CameraSettingsSchema = z.object({
  defaultQuality: z.nativeEnum(ImageQuality).default(ImageQuality.MEDIUM),
  defaultFormat: z.nativeEnum(ImageFormat).default(ImageFormat.JPEG),
  enableGPS: z.boolean().default(true),
  embedMetadata: z.boolean().default(true),
  autoCapture: z.boolean().default(false),
  captureSound: z.boolean().default(true),
  gridOverlay: z.boolean().default(false),
  flashDefault: z.enum(['auto', 'on', 'off']).default('auto'),
  saveToGallery: z.boolean().default(false),
});

export type CameraSettings = z.infer<typeof CameraSettingsSchema>;

/**
 * Analytics visibility settings
 */
export const AnalyticsSettingsSchema = z.object({
  enableAnalytics: z.boolean().default(true),
  showDashboard: z.boolean().default(true),
  showInsights: z.boolean().default(true),
  shareAnonymousData: z.boolean().default(false),
  trackUsagePatterns: z.boolean().default(true),
  cacheComputedMetrics: z.boolean().default(true),
});

export type AnalyticsSettings = z.infer<typeof AnalyticsSettingsSchema>;

/**
 * Telemetry settings
 */
export const TelemetrySettingsSchema = z.object({
  samplingRate: z.nativeEnum(TelemetrySamplingRate).default(TelemetrySamplingRate.MEDIUM),
  captureErrors: z.boolean().default(true),
  capturePerformance: z.boolean().default(true),
  captureUserActions: z.boolean().default(true),
  captureNetworkEvents: z.boolean().default(false),
  shareDeviceInfo: z.boolean().default(true),
});

export type TelemetrySettings = z.infer<typeof TelemetrySettingsSchema>;

/**
 * Developer mode settings
 */
export const DeveloperSettingsSchema = z.object({
  enableDevMode: z.boolean().default(false),
  showDebugInfo: z.boolean().default(false),
  enableLogging: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('warn'),
  showPerformanceMetrics: z.boolean().default(false),
  enableExperimentalFeatures: z.boolean().default(false),
  bypassCache: z.boolean().default(false),
  mockLocation: z.object({
    enabled: z.boolean().default(false),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

export type DeveloperSettings = z.infer<typeof DeveloperSettingsSchema>;

/**
 * Privacy settings
 */
export const PrivacySettingsSchema = z.object({
  shareLocation: z.boolean().default(true),
  sharePhotos: z.boolean().default(true),
  shareFinds: z.boolean().default(true),
  allowPublicProfile: z.boolean().default(false),
  dataRetentionDays: z.number().min(7).max(365).default(90),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

/**
 * Complete settings object (v3 - current version)
 */
export const UserSettingsSchema = z.object({
  version: z.literal(3).default(3),
  userId: z.string().uuid().optional(),
  deviceId: z.string().optional(),
  
  theme: ThemeSettingsSchema,
  units: UnitsSettingsSchema,
  accessibility: AccessibilitySettingsSchema,
  sync: SyncSettingsSchema,
  cache: CacheSettingsSchema,
  camera: CameraSettingsSchema,
  analytics: AnalyticsSettingsSchema,
  telemetry: TelemetrySettingsSchema,
  developer: DeveloperSettingsSchema,
  privacy: PrivacySettingsSchema,
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime().optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Settings v1 schema (legacy)
 */
export const UserSettingsV1Schema = z.object({
  version: z.literal(1),
  theme: z.object({
    mode: z.nativeEnum(ThemeMode),
    colorScheme: z.nativeEnum(ColorScheme).optional(),
  }),
  units: z.object({
    measurement: z.nativeEnum(MeasurementUnit),
  }),
  sync: z.object({
    autoSync: z.boolean(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserSettingsV1 = z.infer<typeof UserSettingsV1Schema>;

/**
 * Settings v2 schema (legacy)
 */
export const UserSettingsV2Schema = z.object({
  version: z.literal(2),
  userId: z.string().uuid().optional(),
  theme: ThemeSettingsSchema,
  units: UnitsSettingsSchema,
  accessibility: AccessibilitySettingsSchema.partial(),
  sync: SyncSettingsSchema,
  cache: z.object({
    maxStorageMB: z.number(),
    evictionPolicy: z.nativeEnum(CacheEvictionPolicy),
  }),
  camera: CameraSettingsSchema.partial(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserSettingsV2 = z.infer<typeof UserSettingsV2Schema>;

/**
 * Settings change event
 */
export const SettingsChangeEventSchema = z.object({
  category: z.enum([
    'theme',
    'units',
    'accessibility',
    'sync',
    'cache',
    'camera',
    'analytics',
    'telemetry',
    'developer',
    'privacy',
  ]),
  changedKeys: z.array(z.string()),
  oldValues: z.record(z.unknown()).optional(),
  newValues: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  source: z.enum(['user', 'migration', 'import', 'sync']),
});

export type SettingsChangeEvent = z.infer<typeof SettingsChangeEventSchema>;

/**
 * Settings export format
 */
export const SettingsExportSchema = z.object({
  version: z.number(),
  exportedAt: z.string().datetime(),
  deviceId: z.string(),
  settings: UserSettingsSchema,
  checksum: z.string(),
});

export type SettingsExport = z.infer<typeof SettingsExportSchema>;

/**
 * Settings validation result
 */
export interface SettingsValidationResult {
  valid: boolean;
  errors?: z.ZodError;
  warnings?: string[];
  sanitized?: UserSettings;
}

// ==================== DEFAULTS ====================

/**
 * Default theme settings
 */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: ThemeMode.AUTO,
  colorScheme: ColorScheme.DEFAULT,
  density: DisplayDensity.COMFORTABLE,
  showBackgroundImages: true,
  useSystemFont: false,
};

/**
 * Default units settings
 */
export const DEFAULT_UNITS_SETTINGS: UnitsSettings = {
  measurement: MeasurementUnit.METRIC,
  coordinates: CoordinateFormat.DECIMAL,
  temperature: TemperatureUnit.CELSIUS,
  showUnitLabels: true,
};

/**
 * Default accessibility settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  contrast: ContrastLevel.NORMAL,
  motion: MotionPreference.FULL,
  textSize: TextSize.NORMAL,
  screenReaderOptimized: false,
  keyboardNavigationHints: true,
  focusIndicators: true,
  colorBlindMode: false,
  hapticFeedback: true,
};

/**
 * Default sync settings
 */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSync: true,
  syncFrequency: SyncFrequency.EVERY_15_MIN,
  conflictResolution: ConflictResolution.ASK,
  networkPreference: NetworkPreference.WIFI_ONLY,
  syncPhotos: true,
  syncAnalytics: false,
  syncTelemetry: true,
  backgroundSync: true,
  showSyncNotifications: true,
};

/**
 * Default cache settings
 */
export const DEFAULT_CACHE_SETTINGS: CacheSettings = {
  maxStorageMB: 50,
  evictionPolicy: CacheEvictionPolicy.DEFAULT,
  cachePhotos: true,
  cacheAnalytics: true,
  cacheTelemetry: true,
  compactionEnabled: true,
  compactionIntervalHours: 1,
};

/**
 * Default camera settings
 */
export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  defaultQuality: ImageQuality.MEDIUM,
  defaultFormat: ImageFormat.JPEG,
  enableGPS: true,
  embedMetadata: true,
  autoCapture: false,
  captureSound: true,
  gridOverlay: false,
  flashDefault: 'auto',
  saveToGallery: false,
};

/**
 * Default analytics settings
 */
export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  enableAnalytics: true,
  showDashboard: true,
  showInsights: true,
  shareAnonymousData: false,
  trackUsagePatterns: true,
  cacheComputedMetrics: true,
};

/**
 * Default telemetry settings
 */
export const DEFAULT_TELEMETRY_SETTINGS: TelemetrySettings = {
  samplingRate: TelemetrySamplingRate.MEDIUM,
  captureErrors: true,
  capturePerformance: true,
  captureUserActions: true,
  captureNetworkEvents: false,
  shareDeviceInfo: true,
};

/**
 * Default developer settings
 */
export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  enableDevMode: false,
  showDebugInfo: false,
  enableLogging: false,
  logLevel: 'warn',
  showPerformanceMetrics: false,
  enableExperimentalFeatures: false,
  bypassCache: false,
};

/**
 * Default privacy settings
 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareLocation: true,
  sharePhotos: true,
  shareFinds: true,
  allowPublicProfile: false,
  dataRetentionDays: 90,
};

/**
 * Default complete settings (v3)
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'createdAt' | 'updatedAt'> = {
  version: 3,
  theme: DEFAULT_THEME_SETTINGS,
  units: DEFAULT_UNITS_SETTINGS,
  accessibility: DEFAULT_ACCESSIBILITY_SETTINGS,
  sync: DEFAULT_SYNC_SETTINGS,
  cache: DEFAULT_CACHE_SETTINGS,
  camera: DEFAULT_CAMERA_SETTINGS,
  analytics: DEFAULT_ANALYTICS_SETTINGS,
  telemetry: DEFAULT_TELEMETRY_SETTINGS,
  developer: DEFAULT_DEVELOPER_SETTINGS,
  privacy: DEFAULT_PRIVACY_SETTINGS,
};

// ==================== UTILITIES ====================

/**
 * Validate user settings
 */
export function validateSettings(settings: unknown): SettingsValidationResult {
  try {
    const parsed = UserSettingsSchema.parse(settings);
    return {
      valid: true,
      sanitized: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error,
      };
    }
    return {
      valid: false,
      errors: new z.ZodError([
        {
          code: 'custom',
          message: 'Unknown validation error',
          path: [],
        },
      ]),
    };
  }
}

/**
 * Merge settings with defaults (deep merge)
 */
export function mergeWithDefaults(partial: Partial<UserSettings>): UserSettings {
  const now = new Date().toISOString();
  
  return {
    version: 3,
    userId: partial.userId,
    deviceId: partial.deviceId,
    theme: { ...DEFAULT_THEME_SETTINGS, ...partial.theme },
    units: { ...DEFAULT_UNITS_SETTINGS, ...partial.units },
    accessibility: { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...partial.accessibility },
    sync: { ...DEFAULT_SYNC_SETTINGS, ...partial.sync },
    cache: { ...DEFAULT_CACHE_SETTINGS, ...partial.cache },
    camera: { ...DEFAULT_CAMERA_SETTINGS, ...partial.camera },
    analytics: { ...DEFAULT_ANALYTICS_SETTINGS, ...partial.analytics },
    telemetry: { ...DEFAULT_TELEMETRY_SETTINGS, ...partial.telemetry },
    developer: { ...DEFAULT_DEVELOPER_SETTINGS, ...partial.developer },
    privacy: { ...DEFAULT_PRIVACY_SETTINGS, ...partial.privacy },
    createdAt: partial.createdAt || now,
    updatedAt: now,
    lastSyncedAt: partial.lastSyncedAt,
  };
}

/**
 * Get setting value by path (e.g., 'theme.mode')
 */
export function getSettingByPath(settings: UserSettings, path: string): unknown {
  const parts = path.split('.');
  let current: any = settings;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Set setting value by path (returns new settings object)
 */
export function setSettingByPath(
  settings: UserSettings,
  path: string,
  value: unknown
): UserSettings {
  const parts = path.split('.');
  const newSettings = JSON.parse(JSON.stringify(settings)); // Deep clone
  
  let current: any = newSettings;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (lastPart === undefined) return newSettings;
  current[lastPart] = value;
  
  newSettings.updatedAt = new Date().toISOString();
  
  return newSettings;
}

/**
 * Compare two settings objects and return changed keys
 */
export function getChangedKeys(oldSettings: UserSettings, newSettings: UserSettings): string[] {
  const changed: string[] = [];
  
  function compareObjects(
    oldObj: any,
    newObj: any,
    prefix: string = ''
  ): void {
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);
    
    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];
      
      if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
        compareObjects(oldVal, newVal, fullKey);
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(fullKey);
      }
    }
  }
  
  compareObjects(oldSettings, newSettings);
  return changed;
}

/**
 * Compute checksum for settings (for export verification)
 */
export function computeSettingsChecksum(settings: UserSettings): string {
  const json = JSON.stringify(settings, Object.keys(settings).sort());
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Detect user's preferred units based on locale
 */
export function detectPreferredUnits(): MeasurementUnit {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  
  // US, Liberia, Myanmar use imperial
  if (locale.startsWith('en-US') || locale.startsWith('en-LR') || locale.startsWith('my')) {
    return MeasurementUnit.IMPERIAL;
  }
  
  return MeasurementUnit.METRIC;
}

/**
 * Detect user's preferred theme mode
 */
export function detectPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return ThemeMode.AUTO;
  }
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return ThemeMode.DARK;
  }
  
  return ThemeMode.LIGHT;
}

/**
 * Detect user's motion preference
 */
export function detectMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') {
    return MotionPreference.FULL;
  }
  
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return MotionPreference.REDUCED;
  }
  
  return MotionPreference.FULL;
}

/**
 * Detect user's contrast preference
 */
export function detectContrastPreference(): ContrastLevel {
  if (typeof window === 'undefined') {
    return ContrastLevel.NORMAL;
  }
  
  if (window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches) {
    return ContrastLevel.HIGH;
  }
  
  return ContrastLevel.NORMAL;
}

/**
 * Create initial settings from system preferences
 */
export function createInitialSettings(userId?: string, deviceId?: string): UserSettings {
  const now = new Date().toISOString();
  
  return {
    ...DEFAULT_USER_SETTINGS,
    version: 3,
    userId,
    deviceId,
    units: {
      ...DEFAULT_UNITS_SETTINGS,
      measurement: detectPreferredUnits(),
    },
    theme: {
      ...DEFAULT_THEME_SETTINGS,
      mode: ThemeMode.AUTO, // Always start with AUTO
    },
    accessibility: {
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      motion: detectMotionPreference(),
      contrast: detectContrastPreference(),
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Storage key for settings persistence
 */
export const SETTINGS_STORAGE_KEY = 'user_settings';

/**
 * Storage entity type for settings (integrates with Offline Storage subsystem)
 */
export const SETTINGS_ENTITY_TYPE = 'settings' as const;

/**
 * Settings version history
 */
export const SETTINGS_VERSION_HISTORY = [
  {
    version: 1,
    date: '2025-01-01',
    changes: ['Initial settings structure', 'Basic theme and units'],
  },
  {
    version: 2,
    date: '2025-06-01',
    changes: [
      'Added accessibility settings',
      'Expanded sync options',
      'Added cache configuration',
      'Added camera defaults',
    ],
  },
  {
    version: 3,
    date: '2026-01-01',
    changes: [
      'Added analytics settings',
      'Added telemetry settings',
      'Added developer mode',
      'Added privacy settings',
      'Added TTL overrides for cache',
      'Added network preference for sync',
    ],
  },
] as const;

/**
 * Current settings version
 */
export const CURRENT_SETTINGS_VERSION = 3;

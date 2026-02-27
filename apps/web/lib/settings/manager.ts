/**
 * Rockhound Settings Manager
 * 
 * Client-side settings management with:
 * - Offline persistence via Storage subsystem
 * - Versioned migrations (v1 -> v2 -> v3)
 * - Change event emitters
 * - Validation on read/write
 * - Export/import functionality
 * - Reset capabilities
 */

import { EventEmitter } from 'events';
import {
  UserSettings,
  UserSettingsV1,
  UserSettingsV2,
  SettingsChangeEvent,
  SettingsExport,
  UserSettingsSchema,
  UserSettingsV1Schema,
  UserSettingsV2Schema,
  SettingsExportSchema,
  DEFAULT_USER_SETTINGS,
  validateSettings,
  mergeWithDefaults,
  getSettingByPath,
  setSettingByPath,
  getChangedKeys,
  computeSettingsChecksum,
  createInitialSettings,
  SETTINGS_STORAGE_KEY,
  CURRENT_SETTINGS_VERSION,
  ThemeMode,
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
} from '@rockhounding/shared/settings-schema';

/**
 * Settings manager configuration
 */
export interface SettingsManagerConfig {
  /**
   * Whether to persist settings to storage
   */
  persist?: boolean;
  
  /**
   * Whether to auto-migrate old versions
   */
  autoMigrate?: boolean;
  
  /**
   * Whether to validate on read
   */
  validateOnRead?: boolean;
  
  /**
   * Whether to validate on write
   */
  validateOnWrite?: boolean;
  
  /**
   * Whether to emit change events
   */
  emitEvents?: boolean;
  
  /**
   * Storage adapter (defaults to localStorage)
   */
  storageAdapter?: SettingsStorageAdapter;
}

/**
 * Storage adapter interface
 */
export interface SettingsStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Default localStorage adapter
 */
export class LocalStorageAdapter implements SettingsStorageAdapter {
  async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }
  
  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }
  
  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
  
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
}

/**
 * Settings manager class
 */
export class SettingsManager extends EventEmitter {
  private settings: UserSettings | null = null;
  private config: Required<SettingsManagerConfig>;
  private initialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  private migrationLog: Array<{ from: number; to: number; timestamp: string }> = [];
  
  constructor(config: SettingsManagerConfig = {}) {
    super();
    
    this.config = {
      persist: config.persist ?? true,
      autoMigrate: config.autoMigrate ?? true,
      validateOnRead: config.validateOnRead ?? true,
      validateOnWrite: config.validateOnWrite ?? true,
      emitEvents: config.emitEvents ?? true,
      storageAdapter: config.storageAdapter ?? new LocalStorageAdapter(),
    };
  }
  
  /**
   * Initialize settings manager
   */
  async initialize(userId?: string, deviceId?: string): Promise<void> {
    if (this.initialized) {
      console.warn('[SettingsManager] Already initialized');
      return;
    }
    
    try {
      // Try to load existing settings
      const loaded = await this.loadFromStorage();
      
      if (loaded) {
        // Migrate if needed
        if (this.config.autoMigrate && loaded.version < CURRENT_SETTINGS_VERSION) {
          this.settings = await this.migrate(loaded);
        } else {
          this.settings = loaded;
        }
        
        // Update user/device IDs if provided
        if (userId) this.settings.userId = userId;
        if (deviceId) this.settings.deviceId = deviceId;
      } else {
        // Create initial settings
        this.settings = createInitialSettings(userId, deviceId);
        
        if (this.config.persist) {
          await this.saveToStorage();
        }
      }
      
      this.initialized = true;
      this.emit('initialized', this.settings);
    } catch (error) {
      console.error('[SettingsManager] Initialization failed:', error);
      
      // Fallback to defaults
      this.settings = createInitialSettings(userId, deviceId);
      this.initialized = true;
      this.emit('initialized', this.settings);
    }
  }
  
  /**
   * Get all settings
   */
  getSettings(): UserSettings {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized. Call initialize() first.');
    }
    
    return JSON.parse(JSON.stringify(this.settings)); // Deep clone
  }
  
  /**
   * Get settings by category
   */
  getTheme(): ThemeSettings {
    return this.getSettings().theme;
  }
  
  getUnits(): UnitsSettings {
    return this.getSettings().units;
  }
  
  getAccessibility(): AccessibilitySettings {
    return this.getSettings().accessibility;
  }
  
  getSync(): SyncSettings {
    return this.getSettings().sync;
  }
  
  getCache(): CacheSettings {
    return this.getSettings().cache;
  }
  
  getCamera(): CameraSettings {
    return this.getSettings().camera;
  }
  
  getAnalytics(): AnalyticsSettings {
    return this.getSettings().analytics;
  }
  
  getTelemetry(): TelemetrySettings {
    return this.getSettings().telemetry;
  }
  
  getDeveloper(): DeveloperSettings {
    return this.getSettings().developer;
  }
  
  getPrivacy(): PrivacySettings {
    return this.getSettings().privacy;
  }
  
  /**
   * Get setting by path (e.g., 'theme.mode')
   */
  getSetting<T = unknown>(path: string): T {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    return getSettingByPath(this.settings, path) as T;
  }
  
  /**
   * Update settings (partial or full)
   */
  async updateSettings(
    updates: Partial<UserSettings>,
    options: { source?: 'user' | 'migration' | 'import' | 'sync'; skipValidation?: boolean } = {}
  ): Promise<UserSettings> {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    const oldSettings = this.settings;
    const newSettings: UserSettings = {
      ...oldSettings,
      ...updates,
      version: CURRENT_SETTINGS_VERSION,
      updatedAt: new Date().toISOString(),
    };
    
    // Deep merge nested objects
    if (updates.theme) {
      newSettings.theme = { ...oldSettings.theme, ...updates.theme };
    }
    if (updates.units) {
      newSettings.units = { ...oldSettings.units, ...updates.units };
    }
    if (updates.accessibility) {
      newSettings.accessibility = { ...oldSettings.accessibility, ...updates.accessibility };
    }
    if (updates.sync) {
      newSettings.sync = { ...oldSettings.sync, ...updates.sync };
    }
    if (updates.cache) {
      newSettings.cache = { ...oldSettings.cache, ...updates.cache };
    }
    if (updates.camera) {
      newSettings.camera = { ...oldSettings.camera, ...updates.camera };
    }
    if (updates.analytics) {
      newSettings.analytics = { ...oldSettings.analytics, ...updates.analytics };
    }
    if (updates.telemetry) {
      newSettings.telemetry = { ...oldSettings.telemetry, ...updates.telemetry };
    }
    if (updates.developer) {
      newSettings.developer = { ...oldSettings.developer, ...updates.developer };
    }
    if (updates.privacy) {
      newSettings.privacy = { ...oldSettings.privacy, ...updates.privacy };
    }
    
    // Validate if enabled
    if (this.config.validateOnWrite && !options.skipValidation) {
      const validation = validateSettings(newSettings);
      if (!validation.valid) {
        throw new Error(`[SettingsManager] Validation failed: ${validation.errors?.message}`);
      }
    }
    
    // Update in-memory settings
    this.settings = newSettings;
    
    // Persist if enabled
    if (this.config.persist) {
      await this.debouncedSave();
    }
    
    // Emit change event
    if (this.config.emitEvents) {
      const changedKeys = getChangedKeys(oldSettings, newSettings);
      
      if (changedKeys.length > 0) {
        // Determine affected categories
        const categories = new Set<string>();
        for (const key of changedKeys) {
          const category = key.split('.')[0] ?? '';
          categories.add(category);
        }
        
        // Emit events for each category
        for (const category of categories) {
          const categoryKeys = changedKeys.filter(k => k.startsWith(`${category}.`));
          const oldValues: Record<string, unknown> = {};
          const newValues: Record<string, unknown> = {};
          
          for (const key of categoryKeys) {
            oldValues[key] = getSettingByPath(oldSettings, key);
            newValues[key] = getSettingByPath(newSettings, key);
          }
          
          const event: SettingsChangeEvent = {
            category: category as any,
            changedKeys: categoryKeys,
            oldValues,
            newValues,
            timestamp: new Date().toISOString(),
            source: options.source || 'user',
          };
          
          this.emit('change', event);
          this.emit(`change:${category}`, event);
        }
      }
    }
    
    return newSettings;
  }
  
  /**
   * Update theme settings
   */
  async updateTheme(theme: Partial<ThemeSettings>): Promise<UserSettings> {
    return this.updateSettings({ theme: theme as unknown as ThemeSettings });
  }

  /**
   * Update units settings
   */
  async updateUnits(units: Partial<UnitsSettings>): Promise<UserSettings> {
    return this.updateSettings({ units: units as unknown as UnitsSettings });
  }

  /**
   * Update accessibility settings
   */
  async updateAccessibility(accessibility: Partial<AccessibilitySettings>): Promise<UserSettings> {
    return this.updateSettings({ accessibility: accessibility as unknown as AccessibilitySettings });
  }

  /**
   * Update sync settings
   */
  async updateSync(sync: Partial<SyncSettings>): Promise<UserSettings> {
    return this.updateSettings({ sync: sync as unknown as SyncSettings });
  }

  /**
   * Update cache settings
   */
  async updateCache(cache: Partial<CacheSettings>): Promise<UserSettings> {
    return this.updateSettings({ cache: cache as unknown as CacheSettings });
  }
  
  /**
   * Update camera settings
   */
  async updateCamera(camera: Partial<CameraSettings>): Promise<UserSettings> {
    return this.updateSettings({ camera: camera as unknown as CameraSettings });
  }

  /**
   * Update analytics settings
   */
  async updateAnalytics(analytics: Partial<AnalyticsSettings>): Promise<UserSettings> {
    return this.updateSettings({ analytics: analytics as unknown as AnalyticsSettings });
  }

  /**
   * Update telemetry settings
   */
  async updateTelemetry(telemetry: Partial<TelemetrySettings>): Promise<UserSettings> {
    return this.updateSettings({ telemetry: telemetry as unknown as TelemetrySettings });
  }
  
  /**
   * Update developer settings
   */
  async updateDeveloper(developer: Partial<DeveloperSettings>): Promise<UserSettings> {
    return this.updateSettings({ developer: developer as unknown as DeveloperSettings });
  }
  
  /**
   * Update privacy settings
   */
  async updatePrivacy(privacy: Partial<PrivacySettings>): Promise<UserSettings> {
    return this.updateSettings({ privacy: privacy as unknown as PrivacySettings });
  }
  
  /**
   * Update single setting by path
   */
  async updateSetting(path: string, value: unknown): Promise<UserSettings> {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    const oldSettings = this.settings;
    const newSettings = setSettingByPath(oldSettings, path, value);
    
    return this.updateSettings(newSettings, { source: 'user' });
  }
  
  /**
   * Reset settings to defaults
   */
  async resetSettings(options: { keepUserId?: boolean; keepDeviceId?: boolean } = {}): Promise<UserSettings> {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    const userId = options.keepUserId ? this.settings.userId : undefined;
    const deviceId = options.keepDeviceId ? this.settings.deviceId : undefined;
    
    const defaultSettings = createInitialSettings(userId, deviceId);
    
    return this.updateSettings(defaultSettings, { source: 'user' });
  }
  
  /**
   * Reset specific category to defaults
   */
  async resetCategory(category: keyof Pick<UserSettings, 'theme' | 'units' | 'accessibility' | 'sync' | 'cache' | 'camera' | 'analytics' | 'telemetry' | 'developer' | 'privacy'>): Promise<UserSettings> {
    const defaults = createInitialSettings();
    return this.updateSettings({ [category]: defaults[category] }, { source: 'user' });
  }
  
  /**
   * Export settings to JSON
   */
  async exportSettings(): Promise<SettingsExport> {
    if (!this.initialized || !this.settings) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    const exportData: SettingsExport = {
      version: CURRENT_SETTINGS_VERSION,
      exportedAt: new Date().toISOString(),
      deviceId: this.settings.deviceId || 'unknown',
      settings: this.settings,
      checksum: computeSettingsChecksum(this.settings),
    };
    
    return exportData;
  }
  
  /**
   * Import settings from JSON
   */
  async importSettings(exportData: SettingsExport, options: { merge?: boolean } = {}): Promise<UserSettings> {
    if (!this.initialized) {
      throw new Error('[SettingsManager] Not initialized');
    }
    
    // Validate export format
    const validation = SettingsExportSchema.safeParse(exportData);
    if (!validation.success) {
      throw new Error('[SettingsManager] Invalid export format');
    }
    
    // Verify checksum
    const computedChecksum = computeSettingsChecksum(exportData.settings);
    if (computedChecksum !== exportData.checksum) {
      console.warn('[SettingsManager] Checksum mismatch - data may be corrupted');
    }
    
    // Import settings
    let imported = exportData.settings;
    
    // Migrate if needed
    if (imported.version < CURRENT_SETTINGS_VERSION) {
      imported = await this.migrate(imported);
    }
    
    // Merge with existing or replace
    if (options.merge && this.settings) {
      imported = mergeWithDefaults({
        ...this.settings,
        ...imported,
      });
    }
    
    return this.updateSettings(imported, { source: 'import' });
  }
  
  /**
   * Load settings from storage
   */
  private async loadFromStorage(): Promise<UserSettings | null> {
    if (!this.config.persist) {
      return null;
    }
    
    try {
      const raw = await this.config.storageAdapter.get(SETTINGS_STORAGE_KEY);
      
      if (!raw) {
        return null;
      }
      
      const parsed = JSON.parse(raw);
      
      // Validate if enabled
      if (this.config.validateOnRead) {
        const validation = validateSettings(parsed);
        if (!validation.valid) {
          console.error('[SettingsManager] Stored settings validation failed:', validation.errors);
          return null;
        }
        return validation.sanitized || null;
      }
      
      return parsed as UserSettings;
    } catch (error) {
      console.error('[SettingsManager] Failed to load settings:', error);
      return null;
    }
  }
  
  /**
   * Save settings to storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.config.persist || !this.settings) {
      return;
    }
    
    try {
      const json = JSON.stringify(this.settings);
      await this.config.storageAdapter.set(SETTINGS_STORAGE_KEY, json);
      this.emit('saved', this.settings);
    } catch (error) {
      console.error('[SettingsManager] Failed to save settings:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Debounced save (prevents excessive writes)
   */
  private async debouncedSave(delay: number = 500): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    return new Promise((resolve) => {
      this.saveTimeout = setTimeout(async () => {
        await this.saveToStorage();
        resolve();
      }, delay);
    });
  }
  
  /**
   * Migrate settings from old version to current
   */
  private async migrate(settings: UserSettings | UserSettingsV1 | UserSettingsV2): Promise<UserSettings> {
    let current: any = settings;
    
    // Migrate v1 -> v2
    if (current.version === 1) {
      console.log('[SettingsManager] Migrating v1 -> v2');
      
      const v1 = current as UserSettingsV1;
      current = {
        version: 2,
        userId: undefined,
        theme: {
          mode: v1.theme.mode,
          colorScheme: v1.theme.colorScheme || 'default',
          density: 'comfortable',
          showBackgroundImages: true,
          useSystemFont: false,
        },
        units: {
          measurement: v1.units.measurement,
          coordinates: 'decimal',
          temperature: v1.units.measurement === 'imperial' ? 'fahrenheit' : 'celsius',
          showUnitLabels: true,
        },
        accessibility: {
          contrast: 'normal',
          motion: 'full',
          textSize: 'normal',
          screenReaderOptimized: false,
          keyboardNavigationHints: true,
          focusIndicators: true,
          colorBlindMode: false,
          hapticFeedback: true,
        },
        sync: {
          autoSync: v1.sync.autoSync,
          syncFrequency: 'every_15_min',
          conflictResolution: 'ask',
          networkPreference: 'wifi_only',
          syncPhotos: true,
          syncAnalytics: false,
          syncTelemetry: true,
          backgroundSync: true,
          showSyncNotifications: true,
        },
        cache: {
          maxStorageMB: 50,
          evictionPolicy: 'default',
        },
        camera: {
          defaultQuality: 'medium',
          defaultFormat: 'jpeg',
          enableGPS: true,
          embedMetadata: true,
        },
        createdAt: v1.createdAt,
        updatedAt: new Date().toISOString(),
      };
      
      this.migrationLog.push({
        from: 1,
        to: 2,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Migrate v2 -> v3
    if (current.version === 2) {
      console.log('[SettingsManager] Migrating v2 -> v3');
      
      const v2 = current as UserSettingsV2;
      current = {
        version: 3,
        userId: v2.userId,
        deviceId: undefined,
        theme: v2.theme,
        units: v2.units,
        accessibility: mergeWithDefaults({ accessibility: v2.accessibility as unknown as AccessibilitySettings }).accessibility,
        sync: v2.sync,
        cache: {
          ...v2.cache,
          cachePhotos: true,
          cacheAnalytics: true,
          cacheTelemetry: true,
          compactionEnabled: true,
          compactionIntervalHours: 1,
        },
        camera: mergeWithDefaults({ camera: v2.camera as unknown as CameraSettings }).camera,
        analytics: {
          enableAnalytics: true,
          showDashboard: true,
          showInsights: true,
          shareAnonymousData: false,
          trackUsagePatterns: true,
          cacheComputedMetrics: true,
        },
        telemetry: {
          samplingRate: 'medium',
          captureErrors: true,
          capturePerformance: true,
          captureUserActions: true,
          captureNetworkEvents: false,
          shareDeviceInfo: true,
        },
        developer: {
          enableDevMode: false,
          showDebugInfo: false,
          enableLogging: false,
          logLevel: 'warn',
          showPerformanceMetrics: false,
          enableExperimentalFeatures: false,
          bypassCache: false,
        },
        privacy: {
          shareLocation: true,
          sharePhotos: true,
          shareFinds: true,
          allowPublicProfile: false,
          dataRetentionDays: 90,
        },
        createdAt: v2.createdAt,
        updatedAt: new Date().toISOString(),
      };
      
      this.migrationLog.push({
        from: 2,
        to: 3,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Save migrated settings
    if (this.config.persist) {
      await this.saveToStorage();
    }
    
    this.emit('migrated', {
      from: settings.version,
      to: CURRENT_SETTINGS_VERSION,
      log: this.migrationLog,
    });
    
    return current as UserSettings;
  }
  
  /**
   * Get migration log
   */
  getMigrationLog(): Array<{ from: number; to: number; timestamp: string }> {
    return [...this.migrationLog];
  }
  
  /**
   * Subscribe to settings changes
   */
  onChange(callback: (event: SettingsChangeEvent) => void): () => void {
    this.on('change', callback);
    return () => this.off('change', callback);
  }
  
  /**
   * Subscribe to category-specific changes
   */
  onCategoryChange(
    category: string,
    callback: (event: SettingsChangeEvent) => void
  ): () => void {
    const eventName = `change:${category}`;
    this.on(eventName, callback);
    return () => this.off(eventName, callback);
  }
  
  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.settings?.userId;
  }
  
  /**
   * Set user ID
   */
  async setUserId(userId: string): Promise<void> {
    await this.updateSettings({ userId });
  }
  
  /**
   * Get current device ID
   */
  getDeviceId(): string | undefined {
    return this.settings?.deviceId;
  }
  
  /**
   * Set device ID
   */
  async setDeviceId(deviceId: string): Promise<void> {
    await this.updateSettings({ deviceId });
  }
  
  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Destroy settings manager
   */
  destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.removeAllListeners();
    this.settings = null;
    this.initialized = false;
  }
}

// ==================== SINGLETON ====================

let settingsManagerInstance: SettingsManager | null = null;

/**
 * Initialize settings manager (singleton)
 */
export async function initSettingsManager(
  config?: SettingsManagerConfig,
  userId?: string,
  deviceId?: string
): Promise<SettingsManager> {
  if (settingsManagerInstance) {
    console.warn('[SettingsManager] Already initialized, returning existing instance');
    return settingsManagerInstance;
  }
  
  settingsManagerInstance = new SettingsManager(config);
  await settingsManagerInstance.initialize(userId, deviceId);
  
  return settingsManagerInstance;
}

/**
 * Get settings manager instance
 */
export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    throw new Error('[SettingsManager] Not initialized. Call initSettingsManager() first.');
  }
  
  return settingsManagerInstance;
}

/**
 * Destroy settings manager instance
 */
export function destroySettingsManager(): void {
  if (settingsManagerInstance) {
    settingsManagerInstance.destroy();
    settingsManagerInstance = null;
  }
}

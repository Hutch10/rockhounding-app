/**
 * Rockhound Settings - UI Components
 * 
 * Mobile-first settings UI components:
 * - SettingsLayout & SettingsSection primitives
 * - Category-specific settings panels
 * - Touch-friendly controls (44px min)
 * - Error boundaries & loading states
 * - Success feedback
 */

'use client';

import React, { useState, ReactNode } from 'react';
import {
  useTheme,
  useUpdateTheme,
  useUnits,
  useUpdateUnits,
  useAccessibility,
  useUpdateAccessibility,
  useSyncSettings,
  useUpdateSync,
  useCacheSettings,
  useUpdateCache,
  useCameraSettings,
  useUpdateCamera,
  useAnalyticsSettings,
  useUpdateAnalytics,
  useTelemetrySettings,
  useUpdateTelemetry,
  useDeveloperSettings,
  useUpdateDeveloper,
  usePrivacySettings,
  useUpdatePrivacy,
  useResetSettings,
  useExportSettings,
  useImportSettings,
  useThemeManager,
  useSettings,
} from '@/app/hooks/useSettings';
import {
  ThemeMode,
  ColorScheme,
  DisplayDensity,
  MeasurementUnit,
  CoordinateFormat,
  TemperatureUnit,
  ContrastLevel,
  MotionPreference,
  TextSize,
  ConflictResolution,
  SyncFrequency,
  NetworkPreference,
  CacheEvictionPolicy,
  ImageQuality,
  ImageFormat,
  TelemetrySamplingRate,
} from '@rockhounding/shared/settings-schema';

// ==================== PRIMITIVES ====================

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className = '',
}: SettingsSectionProps) {
  return (
    <section className={`settings-section ${className}`}>
      <div className="settings-section-header">
        <h2 className="settings-section-title">{title}</h2>
        {description && (
          <p className="settings-section-description">{description}</p>
        )}
      </div>
      <div className="settings-section-content">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function SettingRow({ label, description, children, htmlFor }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="setting-label-container">
        <label htmlFor={htmlFor} className="setting-label">
          {label}
        </label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

interface SettingToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function SettingToggle({
  id,
  checked,
  onChange,
  disabled = false,
  label,
}: SettingToggleProps) {
  return (
    <div className="setting-toggle">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="setting-toggle-input"
      />
      <label htmlFor={id} className="setting-toggle-label">
        <span className="setting-toggle-slider" />
        {label && <span className="setting-toggle-text">{label}</span>}
      </label>
    </div>
  );
}

interface SettingSelectProps<T extends string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  disabled?: boolean;
}

export function SettingSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  disabled = false,
}: SettingSelectProps<T>) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className="setting-select"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface SettingSliderProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string;
}

export function SettingSlider({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  showValue = true,
  unit = '',
}: SettingSliderProps) {
  return (
    <div className="setting-slider">
      <input
        type="range"
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="setting-slider-input"
      />
      {showValue && (
        <span className="setting-slider-value">
          {value}
          {unit}
        </span>
      )}
    </div>
  );
}

interface SettingInputProps {
  id?: string;
  type?: 'text' | 'number' | 'email';
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SettingInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
}: SettingInputProps) {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) =>
        onChange(type === 'number' ? Number(e.target.value) : e.target.value)
      }
      placeholder={placeholder}
      disabled={disabled}
      className="setting-input"
    />
  );
}

// ==================== CATEGORY COMPONENTS ====================

export function ThemeSettings() {
  const { data: theme, isLoading } = useTheme();
  const updateTheme = useUpdateTheme();
  const { resolvedMode, toggleMode } = useThemeManager();
  
  if (isLoading || !theme) {
    return <div className="settings-loading">Loading theme settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Theme"
      description="Customize the app's appearance"
    >
      <SettingRow
        label="Theme Mode"
        description="Choose light, dark, or auto (follows system)"
        htmlFor="theme-mode"
      >
        <SettingSelect
          id="theme-mode"
          value={theme.mode}
          onChange={(mode) => updateTheme.mutate({ mode })}
          options={[
            { value: ThemeMode.LIGHT, label: 'Light' },
            { value: ThemeMode.DARK, label: 'Dark' },
            { value: ThemeMode.AUTO, label: 'Auto' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Color Scheme"
        description="Select your preferred color palette"
        htmlFor="color-scheme"
      >
        <SettingSelect
          id="color-scheme"
          value={theme.colorScheme}
          onChange={(colorScheme) => updateTheme.mutate({ colorScheme })}
          options={[
            { value: ColorScheme.DEFAULT, label: 'Default' },
            { value: ColorScheme.OCEAN, label: 'Ocean' },
            { value: ColorScheme.FOREST, label: 'Forest' },
            { value: ColorScheme.DESERT, label: 'Desert' },
            { value: ColorScheme.NIGHT, label: 'Night' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Display Density"
        description="Adjust spacing and layout density"
        htmlFor="density"
      >
        <SettingSelect
          id="density"
          value={theme.density}
          onChange={(density) => updateTheme.mutate({ density })}
          options={[
            { value: DisplayDensity.COMFORTABLE, label: 'Comfortable' },
            { value: DisplayDensity.COMPACT, label: 'Compact' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Background Images"
        description="Show decorative background images"
      >
        <SettingToggle
          checked={theme.showBackgroundImages}
          onChange={(showBackgroundImages) =>
            updateTheme.mutate({ showBackgroundImages })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="System Font"
        description="Use your device's default font"
      >
        <SettingToggle
          checked={theme.useSystemFont}
          onChange={(useSystemFont) => updateTheme.mutate({ useSystemFont })}
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function UnitsSettings() {
  const { data: units, isLoading } = useUnits();
  const updateUnits = useUpdateUnits();
  
  if (isLoading || !units) {
    return <div className="settings-loading">Loading units settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Units"
      description="Set measurement units and formats"
    >
      <SettingRow
        label="Measurement System"
        description="Choose metric or imperial units"
        htmlFor="measurement"
      >
        <SettingSelect
          id="measurement"
          value={units.measurement}
          onChange={(measurement) => updateUnits.mutate({ measurement })}
          options={[
            { value: MeasurementUnit.METRIC, label: 'Metric (cm, kg)' },
            { value: MeasurementUnit.IMPERIAL, label: 'Imperial (in, lb)' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Coordinates"
        description="Choose coordinate format"
        htmlFor="coordinates"
      >
        <SettingSelect
          id="coordinates"
          value={units.coordinates}
          onChange={(coordinates) => updateUnits.mutate({ coordinates })}
          options={[
            { value: CoordinateFormat.DECIMAL, label: 'Decimal (40.7128)' },
            { value: CoordinateFormat.DMS, label: 'DMS (40°42\'46")' },
            { value: CoordinateFormat.DM, label: 'DM (40°42.767\')' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Temperature"
        description="Choose temperature unit"
        htmlFor="temperature"
      >
        <SettingSelect
          id="temperature"
          value={units.temperature}
          onChange={(temperature) => updateUnits.mutate({ temperature })}
          options={[
            { value: TemperatureUnit.CELSIUS, label: 'Celsius (°C)' },
            { value: TemperatureUnit.FAHRENHEIT, label: 'Fahrenheit (°F)' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Show Unit Labels"
        description="Display unit abbreviations (cm, kg, etc.)"
      >
        <SettingToggle
          checked={units.showUnitLabels}
          onChange={(showUnitLabels) => updateUnits.mutate({ showUnitLabels })}
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function AccessibilitySettings() {
  const { data: accessibility, isLoading } = useAccessibility();
  const updateAccessibility = useUpdateAccessibility();
  
  if (isLoading || !accessibility) {
    return <div className="settings-loading">Loading accessibility settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Accessibility"
      description="Customize for your needs"
    >
      <SettingRow
        label="Contrast"
        description="Adjust color contrast level"
        htmlFor="contrast"
      >
        <SettingSelect
          id="contrast"
          value={accessibility.contrast}
          onChange={(contrast) => updateAccessibility.mutate({ contrast })}
          options={[
            { value: ContrastLevel.NORMAL, label: 'Normal (WCAG AA)' },
            { value: ContrastLevel.HIGH, label: 'High (WCAG AAA)' },
            { value: ContrastLevel.MAXIMUM, label: 'Maximum' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Motion"
        description="Control animations and transitions"
        htmlFor="motion"
      >
        <SettingSelect
          id="motion"
          value={accessibility.motion}
          onChange={(motion) => updateAccessibility.mutate({ motion })}
          options={[
            { value: MotionPreference.FULL, label: 'Full animations' },
            { value: MotionPreference.REDUCED, label: 'Reduced motion' },
            { value: MotionPreference.NONE, label: 'No animations' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Text Size"
        description="Adjust default text size"
        htmlFor="text-size"
      >
        <SettingSelect
          id="text-size"
          value={accessibility.textSize}
          onChange={(textSize) => updateAccessibility.mutate({ textSize })}
          options={[
            { value: TextSize.SMALL, label: 'Small' },
            { value: TextSize.NORMAL, label: 'Normal' },
            { value: TextSize.LARGE, label: 'Large' },
            { value: TextSize.XLARGE, label: 'Extra Large' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Screen Reader"
        description="Optimize for screen readers"
      >
        <SettingToggle
          checked={accessibility.screenReaderOptimized}
          onChange={(screenReaderOptimized) =>
            updateAccessibility.mutate({ screenReaderOptimized })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="Keyboard Hints"
        description="Show keyboard shortcuts"
      >
        <SettingToggle
          checked={accessibility.keyboardNavigationHints}
          onChange={(keyboardNavigationHints) =>
            updateAccessibility.mutate({ keyboardNavigationHints })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="Focus Indicators"
        description="Highlight focused elements"
      >
        <SettingToggle
          checked={accessibility.focusIndicators}
          onChange={(focusIndicators) =>
            updateAccessibility.mutate({ focusIndicators })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="Color Blind Mode"
        description="Adjust colors for color blindness"
      >
        <SettingToggle
          checked={accessibility.colorBlindMode}
          onChange={(colorBlindMode) =>
            updateAccessibility.mutate({ colorBlindMode })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="Haptic Feedback"
        description="Vibration feedback for actions"
      >
        <SettingToggle
          checked={accessibility.hapticFeedback}
          onChange={(hapticFeedback) =>
            updateAccessibility.mutate({ hapticFeedback })
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function SyncSettingsPanel() {
  const { data: sync, isLoading } = useSyncSettings();
  const updateSync = useUpdateSync();
  
  if (isLoading || !sync) {
    return <div className="settings-loading">Loading sync settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Sync"
      description="Configure data synchronization"
    >
      <SettingRow label="Auto Sync" description="Automatically sync changes">
        <SettingToggle
          checked={sync.autoSync}
          onChange={(autoSync) => updateSync.mutate({ autoSync })}
        />
      </SettingRow>
      
      {sync.autoSync && (
        <>
          <SettingRow
            label="Sync Frequency"
            description="How often to sync"
            htmlFor="sync-frequency"
          >
            <SettingSelect
              id="sync-frequency"
              value={sync.syncFrequency}
              onChange={(syncFrequency) => updateSync.mutate({ syncFrequency })}
              options={[
                { value: SyncFrequency.REALTIME, label: 'Realtime' },
                { value: SyncFrequency.EVERY_5_MIN, label: 'Every 5 minutes' },
                { value: SyncFrequency.EVERY_15_MIN, label: 'Every 15 minutes' },
                { value: SyncFrequency.EVERY_HOUR, label: 'Every hour' },
                { value: SyncFrequency.MANUAL, label: 'Manual only' },
              ]}
            />
          </SettingRow>
          
          <SettingRow
            label="Network"
            description="When to sync"
            htmlFor="network-preference"
          >
            <SettingSelect
              id="network-preference"
              value={sync.networkPreference}
              onChange={(networkPreference) =>
                updateSync.mutate({ networkPreference })
              }
              options={[
                { value: NetworkPreference.ANY, label: 'WiFi or Cellular' },
                { value: NetworkPreference.WIFI_ONLY, label: 'WiFi Only' },
              ]}
            />
          </SettingRow>
        </>
      )}
      
      <SettingRow
        label="Conflict Resolution"
        description="How to handle conflicts"
        htmlFor="conflict-resolution"
      >
        <SettingSelect
          id="conflict-resolution"
          value={sync.conflictResolution}
          onChange={(conflictResolution) =>
            updateSync.mutate({ conflictResolution })
          }
          options={[
            { value: ConflictResolution.ASK, label: 'Ask me' },
            { value: ConflictResolution.SERVER_WINS, label: 'Server wins' },
            { value: ConflictResolution.CLIENT_WINS, label: 'Client wins' },
            { value: ConflictResolution.NEWEST_WINS, label: 'Newest wins' },
          ]}
        />
      </SettingRow>
      
      <SettingRow label="Sync Photos" description="Include photos in sync">
        <SettingToggle
          checked={sync.syncPhotos}
          onChange={(syncPhotos) => updateSync.mutate({ syncPhotos })}
        />
      </SettingRow>
      
      <SettingRow label="Background Sync" description="Sync in background">
        <SettingToggle
          checked={sync.backgroundSync}
          onChange={(backgroundSync) => updateSync.mutate({ backgroundSync })}
        />
      </SettingRow>
      
      <SettingRow
        label="Sync Notifications"
        description="Show sync status notifications"
      >
        <SettingToggle
          checked={sync.showSyncNotifications}
          onChange={(showSyncNotifications) =>
            updateSync.mutate({ showSyncNotifications })
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function CacheSettingsPanel() {
  const { data: cache, isLoading } = useCacheSettings();
  const updateCache = useUpdateCache();
  
  if (isLoading || !cache) {
    return <div className="settings-loading">Loading cache settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Storage & Cache"
      description="Manage offline storage"
    >
      <SettingRow
        label="Max Storage"
        description="Maximum cache size"
        htmlFor="max-storage"
      >
        <SettingSlider
          id="max-storage"
          value={cache.maxStorageMB}
          onChange={(maxStorageMB) => updateCache.mutate({ maxStorageMB })}
          min={10}
          max={500}
          step={10}
          unit="MB"
        />
      </SettingRow>
      
      <SettingRow
        label="Eviction Policy"
        description="How to free space when full"
        htmlFor="eviction-policy"
      >
        <SettingSelect
          id="eviction-policy"
          value={cache.evictionPolicy}
          onChange={(evictionPolicy) => updateCache.mutate({ evictionPolicy })}
          options={[
            { value: CacheEvictionPolicy.DEFAULT, label: 'Default (LRU)' },
            { value: CacheEvictionPolicy.LRU, label: 'Least Recently Used' },
            { value: CacheEvictionPolicy.LFU, label: 'Least Frequently Used' },
            { value: CacheEvictionPolicy.TTL, label: 'Time-based' },
            { value: CacheEvictionPolicy.PRIORITY, label: 'Priority-based' },
          ]}
        />
      </SettingRow>
      
      <SettingRow label="Cache Photos" description="Store photos offline">
        <SettingToggle
          checked={cache.cachePhotos}
          onChange={(cachePhotos) => updateCache.mutate({ cachePhotos })}
        />
      </SettingRow>
      
      <SettingRow label="Cache Analytics" description="Store computed metrics">
        <SettingToggle
          checked={cache.cacheAnalytics}
          onChange={(cacheAnalytics) => updateCache.mutate({ cacheAnalytics })}
        />
      </SettingRow>
      
      <SettingRow
        label="Auto Compaction"
        description="Automatically clean up stale data"
      >
        <SettingToggle
          checked={cache.compactionEnabled}
          onChange={(compactionEnabled) =>
            updateCache.mutate({ compactionEnabled })
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function CameraSettingsPanel() {
  const { data: camera, isLoading } = useCameraSettings();
  const updateCamera = useUpdateCamera();
  
  if (isLoading || !camera) {
    return <div className="settings-loading">Loading camera settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Camera"
      description="Configure camera defaults"
    >
      <SettingRow
        label="Image Quality"
        description="Default quality for captures"
        htmlFor="quality"
      >
        <SettingSelect
          id="quality"
          value={camera.defaultQuality}
          onChange={(defaultQuality) => updateCamera.mutate({ defaultQuality })}
          options={[
            { value: ImageQuality.LOW, label: 'Low (720p)' },
            { value: ImageQuality.MEDIUM, label: 'Medium (1080p)' },
            { value: ImageQuality.HIGH, label: 'High (1080p, less compression)' },
            { value: ImageQuality.MAXIMUM, label: 'Maximum (full res)' },
          ]}
        />
      </SettingRow>
      
      <SettingRow
        label="Image Format"
        description="File format for saving"
        htmlFor="format"
      >
        <SettingSelect
          id="format"
          value={camera.defaultFormat}
          onChange={(defaultFormat) => updateCamera.mutate({ defaultFormat })}
          options={[
            { value: ImageFormat.JPEG, label: 'JPEG' },
            { value: ImageFormat.PNG, label: 'PNG' },
            { value: ImageFormat.WEBP, label: 'WebP' },
          ]}
        />
      </SettingRow>
      
      <SettingRow label="GPS Tagging" description="Include location in photos">
        <SettingToggle
          checked={camera.enableGPS}
          onChange={(enableGPS) => updateCamera.mutate({ enableGPS })}
        />
      </SettingRow>
      
      <SettingRow
        label="Embed Metadata"
        description="Include camera/device info"
      >
        <SettingToggle
          checked={camera.embedMetadata}
          onChange={(embedMetadata) => updateCamera.mutate({ embedMetadata })}
        />
      </SettingRow>
      
      <SettingRow label="Capture Sound" description="Play shutter sound">
        <SettingToggle
          checked={camera.captureSound}
          onChange={(captureSound) => updateCamera.mutate({ captureSound })}
        />
      </SettingRow>
      
      <SettingRow label="Grid Overlay" description="Show composition grid">
        <SettingToggle
          checked={camera.gridOverlay}
          onChange={(gridOverlay) => updateCamera.mutate({ gridOverlay })}
        />
      </SettingRow>
      
      <SettingRow label="Save to Gallery" description="Copy to device photos">
        <SettingToggle
          checked={camera.saveToGallery}
          onChange={(saveToGallery) => updateCamera.mutate({ saveToGallery })}
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function PrivacySettingsPanel() {
  const { data: privacy, isLoading } = usePrivacySettings();
  const updatePrivacy = useUpdatePrivacy();
  
  if (isLoading || !privacy) {
    return <div className="settings-loading">Loading privacy settings...</div>;
  }
  
  return (
    <SettingsSection
      title="Privacy"
      description="Control your data sharing"
    >
      <SettingRow label="Share Location" description="Include GPS coordinates">
        <SettingToggle
          checked={privacy.shareLocation}
          onChange={(shareLocation) => updatePrivacy.mutate({ shareLocation })}
        />
      </SettingRow>
      
      <SettingRow label="Share Photos" description="Upload specimen photos">
        <SettingToggle
          checked={privacy.sharePhotos}
          onChange={(sharePhotos) => updatePrivacy.mutate({ sharePhotos })}
        />
      </SettingRow>
      
      <SettingRow label="Share Finds" description="Make finds visible">
        <SettingToggle
          checked={privacy.shareFinds}
          onChange={(shareFinds) => updatePrivacy.mutate({ shareFinds })}
        />
      </SettingRow>
      
      <SettingRow
        label="Public Profile"
        description="Allow others to view your profile"
      >
        <SettingToggle
          checked={privacy.allowPublicProfile}
          onChange={(allowPublicProfile) =>
            updatePrivacy.mutate({ allowPublicProfile })
          }
        />
      </SettingRow>
      
      <SettingRow
        label="Data Retention"
        description="Keep data for (days)"
        htmlFor="retention"
      >
        <SettingSlider
          id="retention"
          value={privacy.dataRetentionDays}
          onChange={(dataRetentionDays) =>
            updatePrivacy.mutate({ dataRetentionDays })
          }
          min={7}
          max={365}
          step={7}
          unit=" days"
        />
      </SettingRow>
    </SettingsSection>
  );
}

// ==================== MAIN LAYOUT ====================

export function SettingsLayout({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useSettings();
  const resetSettings = useResetSettings();
  const exportSettings = useExportSettings();
  const importSettings = useImportSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const handleExport = async () => {
    try {
      const exported = await exportSettings.mutateAsync();
      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rockhound-settings-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importSettings.mutateAsync({ exportData: data, merge: true });
    } catch (error) {
      console.error('Import failed:', error);
    }
  };
  
  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    
    try {
      await resetSettings.mutateAsync({ keepUserId: true, keepDeviceId: true });
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };
  
  if (isLoading) {
    return <div className="settings-loading-screen">Loading settings...</div>;
  }
  
  return (
    <div className="settings-layout">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <div className="settings-actions">
          <button onClick={handleExport} className="settings-action-button">
            Export
          </button>
          <label className="settings-action-button">
            Import
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={handleReset}
            className={`settings-action-button ${
              showResetConfirm ? 'settings-action-button-danger' : ''
            }`}
          >
            {showResetConfirm ? 'Confirm Reset?' : 'Reset All'}
          </button>
        </div>
      </header>
      
      <main className="settings-content">{children}</main>
    </div>
  );
}

// ==================== SETTINGS PAGE ====================

export default function SettingsPage() {
  return (
    <SettingsLayout>
      <ThemeSettings />
      <UnitsSettings />
      <AccessibilitySettings />
      <SyncSettingsPanel />
      <CacheSettingsPanel />
      <CameraSettingsPanel />
      <PrivacySettingsPanel />
    </SettingsLayout>
  );
}

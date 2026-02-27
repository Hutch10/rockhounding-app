# Progressive Web App (PWA) Guide

This document describes the Progressive Web App capabilities of the Rockhounding MVP, including installation, offline support, and limitations.

## What is a PWA?

A **Progressive Web App** is a web application that can be installed on a user's device and behaves like a native app, with:

- **App-like experience**: Full-screen display, app icon on home screen
- **Offline support**: Core functionality works without internet connection
- **Fast loading**: Assets cached for instant startup
- **Background sync**: Deferred operations when connection is restored (future)

## Installation

### Desktop (Chrome/Edge)

1. **Open the app** in Chrome or Edge browser
2. **Look for install prompt** in the address bar (+ icon or install button)
3. **Click "Install"** when prompted
4. **Launch from desktop** via app icon or Start menu

**Alternative method**:

- Click browser menu (⋮)
- Select "Install Rockhounding MVP"
- Confirm installation

### Mobile (iOS)

1. **Open the app** in Safari
2. **Tap Share button** (square with arrow pointing up)
3. **Scroll down** and tap "Add to Home Screen"
4. **Customize name** (optional) and tap "Add"
5. **Launch from home screen** via app icon

### Mobile (Android)

1. **Open the app** in Chrome
2. **Look for install banner** at the bottom of the screen
3. **Tap "Install"** or "Add to Home Screen"
4. **Confirm installation**
5. **Launch from home screen** via app icon

**Alternative method**:

- Tap browser menu (⋮)
- Select "Install app" or "Add to Home Screen"
- Confirm installation

## Offline Capabilities

### What Works Offline

1. **App Shell**
   - Homepage loads instantly
   - Navigation between pages (map, observations, exports)
   - UI components render normally
   - Previously visited pages load from cache

2. **State Packs**
   - Previously downloaded state packs remain accessible
   - Can view cached GeoJSON data
   - Location coordinates and details available
   - Materials and rulesets remain viewable

3. **Cached Assets**
   - CSS styles
   - JavaScript bundles
   - Fonts (Google Fonts)
   - UI icons and images

4. **Offline Indicator**
   - App detects offline status
   - Shows banner: "You are offline. Some features may be unavailable."
   - Disables network-dependent actions

### What Requires Network Connection

1. **Live Map Tiles**
   - Mapbox tiles require internet
   - Map will show blank/gray tiles when offline
   - Fallback: Use downloaded state packs for location data

2. **API Calls**
   - Creating observations (must be online)
   - Creating export jobs (must be online)
   - Fetching location details (must be online)
   - Moderation actions (must be online)

3. **Real-Time Data**
   - Latest locations (need fresh API call)
   - Export job status updates (need polling)
   - State pack generation status (need polling)

4. **Authentication**
   - Sign in/sign out (requires network)
   - JWT token refresh (requires network)

5. **Storage Downloads**
   - New state pack downloads (requires network)
   - Export file downloads (requires network)
   - Signed URLs expire after 1 hour

## Service Worker Architecture

### Caching Strategies

The app uses multiple caching strategies based on asset type:

#### 1. Cache-First (App Shell)

```
Request → Check Cache → Return Cached → (Background: Update Cache)
```

**Used for**:

- HTML pages (/, /map, /observations, /exports)
- Next.js static bundles (`_next/static/`)
- CSS stylesheets
- JavaScript bundles

**Behavior**:

- Instant load from cache
- Fallback to network if cache miss
- Cache updated in background

#### 2. Network-First (API Data)

```
Request → Try Network → Return Fresh → (Fallback: Return Cached)
```

**Used for**:

- API routes (`/api/*`)
- Dynamic data
- User-generated content

**Behavior**:

- Always tries network first
- Falls back to cache if offline
- Shows offline message if no cache

#### 3. Stale-While-Revalidate (Runtime Assets)

```
Request → Return Cached Immediately → (Background: Fetch Fresh + Update Cache)
```

**Used for**:

- Google Fonts
- Images (PNG, JPG, SVG)
- Icons

**Behavior**:

- Instant response from cache
- Fresh data fetched in background
- Cache updated for next request

#### 4. Network-Only (No Caching)

```
Request → Fetch Network → Return Fresh (Never Cache)
```

**Used for**:

- Admin routes (`/api/admin/*`)
- Supabase API calls
- Mapbox tile requests
- Authentication endpoints

**Behavior**:

- Always fetches from network
- No caching (security/freshness)
- Returns error if offline

### Cache Management

**Cache Names**:

- `rockhounding-shell-v1`: App shell assets
- `rockhounding-runtime-v1`: Runtime assets (fonts, images)

**Cache Invalidation**:

- Old caches deleted on service worker activation
- Cache version incremented on updates
- Users get fresh content after SW update

**Cache Size**:

- Estimated 5-10 MB for shell + runtime
- Does NOT cache API responses or map tiles
- User must clear cache manually via browser settings if needed

## Updating the App

### Automatic Updates

1. **Service worker checks for updates** on each page load
2. **New version downloaded** in background
3. **User prompted to update**: "New version available. Refresh to update."
4. **User clicks "Update"** or refreshes page
5. **New version activated** after refresh

### Manual Update

If automatic update fails:

1. **Open app** in browser
2. **Access DevTools** (F12)
3. **Navigate to Application tab** → Service Workers
4. **Click "Unregister"** to remove old service worker
5. **Refresh page** to install new version

## Development Mode

### Testing Offline Mode

1. **Open DevTools** (F12)
2. **Navigate to Network tab**
3. **Select "Offline"** from throttling dropdown
4. **Refresh page** to test offline behavior

### Inspecting Service Worker

1. **Open DevTools** (F12)
2. **Navigate to Application tab** → Service Workers
3. **View service worker status**: Installing / Waiting / Activated
4. **Check "Update on reload"** for development
5. **View Cache Storage** to inspect cached assets

### Disabling Service Worker

For development testing:

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => registration.unregister());
});
```

Or use "Unregister" button in DevTools → Application → Service Workers.

## PWA Manifest Details

### App Identity

```json
{
  "name": "Rockhounding MVP",
  "short_name": "Rockhounding",
  "description": "Discover prime rockhounding locations with legal gating, private observations, and offline-capable state packs."
}
```

### Display Mode

```json
{
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/"
}
```

- **Standalone**: Full-screen without browser UI
- **Portrait-primary**: Optimized for vertical orientation
- **Scope**: App controls all routes under `/`

### Branding

```json
{
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

- **Theme color**: Blue (#2563eb) for status bar
- **Background color**: White (#ffffff) for splash screen

### Icons

| Size    | Purpose            | Path                      |
| ------- | ------------------ | ------------------------- |
| 72x72   | Small icon         | `/icons/icon-72x72.png`   |
| 96x96   | Standard           | `/icons/icon-96x96.png`   |
| 128x128 | High-DPI           | `/icons/icon-128x128.png` |
| 144x144 | Windows tile       | `/icons/icon-144x144.png` |
| 152x152 | iOS                | `/icons/icon-152x152.png` |
| 192x192 | Android (maskable) | `/icons/icon-192x192.png` |
| 384x384 | High-DPI Android   | `/icons/icon-384x384.png` |
| 512x512 | Android (maskable) | `/icons/icon-512x512.png` |

**Note**: Icons must be placed in `/apps/web/public/icons/` directory.

### App Shortcuts

Quick actions accessible from app icon long-press:

1. **Map**: Navigate to `/map`
2. **Observations**: Navigate to `/observations`
3. **Exports**: Navigate to `/exports`

## Future PWA Features (Out of Scope for MVP)

The following features are **not implemented** in the MVP but are prepared in the service worker for future development:

### 1. Background Sync

**Use case**: Create observations offline, sync when connection restored

```javascript
// Register sync event (future)
navigator.serviceWorker.ready.then((registration) => {
  return registration.sync.register('sync-observations');
});
```

**Current status**: Placeholder in service worker, not active

### 2. Push Notifications

**Use case**: Notify users of export completion, new locations

**Current status**: Event listeners present, not configured

### 3. Periodic Background Sync

**Use case**: Auto-download state pack updates

**Current status**: Not implemented (requires permission + battery optimization)

### 4. Share Target

**Use case**: Share locations from other apps

**Current status**: Manifest configured, endpoint not implemented

## Troubleshooting

### PWA Not Installing

**Problem**: Install prompt doesn't appear

**Solutions**:

- Verify site is served over HTTPS (or localhost)
- Check `manifest.json` is accessible
- Verify service worker registered successfully
- Check browser console for errors

### Offline Mode Not Working

**Problem**: App doesn't load when offline

**Solutions**:

- Verify service worker is active (DevTools → Application → Service Workers)
- Check cache storage contains shell assets
- Clear cache and reload (may need to revisit pages online first)
- Check console for SW errors

### Service Worker Update Stuck

**Problem**: New version doesn't activate

**Solutions**:

- Close all app tabs and reopen
- Click "skipWaiting" in DevTools → Application → Service Workers
- Unregister service worker and refresh
- Clear browser cache

### Map Tiles Not Loading Offline

**Expected behavior**: Map tiles require network connection

**Workaround**: Use state pack downloads (vector GeoJSON) instead of raster map tiles

### Icons Not Showing

**Problem**: App icon missing or incorrect

**Solutions**:

- Verify icons exist in `/apps/web/public/icons/`
- Check icon paths in `manifest.json`
- Generate icons from base image (512x512 source)
- Clear PWA cache and reinstall

## Icon Generation

To generate all required icon sizes from a single source image:

### Using ImageMagick

```bash
# Install ImageMagick
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Generate all sizes from source (512x512)
cd apps/web/public/icons
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

### Using Online Tools

1. Upload 512x512 source image to [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Download generated icon pack
3. Extract to `/apps/web/public/icons/`
4. Verify paths match `manifest.json`

## Monitoring PWA Health

### Lighthouse Audit

Run Lighthouse in Chrome DevTools to check PWA compliance:

1. Open DevTools (F12)
2. Navigate to **Lighthouse** tab
3. Select **Progressive Web App** category
4. Click **Generate report**
5. Review score and recommendations

**Target score**: 90+ for production

### Required Checks

- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Contains a web app manifest
- ✅ Has a valid theme color
- ✅ Has a valid maskable icon
- ✅ Provides a valid apple-touch-icon
- ✅ Viewport meta tag is set

## Best Practices

### For Users

1. **Install the app** for fastest experience
2. **Download state packs** while online for offline access
3. **Keep app updated** by accepting update prompts
4. **Clear cache** if experiencing issues (Settings → Storage)

### For Developers

1. **Test offline mode** during development
2. **Increment cache version** when deploying updates
3. **Monitor service worker** errors in production
4. **Validate manifest** with Lighthouse
5. **Provide fallback UI** for offline states
6. **Use network-only** for sensitive/dynamic data

## Production Checklist

Before deploying PWA to production:

- [ ] Service worker registered in production build
- [ ] `manifest.json` accessible at root
- [ ] All icon sizes generated and placed in `/public/icons/`
- [ ] HTTPS enabled (required for PWA)
- [ ] Cache versioning strategy in place
- [ ] Offline fallback pages implemented
- [ ] Update prompts working correctly
- [ ] Lighthouse PWA audit passes (90+)
- [ ] Tested on iOS Safari (Add to Home Screen)
- [ ] Tested on Android Chrome (Install banner)
- [ ] Desktop install tested (Chrome/Edge)
- [ ] Service worker updates smoothly without breaking
- [ ] Cache storage quota acceptable (<50 MB)

## References

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Google: Service Worker Lifecycle](https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle)
- [PWA Builder: Manifest Generator](https://www.pwabuilder.com/)

---

**Last Updated**: January 21, 2026  
**Next Review**: After first production deployment

# Map Page - Thin Pins Implementation

This directory implements the map browsing experience following the Build Document rules.

## Architecture

### Server Components

- **`page.tsx`**: Server component wrapper that provides metadata and configuration

### Client Components

- **`MapClient.tsx`**: Main client component with Mapbox GL JS integration
- **`components/PinPopup.tsx`**: Popup UI showing 3 badges per pin

### Hooks

- **`hooks/useMapPins.ts`**: Debounced fetching of thin pins on viewport changes

### Utilities

- **`utils/bboxFromMap.ts`**: Convert Mapbox LngLatBounds to API bbox format

### Types

- **`types.ts`**: Map-specific types, constants, and color mappings

## Build Document Compliance

### ✅ Rule #2: Thin Pins Only

- Map uses **ONLY** the `/api/locations?bbox=...` endpoint
- **NEVER** fetches full-detail data during panning
- Limits to 2000 pins per request (API enforced)
- Returns only 9 fields per pin (id, name, lat, lon, legal_tag, access_model, difficulty, kid_friendly, status)

### ✅ Progressive Disclosure by Zoom

The map implements 3 zoom tiers:

| Zoom Level | Behavior                 | Marker Size |
| ---------- | ------------------------ | ----------- |
| < 6        | Pins hidden              | N/A         |
| 6-9        | Simplified markers       | 20px        |
| 10+        | Full markers with popups | 30px        |

**Constants defined in `types.ts`**:

```typescript
export const ZOOM_THRESHOLDS = {
  MIN_VISIBLE: 6, // Hide markers below this
  CLUSTER_MAX: 9, // Simplify markers below this
  FULL_PINS: 10, // Full markers + popups above this
};
```

### ✅ Legal Gating UI

- **Marker colors** reflect legal status:
  - Green: `LEGAL_PUBLIC` (legal, no restrictions)
  - Blue: `LEGAL_FEE_SITE` (legal, fee required)
  - Yellow: `LEGAL_CLUB_SUPERVISED` (legal, club membership required)
  - Gray: `GRAY_AREA` (questionable, observe only)
  - Red: `RESEARCH_ONLY` (restricted, no collecting)

- **Popup banner** for restricted areas:
  - Shows "⚠️ Observe/Verify Only" for `GRAY_AREA` and `RESEARCH_ONLY`
  - Emphasizes that collecting is NOT permitted

### ✅ 3 Badges per Pin

Every pin popup displays exactly 3 badges:

1. **Legal Status**: `legal_tag` (e.g., "Legal Public")
2. **Access Model**: `access_model` (e.g., "Walk-in")
3. **Difficulty**: `difficulty` (1-5 stars)

## Data Flow

```
User pans/zooms map
  ↓
MapClient detects 'moveend'/'zoomend' events
  ↓
useMapPins hook debounces (150ms)
  ↓
bboxFromMap() converts LngLatBounds → "minLon,minLat,maxLon,maxLat"
  ↓
fetch(/api/locations?bbox=...)
  ↓
API returns thin pins (max 2000)
  ↓
MapClient renders markers + popups
```

## Key Implementation Details

### Debouncing (150ms)

- Prevents excessive API calls during rapid panning
- Implemented in `useMapPins.ts` using `setTimeout()`
- Cancels previous pending requests on new viewport changes

### Popup Rendering

- Uses React `createRoot()` to render React components inside Mapbox popups
- `PinPopup` component receives `ThinLocationPin` data
- Popups are destroyed and recreated on marker clicks

### No Clustering

- Build Document specifies NO clustering in this step
- Future enhancement: implement clustering for zoom < 10

### No Full Detail

- Clicking a pin shows popup with thin data only
- **Step 7** will add "View Details" button → full-detail view
- This ensures compliance with Rule #2

## Environment Variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

Required in `.env.local` for Mapbox GL JS.

## Testing

### Unit Tests

- **`utils/__tests__/bboxFromMap.test.ts`**: 15 tests covering bbox conversion edge cases
  - Normal bounds
  - Antimeridian crossing
  - Extreme coordinates
  - Validation logic

### Future Tests (Step 7)

- Integration tests for map interactions
- E2E tests for pin clicking → detail view

## File Structure

```
/apps/web/app/map/
├── page.tsx                    # Server component wrapper
├── MapClient.tsx               # Client component with Mapbox
├── types.ts                    # Type definitions + constants
├── README.md                   # This file
├── components/
│   └── PinPopup.tsx           # Popup UI component
├── hooks/
│   └── useMapPins.ts          # Debounced fetching logic
└── utils/
    ├── bboxFromMap.ts         # Bbox conversion
    └── __tests__/
        └── bboxFromMap.test.ts # Unit tests
```

## Performance Considerations

### Optimizations

- Debounced viewport changes (150ms)
- API-level limit of 2000 pins
- No full-detail fetching during panning
- Marker size reduction at lower zoom levels

### Future Enhancements (Outside Current Scope)

- Server-side clustering for zoom < 10
- Marker icon sprites for faster rendering
- Viewport-based pagination for > 2000 pins
- WebGL marker rendering for large datasets

## Browser Compatibility

- **Mapbox GL JS 3.1.0** requires WebGL support
- Tested browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Progressive enhancement: Falls back to static message if WebGL unavailable

## Accessibility

- Keyboard navigation via Mapbox controls (zoom +/-, navigation)
- ARIA labels on interactive elements
- High-contrast marker colors for colorblind users
- Future: Screen reader announcements for pin interactions

## Next Steps (Step 7)

- Add full-detail endpoint: `GET /api/locations/:id`
- Implement detail view component
- Add "View Details" button to popups
- Display full location data (description, directions, parking, materials, rulesets, sources)
- Enforce legal gating: disable collection UI for `GRAY_AREA` / `RESEARCH_ONLY`
- Add "Why?" link to primary ruleset explanation

# Location Detail Page - Full Detail Implementation

This directory implements the full location detail view following Build Document Rule #3.

## Architecture

### Server Components

- **`page.tsx`**: Server component that fetches full detail and handles metadata
  - Server-side rendering for SEO
  - Validates ID parameter
  - Fetches from `/api/locations/:id`
  - Returns 404 for invalid/missing locations

### Client Components

- **`LocationDetailClient.tsx`**: Client component with interactive UI
  - 3 badges display (legal_tag, access_model, difficulty)
  - Legal gating banner for restricted areas
  - "Why?" link to primary ruleset
  - Materials, rulesets, sources lists
  - Description and coordinates
  - Disabled collection UI for restricted areas

## Build Document Compliance

### ✅ Rule #3: Full Detail Endpoint Contract

- Fetches from `/api/locations/:id` (NOT thin pins)
- Displays ALL 14 core fields:
  - Core: id, name, description
  - Geography: lat, lon
  - Legal: legal_tag, legal_confidence, primary_ruleset_id
  - Provenance: source_tier, verification_date
  - Status: status
  - Accessibility: access_model, difficulty, kid_friendly

- Displays 3 related arrays:
  - materials[] (id, name, category)
  - rulesets[] (id, name, authority, url, summary)
  - sources[] (id, citation, url, date_accessed)

### ✅ Legal Gating UI

**Restricted Areas**: `GRAY_AREA` and `RESEARCH_ONLY`

When location has restricted status:

1. **Yellow warning banner** at top:
   - "⚠️ Observe/Verify Only"
   - Explains legal status clearly
   - Warns that collecting may be prohibited

2. **Materials section** shows disclaimer:
   - "Note: Collecting these materials may be restricted at this location."

3. **Disabled collection UI**:
   - Gray section at bottom states "Collection Features Disabled"
   - Explains this is observation/research only
   - Future: Will disable sampling forms, trip planning for collection

### ✅ "Why?" Link

- Primary ruleset highlighted with blue background
- Large "Why? →" button links to ruleset.url
- Shows authority and summary
- Displays legal_confidence percentage
- External link opens in new tab

### ✅ 3 Badges

Every detail page displays exactly 3 badges:

1. **Legal Status**: Color-coded (green/blue/yellow/gray/red)
2. **Access Model**: Purple badge (e.g., "Walk-in", "4WD Required")
3. **Difficulty**: Orange badge with star rating (1-5 stars)

Optional 4th badge: "Kid Friendly" (green) if applicable

### ✅ Separation of Concerns

- Map page (Step 6) uses ONLY thin pins endpoint
- Detail page (Step 7) uses ONLY full detail endpoint
- NO map rendering on detail page
- "Back to Map" link returns to map view

## Data Flow

```
User clicks pin on map (Step 6)
  ↓
Navigate to /location/:id
  ↓
page.tsx (server component) fetches GET /api/locations/:id
  ↓
API returns full detail (14 fields + 3 arrays)
  ↓
LocationDetailClient.tsx renders UI
  ↓
User sees: badges, description, materials, rulesets, sources
```

## UI Components

### Legal Gating Banner (Restricted Only)

```tsx
{
  isRestricted && (
    <div className="bg-yellow-50 border-l-4 border-yellow-400">
      <h3>⚠️ Observe/Verify Only</h3>
      <p>This location has {legal_tag} status...</p>
    </div>
  );
}
```

### 3 Badges

```tsx
<div className="flex gap-3">
  <Badge color={LEGAL_TAG_COLORS[legal_tag]}>Legal Public</Badge>
  <Badge color="purple">Walk-in</Badge>
  <Badge color="orange">★★★☆☆</Badge>
</div>
```

### "Why?" Link

```tsx
<a href={primaryRuleset.url} target="_blank">
  Why? →
</a>
```

### Materials List

- Grid layout (2 columns)
- Shows name + category
- Disclaimer if restricted

### Rulesets Section

- Primary ruleset highlighted (blue box)
- Shows legal_confidence percentage
- "Why?" button links to authoritative source
- Additional rulesets listed below

### Sources Section

- Shows source_tier badge
- Displays verification_date
- Lists all citations
- Links to original sources

## Legal Status Color Coding

| Legal Tag               | Color  | Badge Text            |
| ----------------------- | ------ | --------------------- |
| `LEGAL_PUBLIC`          | Green  | Legal Public          |
| `LEGAL_FEE_SITE`        | Blue   | Legal Fee Site        |
| `LEGAL_CLUB_SUPERVISED` | Yellow | Legal Club Supervised |
| `GRAY_AREA`             | Gray   | Gray Area             |
| `RESEARCH_ONLY`         | Red    | Research Only         |

**Restricted**: `GRAY_AREA` and `RESEARCH_ONLY` show legal gating banner

## File Structure

```
/apps/web/app/location/[id]/
├── page.tsx                     # Server component (fetch + metadata)
├── LocationDetailClient.tsx     # Client component (UI)
└── README.md                    # This file
```

## Testing

### Manual Testing Checklist

- [ ] Valid ID shows full detail
- [ ] Invalid ID returns 404
- [ ] Non-numeric ID returns 404
- [ ] All 14 core fields displayed
- [ ] Materials array populated
- [ ] Rulesets array populated
- [ ] Sources array populated
- [ ] Legal gating banner shows for GRAY_AREA/RESEARCH_ONLY
- [ ] "Why?" link works and opens in new tab
- [ ] 3 badges displayed correctly
- [ ] Back to map link works
- [ ] Metadata (title, description) generated

### Future Unit Tests (Step 8+)

- Component rendering tests
- Legal gating logic tests
- Badge display tests
- Link validation tests

## Performance Considerations

### Server-Side Rendering

- Full detail fetched on server (not client)
- SEO-friendly metadata generation
- No client-side API calls for initial load

### Caching

- API endpoint caches for 60 seconds
- Server component uses `cache: 'no-store'` for fresh data
- Future: Add revalidation strategy

### Data Transfer

- Full detail response ~5-20 KB per location
- Acceptable for detail pages (not used in map panning)
- Materials/rulesets/sources arrays kept small

## Accessibility

- Semantic HTML structure (headings, lists, sections)
- High-contrast colors for readability
- Warning banner with icon for restricted areas
- External links open in new tab with rel="noopener noreferrer"
- Keyboard navigation supported

## Browser Compatibility

- No client-side JavaScript required for initial render
- Progressive enhancement for interactive elements
- Compatible with all modern browsers
- Falls back gracefully without JavaScript

## Next Steps (Step 8)

Step 8 will add moderation UI:

- Admin dashboard for reviewing staged locations
- Approval/rejection workflow
- Edit location details
- Change legal_tag with justification
- Provenance tracking for all changes

## Related Documentation

- **API Documentation**: `/apps/web/app/api/locations/[id]/README.md` (if exists)
- **Map Page**: `/apps/web/app/map/README.md` (Step 6)
- **Build Document**: Root-level BUILD.md (locked contracts)
- **Shared Enums**: `/packages/shared/README.md` (locked enums)

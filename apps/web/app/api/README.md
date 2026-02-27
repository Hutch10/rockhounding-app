# Rockhounding App API

Production API routes for rockhounding location data.

## Endpoints

### GET /api/locations - Thin Pins Bbox Endpoint

**Purpose:** Fetch thin location pins for map browsing using bounding box queries.

**Build Document Rules:**

- NON-NEGOTIABLE RULE #2: Map browsing uses a THIN PINS endpoint with bbox queries
- NON-NEGOTIABLE RULE #3: Full location detail is fetched ONLY on pin click
- Uses GIST index on `locations.geom` for performance
- Max 2000 results per request
- Cacheable (60 second TTL)

#### Query Parameters

| Parameter        | Type    | Required | Description                                                 |
| ---------------- | ------- | -------- | ----------------------------------------------------------- |
| `bbox`           | string  | **Yes**  | Bounding box: `minLon,minLat,maxLon,maxLat`                 |
| `legal_tag`      | enum    | No       | Filter by legal status (LEGAL_PUBLIC, LEGAL_FEE_SITE, etc.) |
| `access_model`   | enum    | No       | Filter by access type (PUBLIC_LAND, FEE_SITE, etc.)         |
| `material_id`    | UUID    | No       | Filter by material (joins to location_materials)            |
| `difficulty_max` | number  | No       | Max difficulty level (1-5)                                  |
| `kid_friendly`   | boolean | No       | Filter kid-friendly locations (true/false)                  |

#### Response Format

```typescript
{
  data: ThinLocationPin[],
  count: number,
  max_results: number
}
```

**ThinLocationPin fields (LOCKED):**

- `id` - UUID
- `name` - Location name
- `lat` - Latitude
- `lon` - Longitude
- `legal_tag` - Legal status
- `access_model` - Access type
- `difficulty` - Difficulty (1-5 or null)
- `kid_friendly` - Boolean
- `status` - Operational status

#### Example Requests

**Basic bbox query:**

```bash
GET /api/locations?bbox=-120.5,35.2,-119.8,36.1
```

**With filters:**

```bash
GET /api/locations?bbox=-120,35,-119,36&legal_tag=LEGAL_PUBLIC&difficulty_max=3&kid_friendly=true
```

**Material filter:**

```bash
GET /api/locations?bbox=-120,35,-119,36&material_id=550e8400-e29b-41d4-a716-446655440000
```

#### Error Responses

**400 Bad Request:**

```json
{
  "error": "Invalid query parameters",
  "details": { ... }
}
```

**500 Internal Server Error:**

```json
{
  "error": "Failed to fetch locations",
  "message": "..."
}
```

---

### GET /api/locations/:id - Full Detail Endpoint

**Status:** Not implemented yet (Step 7)

**Purpose:** Fetch full location details on pin click.

**Will include:**

- All thin pin fields
- Description, directions, parking info
- Materials array
- Rulesets array with primary ruleset
- Sources and provenance data

---

## Implementation Notes

### PostGIS Bbox Query

The endpoint uses PostGIS for efficient spatial queries:

```sql
SELECT ... FROM locations
WHERE ST_Intersects(
  geom,
  ST_MakeEnvelope(minLon, minLat, maxLon, maxLat, 4326)
)
LIMIT 2000
```

This leverages the GIST index on `locations.geom` for fast bbox lookups.

### Thin vs Full Detail

**Thin pins (this endpoint):**

- Used for map browsing
- No joins to related tables
- Fast, cacheable
- Returns only essential display fields

**Full detail (Step 7):**

- Used on pin click
- Joins materials, rulesets, sources
- Slower, but fetched only once per location
- Returns complete information

### Legal Gating

Legal gating is enforced in the UI based on `legal_tag`:

- `GRAY_AREA` / `RESEARCH_ONLY` → Show observe/verify banner
- Disable collection UI for restricted areas

The thin pins endpoint returns `legal_tag` so the UI can enforce gating immediately.

---

## Testing

Run unit tests:

```bash
cd apps/web
pnpm test app/api/locations
```

Tests cover:

- Query parameter validation
- Bbox parsing
- Optional filter handling
- Response shape validation
- Forbidden field detection

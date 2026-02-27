# Offline State Pack Generator (Vector-Only JSON Packs)

**Build Document Step 11**

This module implements offline state packs for rockhounding data. Users can download vector-only JSON files containing locations, rulesets, and materials for offline use without map tiles or photos.

## 🔒 Security Model

### Access Control

- **Public access** - State packs are available to all users (no authentication required)
- **Signed URLs only** - Download URLs expire after 1 hour
- **Approved locations only** - Packs include only `status=approved` locations
- **No private data** - Private observations excluded from all packs
- **No staging data** - Only approved content included

## 📋 Build Document Rules

### State Pack Content (Vector-Only)

- **Locations**: id, name, lat, lon, legal_tag, access_model, difficulty, kid_friendly, status
- **Rulesets**: Only those referenced by locations in state
- **Materials**: Only those referenced by locations in state
- **Metadata**: Version, counts, generated timestamp

### Exclusions (LOCKED)

- ❌ No map tiles (vector-only)
- ❌ No photos
- ❌ No private observations
- ❌ No staging data
- ❌ No geometry beyond lat/lon

### Background Processing

- Supabase Edge Function generates packs nightly or on-demand
- For each state: Query approved locations → Query referenced rulesets/materials → Build JSON → Upload to Storage → Update state_packs table

## 🏗️ Architecture

### API Endpoints

#### GET /api/state-packs

List all available state packs

**Response:**

```json
[
  {
    "state": "CA",
    "updated_at": "2024-01-01T00:00:00Z",
    "size_bytes": 1024000,
    "download_url": "https://supabase.co/storage/v1/object/sign/state-packs/CA.json?token=..."
  },
  {
    "state": "TX",
    "updated_at": "2024-01-02T00:00:00Z",
    "size_bytes": 2048000,
    "download_url": "https://supabase.co/storage/v1/object/sign/state-packs/TX.json?token=..."
  }
]
```

#### GET /api/state-packs/:state

Get single state pack download URL

**Response:**

```json
{
  "state": "CA",
  "updated_at": "2024-01-01T00:00:00Z",
  "size_bytes": 1024000,
  "download_url": "https://supabase.co/storage/v1/object/sign/state-packs/CA.json?token=..."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid state code (must be 2 letters)
- `404 Not Found` - State pack not found

### State Pack JSON Structure

```json
{
  "state": "CA",
  "generated_at": "2024-01-01T00:00:00Z",
  "locations": [
    {
      "id": "uuid",
      "name": "Crystal Cove",
      "lat": 37.7749,
      "lon": -122.4194,
      "legal_tag": "public_land",
      "access_model": "free_public",
      "difficulty": 3,
      "kid_friendly": true,
      "status": "approved"
    }
  ],
  "rulesets": [
    {
      "id": "uuid",
      "legal_tag": "public_land",
      "body": "Public land collecting rules..."
    }
  ],
  "materials": [
    {
      "id": "uuid",
      "name": "Quartz",
      "category": "minerals"
    }
  ],
  "metadata": {
    "version": "1.0",
    "location_count": 150,
    "ruleset_count": 5,
    "material_count": 20
  }
}
```

### Background Processing

**Supabase Edge Function**: `/supabase/functions/state-packs/index.ts`

**Flow:**

1. Query all states with approved locations
2. For each state:
   - Query all approved locations (with lat/lon, legal_tag, difficulty, etc.)
   - Get unique legal_tags from locations
   - Query rulesets for those legal_tags
   - Query location_materials relationships
   - Query materials referenced by locations
   - Build vector-only JSON pack
   - Upload to Supabase Storage (`state-packs` bucket)
   - Update/insert `state_packs` table record
3. Return summary of processed states

**Deployment:**

```bash
supabase functions deploy state-packs
```

**Scheduling:**

- **Option 1 (Recommended)**: pg_cron extension

  ```sql
  SELECT cron.schedule(
    'state-packs-nightly',
    '0 2 * * *', -- 2 AM daily
    $$ SELECT net.http_post(
      url := 'https://project.supabase.co/functions/v1/state-packs',
      headers := '{"Authorization": "Bearer service-role-key"}'::jsonb
    ) $$
  );
  ```

- **Option 2**: External cron (GitHub Actions, AWS Lambda, etc.)
  ```yaml
  # .github/workflows/state-packs-nightly.yml
  on:
    schedule:
      - cron: '0 2 * * *' # 2 AM UTC daily
  jobs:
    generate:
      runs-on: ubuntu-latest
      steps:
        - run: |
            curl -X POST https://project.supabase.co/functions/v1/state-packs \
              -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
  ```

### Pages

#### 1. State Packs List: `/state-packs`

- **Server Component**: [state-packs/page.tsx](./page.tsx)
- **Client Component**: [state-packs/StatePackList.tsx](./StatePackList.tsx)
- **Features**:
  - Grid of all available state packs
  - Download buttons with signed URLs
  - Show size and last updated date
  - Links to individual pack detail pages
  - Usage instructions and info cards

#### 2. State Pack Detail: `/state-packs/:state`

- **Server Component**: [state-packs/[state]/page.tsx](./[state]/page.tsx)
- **Client Component**: [state-packs/[state]/StatePackDetail.tsx](./[state]/StatePackDetail.tsx)
- **Features**:
  - State name and metadata
  - Download button
  - What's included / not included sections
  - How to use offline instructions
  - JSON structure preview

### Data Flow

```
Edge Function (scheduled) → Query states with approved locations
                                        ↓
                        For each state → Query locations (approved only)
                                        ↓
                        Query referenced rulesets + materials
                                        ↓
                        Build vector-only JSON pack
                                        ↓
                        Upload to Storage (state-packs/STATE.json)
                                        ↓
                        Update state_packs table
                                        ↓
User → GET /api/state-packs → List packs with signed URLs
                                        ↓
User → Click Download → Download JSON file
                                        ↓
                        Use offline (GPS, mapping apps, etc.)
```

### Database Schema

#### state_packs

```sql
CREATE TABLE state_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_state_packs_state ON state_packs(state);
```

### Storage Bucket

**Bucket**: `state-packs`

- **Path structure**: `{STATE}.json` (e.g., `CA.json`, `TX.json`)
- **Public access**: Yes (via signed URLs)
- **File format**: JSON (application/json)
- **Upsert**: Yes (regenerated nightly)

```sql
-- Storage Policy (public read)
CREATE POLICY "Public can download state packs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'state-packs');
```

## ✅ Testing Checklist

### API Tests ([route.test.ts](../api/state-packs/route.test.ts))

- ✅ Returns empty array when no packs exist (GET list)
- ✅ Returns list with signed URLs (GET list)
- ✅ Returns 500 on database error (GET list)
- ✅ Returns 400 for invalid state code (GET single)
- ✅ Returns 404 when pack not found (GET single)
- ✅ Returns pack with signed URL (GET single)
- ✅ Converts lowercase state code to uppercase (GET single)
- ✅ Returns 500 when signed URL generation fails (GET single)

### Background Job Tests (Manual)

- ✅ Queries all states with approved locations
- ✅ Generates pack for each state
- ✅ Includes only approved locations
- ✅ Includes referenced rulesets (by legal_tag)
- ✅ Includes referenced materials (via location_materials)
- ✅ Excludes private observations
- ✅ Excludes staging data
- ✅ Uploads JSON to storage
- ✅ Updates state_packs table with size/timestamp
- ✅ Returns summary of processed states

### UI Tests (Manual)

- ✅ State packs list shows all available packs
- ✅ Download buttons work with signed URLs
- ✅ Pack detail page shows metadata
- ✅ JSON structure preview displays correctly
- ✅ "What's included" / "Not included" sections accurate
- ✅ Usage instructions clear and helpful

## 🚀 Usage Examples

### Fetching State Packs List (cURL)

```bash
curl http://localhost:3000/api/state-packs
```

### Fetching Single State Pack (cURL)

```bash
curl http://localhost:3000/api/state-packs/CA
```

### Deploying Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy function
cd supabase/functions
supabase functions deploy state-packs

# Set up environment variables
supabase secrets set SUPABASE_URL=https://project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Manually Triggering Pack Generation

```bash
curl -X POST https://project.supabase.co/functions/v1/state-packs \
  -H "Authorization: Bearer service-role-key"
```

## 📊 Build Document Compliance

| Requirement                          | Status | Implementation                                                                                |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| GET /api/state-packs (list)          | ✅     | [route.ts](../api/state-packs/route.ts)                                                       |
| GET /api/state-packs/:state (single) | ✅     | [[state]/route.ts](../api/state-packs/[state]/route.ts)                                       |
| Vector-only content                  | ✅     | Lat/lon only, no geometry                                                                     |
| Approved locations only              | ✅     | `status=approved` filter                                                                      |
| Referenced rulesets                  | ✅     | Query by legal_tag                                                                            |
| Referenced materials                 | ✅     | Query via location_materials                                                                  |
| Signed URLs (1-hour expiry)          | ✅     | `createSignedUrl()`                                                                           |
| Background processing                | ✅     | Edge function                                                                                 |
| State packs list UI                  | ✅     | [page.tsx](./page.tsx) + [StatePackList.tsx](./StatePackList.tsx)                             |
| State pack detail UI                 | ✅     | [[state]/page.tsx](./[state]/page.tsx) + [StatePackDetail.tsx](./[state]/StatePackDetail.tsx) |
| Unit tests                           | ✅     | 10+ tests in [route.test.ts](../api/state-packs/route.test.ts)                                |
| No map tiles                         | ✅     | Vector-only JSON                                                                              |
| No photos                            | ✅     | Not included in pack                                                                          |
| No private observations              | ✅     | Not queried                                                                                   |
| No staging data                      | ✅     | `status=approved` only                                                                        |

## 🔮 Future Enhancements (Out of Scope)

- Regional packs (multi-state or county-level)
- Custom pack builder (user-defined filters)
- Pack versioning (track changes over time)
- Differential updates (download only changes)
- Compression (gzip) for large packs
- Pack expiration warnings
- Mobile app integration (auto-sync)
- Pack statistics dashboard (downloads, size trends)

## 🔗 Related Modules

- **Step 6**: [Map Page](../map/README.md) - Online map with interactive pins
- **Step 7**: [Location Detail](../location/README.md) - Full location information
- **Step 9**: [Observations](../observations/README.md) - Private field notes (excluded from packs)
- **Step 10**: [Exports](../exports/README.md) - Custom export generation (GeoJSON/KML/CSV)

---

**Status**: ✅ Step 11 Complete - All Build Document requirements implemented  
**Final Step**: This completes the MVP build (Steps 1-11)

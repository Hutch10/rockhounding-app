# Export Jobs (GeoJSON/KML/CSV)

**Build Document Step 10**

This module implements background export generation for rockhounding location data. Users can queue export jobs and download completed files in GeoJSON, KML, or CSV formats.

## 🔒 Security Model

### Export Access Control

- **User-owned exports** - Users can only view/download their own exports
- **Signed URLs only** - No raw storage paths exposed (1-hour expiry)
- **Approved locations only** - Exports include only `status=approved` locations
- **No private observations** - Private user observations excluded from all exports
- **Service role processing** - Background jobs use service role key to bypass RLS

## 📋 Build Document Rules

### Export Formats

- **GeoJSON**: Full geometry + properties (for GIS software)
- **KML**: Placemarks with name/description (for Google Earth)
- **CSV**: Tabular data (for spreadsheets)

### Export Scopes

- **single_location_id**: Single location by UUID
- **bbox**: Bounding box (min/max lng/lat)
- **state**: All locations in US state (2-letter code)

### Optional Filters

- `legal_tag` - Filter by legal status (public_land, private_permission_required, fee_required)
- `access_model` - Filter by access type (free_public, fee_dig, museum_shop)
- `difficulty_max` - Max difficulty level (1-5)
- `kid_friendly` - Kid-friendly locations only (boolean)

### Status Workflow

```
PENDING → RUNNING → COMPLETE (or FAILED)
```

## 🏗️ Architecture

### API Endpoints

#### POST /api/exports

Queue a new export job (non-blocking)

**Request:**

```json
{
  "format": "geojson",
  "scope": "state",
  "scope_params": {
    "state": "CA"
  },
  "filters": {
    "difficulty_max": 3,
    "kid_friendly": true
  }
}
```

**Response (201 Created):**

```json
{
  "id": "export-123",
  "status": "PENDING",
  "format": "geojson",
  "scope": "state",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing x-user-id header
- `400 Bad Request` - Invalid format, scope, or filters
- `404 Not Found` - Location not found (single_location_id scope)

#### GET /api/exports/:id

Get export job status and download URL

**Response:**

```json
{
  "id": "export-123",
  "status": "COMPLETE",
  "format": "geojson",
  "scope": "state",
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:05:00Z",
  "download_url": "https://supabase.co/storage/v1/object/sign/exports/...",
  "error_message": null
}
```

**Status Values:**

- `PENDING` - Queued, not yet processed
- `RUNNING` - Currently generating file
- `COMPLETE` - File ready, download_url available
- `FAILED` - Generation failed, error_message set

### Background Processing

**Supabase Edge Function**: `/supabase/functions/process-exports/index.ts`

**Flow:**

1. Poll `exports` table for `status=PENDING` (up to 5 at a time)
2. Mark each as `RUNNING`
3. Query `locations` table based on scope/filters
4. Generate format-specific file (GeoJSON/KML/CSV)
5. Upload to Supabase Storage bucket `exports`
6. Update export record:
   - `status=COMPLETE`
   - `file_path=user-id/export-id.ext`
   - `completed_at=now()`
7. On error: Mark as `FAILED` with `error_message`

**Deployment:**

```bash
supabase functions deploy process-exports
```

**Scheduling:**

- **Option 1 (Recommended)**: pg_cron extension

  ```sql
  SELECT cron.schedule(
    'process-exports-job',
    '* * * * *', -- Every minute
    $$ SELECT net.http_post(
      url := 'https://project.supabase.co/functions/v1/process-exports',
      headers := '{"Authorization": "Bearer service-role-key"}'::jsonb
    ) $$
  );
  ```

- **Option 2**: External cron (GitHub Actions, AWS Lambda, etc.)
  ```yaml
  # .github/workflows/process-exports.yml
  on:
    schedule:
      - cron: '* * * * *' # Every minute
  jobs:
    process:
      runs-on: ubuntu-latest
      steps:
        - run: |
            curl -X POST https://project.supabase.co/functions/v1/process-exports \
              -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
  ```

### Pages

#### 1. Exports List: `/exports`

- **Server Component**: [exports/page.tsx](./page.tsx)
- **Client Component**: [exports/ExportsList.tsx](./ExportsList.tsx)
- **Features**:
  - List all user's export jobs (newest first)
  - Show status badges (PENDING/RUNNING/COMPLETE/FAILED)
  - Download button when COMPLETE (opens signed URL)
  - Refresh button to check status updates
  - Link to create new export

#### 2. New Export Form: `/exports/new`

- **Server Component**: [exports/new/page.tsx](./new/page.tsx)
- **Client Component**: [exports/new/ExportForm.tsx](./new/ExportForm.tsx)
- **Features**:
  - Format selector (GeoJSON/KML/CSV)
  - Scope selector with dynamic inputs
  - Optional filters (legal_tag, access_model, difficulty_max, kid_friendly)
  - Validation (required fields, coordinate ranges, state code length)
  - Redirects to exports list on success

### Data Flow

```
User → Form → POST /api/exports → Validate → Insert exports row (PENDING)
                                                        ↓
                                              Return export_id
                                                        ↓
Edge Function (scheduled) → Poll PENDING exports
                                   ↓
                          Mark RUNNING → Query locations → Generate file
                                                                ↓
                                                Upload to Storage
                                                                ↓
                                              Update status=COMPLETE + file_path
                                                                ↓
User → GET /api/exports/:id → Return status + signed download URL
                                                ↓
                                     Click Download → Open signed URL
```

### Database Schema

#### exports

```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  format TEXT NOT NULL CHECK (format IN ('geojson', 'kml', 'csv')),
  scope TEXT NOT NULL CHECK (scope IN ('single_location_id', 'bbox', 'state')),
  scope_params JSONB NOT NULL,
  filters JSONB,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED')),
  file_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exports"
  ON exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Storage Bucket

**Bucket**: `exports`

- **Path structure**: `{user_id}/{export_id}.{ext}`
- **RLS Policy**: Users can only download their own files
- **Signed URLs**: 1-hour expiry (generated on-demand via GET /api/exports/:id)

```sql
-- Storage Policy
CREATE POLICY "Users can download own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## ✅ Testing Checklist

### API Tests ([route.test.ts](../api/exports/route.test.ts))

- ✅ Returns 401 when user_id header missing
- ✅ Returns 400 when format missing/invalid
- ✅ Returns 400 when scope missing/invalid
- ✅ Returns 400 when scope_params don't match scope
- ✅ Returns 400 when state code not 2 characters
- ✅ Returns 400 when bbox coordinates out of range
- ✅ Returns 400 when difficulty_max out of range (1-5)
- ✅ Returns 201 with export_id for valid requests
- ✅ Returns 404 when export not found (GET)
- ✅ Returns export with status PENDING/RUNNING/COMPLETE/FAILED
- ✅ Returns signed download_url when COMPLETE
- ✅ Returns error_message when FAILED

### Background Job Tests (Manual)

- ✅ Processes PENDING exports and marks RUNNING
- ✅ Generates valid GeoJSON with FeatureCollection
- ✅ Generates valid KML with placemarks
- ✅ Generates valid CSV with headers
- ✅ Applies scope filters correctly (single/bbox/state)
- ✅ Applies optional filters (legal_tag, difficulty_max, etc.)
- ✅ Uploads file to Supabase Storage
- ✅ Marks as COMPLETE with file_path and completed_at
- ✅ Marks as FAILED with error_message on error
- ✅ Excludes private observations
- ✅ Includes only approved locations

### UI Tests (Manual)

- ✅ Exports list shows all user exports
- ✅ Status badges display correctly
- ✅ Download button appears when COMPLETE
- ✅ Refresh button updates status
- ✅ Form validates format/scope/filters
- ✅ Form shows scope-specific inputs
- ✅ Form redirects to exports list on success
- ✅ Error messages display on validation failures

## 🚀 Usage Examples

### Creating an Export (cURL)

**GeoJSON - State Scope:**

```bash
curl -X POST http://localhost:3000/api/exports \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "format": "geojson",
    "scope": "state",
    "scope_params": { "state": "CA" }
  }'
```

**KML - Bounding Box:**

```bash
curl -X POST http://localhost:3000/api/exports \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "format": "kml",
    "scope": "bbox",
    "scope_params": {
      "min_lng": -120,
      "max_lng": -119,
      "min_lat": 37,
      "max_lat": 38
    },
    "filters": {
      "difficulty_max": 3,
      "kid_friendly": true
    }
  }'
```

**CSV - Single Location:**

```bash
curl -X POST http://localhost:3000/api/exports \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "format": "csv",
    "scope": "single_location_id",
    "scope_params": {
      "location_id": "123e4567-e89b-12d3-a456-426614174000"
    }
  }'
```

### Checking Export Status (cURL)

```bash
curl http://localhost:3000/api/exports/export-123 \
  -H "x-user-id: user-123"
```

### Deploying Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy function
cd supabase/functions
supabase functions deploy process-exports

# Set up environment variables
supabase secrets set SUPABASE_URL=https://project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 Build Document Compliance

| Requirement                          | Status | Implementation                                                          |
| ------------------------------------ | ------ | ----------------------------------------------------------------------- |
| POST /api/exports (queue)            | ✅     | [route.ts](../api/exports/route.ts)                                     |
| GET /api/exports/:id (status)        | ✅     | [[id]/route.ts](../api/exports/[id]/route.ts)                           |
| Formats: GeoJSON/KML/CSV             | ✅     | Edge function generators                                                |
| Scopes: location/bbox/state          | ✅     | Zod schema + query logic                                                |
| Filters: legal/access/difficulty/kid | ✅     | Query filters in Edge function                                          |
| Non-blocking queue                   | ✅     | POST returns PENDING immediately                                        |
| Signed URLs only                     | ✅     | `createSignedUrl()` with 1-hour expiry                                  |
| Background processing                | ✅     | Supabase Edge Function                                                  |
| Status workflow                      | ✅     | PENDING → RUNNING → COMPLETE/FAILED                                     |
| Exports list UI                      | ✅     | [page.tsx](./page.tsx) + [ExportsList.tsx](./ExportsList.tsx)           |
| New export form UI                   | ✅     | [new/page.tsx](./new/page.tsx) + [ExportForm.tsx](./new/ExportForm.tsx) |
| Unit tests                           | ✅     | 20+ tests in [route.test.ts](../api/exports/route.test.ts)              |
| No private observations              | ✅     | Export query filters by `status=approved` only                          |

## 🔮 Future Enhancements (Out of Scope)

- Email notifications when export completes
- Webhook callbacks for export completion
- Export history pruning (auto-delete after 7 days)
- Export templates (save filter combinations)
- Bulk exports (multiple states at once)
- Shapefile format support
- GPX format for GPS devices
- Export statistics (file size, record count)
- Rate limiting (max exports per user per day)

## 🔗 Related Modules

- **Step 6**: [Map Page](../map/README.md) - Shows locations on map
- **Step 7**: [Location Detail](../location/README.md) - Full location info
- **Step 9**: [Observations](../observations/README.md) - Private field notes (excluded from exports)
- **Step 11** (Next): Offline state packs (vector tiles)

---

**Status**: ✅ Step 10 Complete - All Build Document requirements implemented

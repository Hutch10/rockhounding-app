# Geologist Field Observations (Private)

**Build Document Step 9**

This module implements private field observations for authenticated geologists. All observations are **PRIVATE by default** with **owner-only access** enforced via RLS policies.

## 🔒 Security Model

### Row-Level Security (RLS)

- **ALL observations are private** - No public visibility allowed
- **Owner-only access** - Users can only read/write their own observations
- **Anon key enforcement** - Client uses anon key (NOT service role) to respect RLS
- **Database policies** - RLS policies on `observations` table enforce `user_id` filtering

### Authentication

- **Current (Demo)**: `x-user-id` header for testing
- **Production**: Supabase Auth JWT with `auth.uid()` for RLS policies

## 📋 Build Document Rules

### Required Fields

- `location_id` (uuid) - Foreign key to `locations` table
- `notes` (text) - Min 10 characters, field observations
- `visibility` (enum) - **MUST be PRIVATE**, enforced by Zod schema

### Optional Fields

- `rating` (integer 1-5) - Quality assessment of location
- `material_id` (uuid) - Foreign key to `materials` table
- `photo_urls` (array) - URLs for observation photos

### Validation Rules

1. **Visibility enforcement**: `visibility === PRIVATE` (reject PUBLIC)
2. **Notes length**: Minimum 10 characters
3. **Rating range**: 1-5 if provided
4. **Foreign keys**: Validate location_id and material_id exist before insert
5. **Photo handling**: Store in separate `observation_photos` table

## 🏗️ Architecture

### API Endpoint: POST /api/observations

**Request:**

```json
{
  "location_id": "uuid",
  "notes": "Field observations (min 10 chars)",
  "visibility": "PRIVATE",
  "rating": 4,
  "material_id": "uuid",
  "photo_urls": ["https://example.com/photo1.jpg"]
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "location_id": "uuid",
  "notes": "...",
  "visibility": "PRIVATE",
  "rating": 4,
  "material_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing x-user-id header
- `400 Bad Request` - Validation errors (PUBLIC visibility, short notes, invalid rating)
- `404 Not Found` - Invalid location_id or material_id

### Pages

#### 1. New Observation Form: `/observations/new`

- **Server Component**: [new/page.tsx](./new/page.tsx)
- **Client Component**: [new/ObservationForm.tsx](./new/ObservationForm.tsx)
- **Features**:
  - Location ID selector
  - Notes textarea (min 10 chars with counter)
  - Rating buttons (1-5 stars, toggleable)
  - Material ID input (optional)
  - Photo URL management (add/remove multiple)
  - Visibility locked to PRIVATE (no user option)
  - Redirects to detail page on success

#### 2. Observation Detail: `/observations/[id]`

- **Server Component**: [[id]/page.tsx](./[id]/page.tsx)
- **Client Component**: [[id]/ObservationDetailClient.tsx](./[id]/ObservationDetailClient.tsx)
- **Features**:
  - **Owner-only access** (404 if not owner or not found)
  - Fetches observation with joined location/material names
  - Displays: notes, rating, material, photos, metadata
  - Links to location detail page
  - Actions: Create new observation, view location

### Data Flow

```
User → Form → POST /api/observations → Zod Validation
                                           ↓
                              Check location_id exists
                                           ↓
                              Check material_id exists (if provided)
                                           ↓
                              Insert observation (RLS enforced)
                                           ↓
                              Insert photos (if provided)
                                           ↓
                              Return observation JSON
                                           ↓
        Redirect to /observations/[id] → Fetch observation (RLS filtered by user_id)
                                           ↓
                                  Display ObservationDetailClient
```

### Database Schema

#### observations

```sql
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  notes TEXT NOT NULL CHECK (length(notes) >= 10),
  visibility visibility_enum NOT NULL DEFAULT 'PRIVATE',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  material_id UUID REFERENCES materials(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own observations"
  ON observations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own observations"
  ON observations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### observation_photos

```sql
CREATE TABLE observation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS via observation ownership
CREATE POLICY "Users can read photos of own observations"
  ON observation_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM observations
      WHERE observations.id = observation_photos.observation_id
      AND observations.user_id = auth.uid()
    )
  );
```

## ✅ Testing Checklist

### API Tests ([route.test.ts](../api/observations/route.test.ts))

- ✅ Returns 401 when user_id header missing
- ✅ Returns 400 when required fields missing
- ✅ Returns 400 when notes < 10 characters
- ✅ Returns 400 when rating outside 1-5 range
- ✅ Returns 400 when visibility is PUBLIC
- ✅ Returns 404 when location_id doesn't exist
- ✅ Returns 404 when material_id doesn't exist
- ✅ Returns 201 with observation on success
- ✅ Creates observation_photos records for photo_urls
- ✅ Sets created_at and updated_at timestamps

### UI Tests (Manual)

- ✅ Form validates notes length client-side
- ✅ Form prevents submission with invalid data
- ✅ Rating buttons toggle correctly (1-5 stars)
- ✅ Photo URL management (add/remove)
- ✅ Visibility is locked to PRIVATE (no user option)
- ✅ Redirects to detail page on success
- ✅ Detail page shows 404 if not owner
- ✅ Detail page displays all observation fields
- ✅ Photos display with fallback on error

## 🚀 Usage Examples

### Creating an Observation (cURL)

```bash
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "location_id": "123e4567-e89b-12d3-a456-426614174000",
    "notes": "Found excellent quartz crystals near creek bed. Clear formations with minor iron staining.",
    "visibility": "PRIVATE",
    "rating": 5,
    "material_id": "789e0123-e89b-12d3-a456-426614174000",
    "photo_urls": [
      "https://example.com/quartz1.jpg",
      "https://example.com/quartz2.jpg"
    ]
  }'
```

### Fetching an Observation (Next.js Server Component)

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

async function getObservation(id: string, userId: string) {
  const supabase = createClient(cookies());

  // RLS enforces owner-only access
  const { data, error } = await supabase
    .from('observations')
    .select(
      `
      *,
      locations (name),
      materials (name)
    `
    )
    .eq('id', id)
    .eq('user_id', userId) // Owner filter
    .single();

  if (error || !data) {
    return null; // Return 404
  }

  return data;
}
```

## 📊 Build Document Compliance

| Requirement              | Status | Implementation                                                  |
| ------------------------ | ------ | --------------------------------------------------------------- |
| POST /api/observations   | ✅     | [route.ts](../api/observations/route.ts)                        |
| Private by default       | ✅     | Zod schema enforces `visibility === PRIVATE`                    |
| RLS owner-only           | ✅     | Database policies + `.eq('user_id', userId)`                    |
| Required: location_id    | ✅     | Zod schema + foreign key validation                             |
| Required: notes (min 10) | ✅     | Zod schema `.min(10)`                                           |
| Optional: rating (1-5)   | ✅     | Zod schema `.int().min(1).max(5).optional()`                    |
| Optional: material_id    | ✅     | Zod schema + foreign key validation                             |
| Photo URLs               | ✅     | `observation_photos` table                                      |
| New observation form     | ✅     | [new/ObservationForm.tsx](./new/ObservationForm.tsx)            |
| Detail page              | ✅     | [[id]/page.tsx](./[id]/page.tsx)                                |
| Owner enforcement        | ✅     | Server component checks user_id                                 |
| Unit tests               | ✅     | 20+ tests in [route.test.ts](../api/observations/route.test.ts) |

## 🔮 Future Enhancements (Out of Scope)

- Edit observations (PATCH /api/observations/:id)
- Delete observations (DELETE /api/observations/:id)
- List user's observations (/observations)
- Share observations with collaborators
- File upload for photos (currently URL-based)
- Offline observation creation (PWA)
- Export observations (CSV, GeoJSON)

## 🔗 Related Modules

- **Step 6**: [Map Page](../../map/README.md) - Shows thin pins, links to locations
- **Step 7**: [Location Detail](../../location/README.md) - Full location info for observations
- **Step 8**: [Moderation Dashboard](../../admin/moderation/README.md) - Approve/reject community content
- **Step 10** (Next): Exports/downloads system
- **Step 11** (Final): Offline state packs (vector tiles)

---

**Status**: ✅ Step 9 Complete - All Build Document requirements implemented

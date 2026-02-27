# Moderation Dashboard - Admin UI

This directory implements the moderation workflow for user-submitted locations following Build Document rules.

## Architecture

### Server Components

- **`page.tsx`**: Server component that validates admin access and fetches PENDING staging records
  - Checks admin role (redirects non-admins)
  - Queries `locations_staging` table for PENDING records
  - Uses Supabase service role key to bypass RLS

### Client Components

- **`ModerationClient.tsx`**: Main client component with state management
  - Handles approve/reject actions
  - Manages loading and message states
  - Refreshes data after moderation
- **`components/StagingList.tsx`**: Table display of pending submissions
  - Shows name, legal_tag, source_tier, submitted_by, submitted_at
  - Click to select record for detail view
  - Highlights selected row

- **`components/StagingDetail.tsx`**: Detail panel with moderation actions
  - Displays all staging record fields
  - Approve button (promotes to locations)
  - Reject button (requires reason, min 10 chars)
  - Provenance and submission info

## Build Document Compliance

### ✅ Rule: User Submissions Never Publish Directly

- All new submissions go to `locations_staging` table
- NEVER directly insert into public `locations` table
- Requires admin approval before becoming public

### ✅ Rule: Moderation Contract (LOCKED)

**Admins Can:**

- View ALL PENDING staging records (not just their own)
- APPROVE: Promote record to public `locations` table
- REJECT: Mark record as REJECTED with reason

**Non-Admins:**

- Cannot access `/admin/moderation` route (redirected to home)
- Can only see their own submissions (not implemented in this step)
- Cannot approve or reject anything

### ✅ Rule: Provenance & Audit Trail

Every moderation action tracks:

- `moderated_by`: User ID of admin who performed action
- `moderated_at`: Timestamp of moderation (ISO 8601)
- `rejection_reason`: Required for REJECT action (min 10 characters)
- `moderation_status`: Updated to APPROVED or REJECTED

### ✅ Rule: Role-Based Access Control

- Admin-only route: `/admin/moderation`
- API validates admin role via `x-admin-key` header
- Returns 403 for non-admin attempts
- Uses Supabase service role key for admin operations

## Data Flow

```
User submits location
  ↓
INSERT INTO locations_staging (moderation_status = PENDING)
  ↓
Admin visits /admin/moderation
  ↓
Server component fetches PENDING records
  ↓
Admin selects record → Detail panel shows
  ↓
Admin clicks "Approve" or "Reject"
  ↓
POST /api/admin/moderate
  ↓
API validates admin role
  ↓
[APPROVE]
  - INSERT INTO locations (promoted fields)
  - UPDATE locations_staging SET moderation_status = APPROVED
  ↓
[REJECT]
  - UPDATE locations_staging SET moderation_status = REJECTED, rejection_reason = ...
  ↓
Response returned to client
  ↓
UI refreshes, record removed from list
```

## API Contract

### POST /api/admin/moderate

**Request:**

```typescript
{
  id: number;           // Staging record ID
  action: 'APPROVE' | 'REJECT';
  reason?: string;      // Required if action is REJECT (min 10 chars)
}
```

**Headers:**

```
Content-Type: application/json
x-admin-key: <ADMIN_API_KEY>
x-user-id: <optional, defaults to 'admin'>
```

**Response (Success):**

```typescript
{
  success: true;
  message: string;
  staging_id: number;
  moderation_status: 'APPROVED' | 'REJECTED';
  location_id?: number; // If approved, the new public location ID
}
```

**Response (Error):**

```typescript
{
  error: string;
  details?: string;
}
```

**Status Codes:**

- 200: Success
- 400: Invalid request (bad ID, missing reason, already moderated)
- 403: Forbidden (non-admin)
- 404: Staging record not found
- 500: Server error

## UI Components

### Staging List Table

- **Columns**: Name, Legal Status, Source Tier, Submitted By, Submitted At
- **Sorting**: By submitted_at DESC (newest first)
- **Selection**: Click row to view details
- **Visual**: Highlighted row when selected
- **Empty State**: Shows "No Pending Submissions" message

### Staging Detail Panel

- **Header**: "Location Details" with review prompt
- **Content**: All staging record fields organized by sections:
  - Name & Description
  - Legal Information (legal_tag, legal_confidence)
  - Access Information (access_model, difficulty)
  - Additional Flags (status, kid_friendly)
  - Provenance (source_tier, verification_date, primary_ruleset_id)
  - Submission Info (submitted_by, submitted_at, staging ID)

- **Actions**:
  - **Approve Button**: Green, "✓ Approve & Publish"
    - Confirms with dialog
    - Promotes to public locations
  - **Reject Button**: Red, "✗ Reject"
    - Opens rejection form
    - Requires reason (min 10 chars)
    - Confirms with dialog

### Status Messages

- **Success**: Green banner at top
  - "Location approved successfully! (ID: 123)"
  - "Location rejected successfully"
- **Error**: Red banner at top
  - Shows error message from API

## Security

### Admin Authentication

- Uses `x-admin-key` header for temporary auth
- **Production**: Replace with Supabase Auth session check
- Check user metadata for `is_admin` flag
- Or query `admin_users` table

### Environment Variables

```env
ADMIN_API_KEY=<secret-key>          # Required for admin endpoints
SUPABASE_SERVICE_ROLE_KEY=<key>    # Required to bypass RLS
NEXT_PUBLIC_ADMIN_KEY=<key>        # Client-side (for demo only, use session in prod)
```

**IMPORTANT**: `NEXT_PUBLIC_ADMIN_KEY` exposes the admin key to clients. In production:

1. Use Supabase Auth sessions
2. Check user metadata or admin_users table
3. Never expose admin keys to client

### Supabase RLS

- Server component uses service role key to bypass RLS
- Admin endpoints validate role before any operations
- Regular users cannot access staging records (enforced by RLS)

## File Structure

```
/apps/web/app/admin/moderation/
├── page.tsx                      # Server component (admin check + fetch)
├── ModerationClient.tsx          # Client component (state + actions)
├── components/
│   ├── StagingList.tsx          # Table display
│   └── StagingDetail.tsx        # Detail panel with actions
└── README.md                     # This file
```

## Testing

### Manual Testing Checklist

- [ ] Set `ADMIN_API_KEY` and `NEXT_PUBLIC_ADMIN_KEY` env vars
- [ ] Visit `/admin/moderation` (should load dashboard)
- [ ] See list of PENDING staging records
- [ ] Click record to view details
- [ ] Click "Approve & Publish" → Confirms → Record promoted
- [ ] Click "Reject" → Enter reason → Confirm → Record rejected
- [ ] Check `locations` table for approved record
- [ ] Check `locations_staging` for updated `moderation_status`
- [ ] Verify `moderated_by` and `moderated_at` fields populated
- [ ] Test without admin key → Should redirect or show 403

### Unit Tests

See `/apps/web/app/api/admin/moderate/route.test.ts` for API tests (25+ tests)

### Future E2E Tests

- Full moderation workflow (submit → approve → verify in public)
- Non-admin access attempt
- Concurrent moderation attempts
- Rejection reason validation

## Known Limitations

### Current Implementation

- Uses `x-admin-key` header for auth (temporary)
- Client-side refresh reloads entire page
- No pagination (assumes < 100 pending records)
- No filtering or search
- No bulk actions

### Production Requirements

1. **Auth**: Replace with Supabase Auth session check
2. **Pagination**: Add server-side pagination for large queues
3. **Search/Filter**: Add search by name, legal_tag, submitted_by
4. **Bulk Actions**: Select multiple records, approve/reject in batch
5. **History**: Show moderation history (approved/rejected records)
6. **Notifications**: Email admin when new submission arrives
7. **Undo**: Allow un-rejecting or removing approved locations

## Related Tables

### locations_staging

- `id` (PK)
- All fields from `locations` table (name, description, geom, etc.)
- `submitted_by` (user ID)
- `submitted_at` (timestamp)
- `moderation_status` (PENDING | APPROVED | REJECTED)
- `moderated_by` (admin user ID)
- `moderated_at` (timestamp)
- `rejection_reason` (text, nullable)

### locations (public)

- Receives approved records from staging
- No moderation-specific fields
- Standard location data only

## Next Steps (Step 9)

Step 9 will add **User Observations**:

- Logged-in users can add field observations
- Photos, notes, collection samples
- Links to locations
- RLS: Owner-only visibility
- NOT public until verified

## Related Documentation

- **API Documentation**: `/apps/web/app/api/admin/moderate/README.md` (if needed)
- **Build Document**: Root-level BUILD.md (moderation contract)
- **Database Schema**: `/supabase/migrations/20260121000003_add_locations_staging.sql`

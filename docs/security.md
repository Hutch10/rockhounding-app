# Security Model

This document describes the security architecture of the Rockhounding MVP, including Row-Level Security (RLS) policies, admin capabilities, and data exposure guarantees.

## Overview

The application uses a **defense-in-depth** security model with multiple layers:

1. **Row-Level Security (RLS)** - Database-level access control
2. **API Route Guards** - Application-level authorization checks
3. **Service Role vs Anon Key** - Separate credentials for admin and user operations
4. **Signed URLs** - Time-limited access to storage resources
5. **Type Safety** - TypeScript prevents many common security issues

## Row-Level Security (RLS) Policies

RLS policies are enforced at the database level, ensuring security even if application code has bugs.

### Observations Table

**Policy**: Owner-only access (PRIVATE visibility enforced)

```sql
-- Users can only read their own observations
CREATE POLICY "Users can read own observations"
  ON observations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert observations for themselves
CREATE POLICY "Users can insert own observations"
  ON observations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own observations
CREATE POLICY "Users can update own observations"
  ON observations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own observations
CREATE POLICY "Users can delete own observations"
  ON observations FOR DELETE
  USING (auth.uid() = user_id);
```

**Guarantees**:

- ✅ Users can NEVER see other users' observations
- ✅ Observations are ALWAYS private (visibility column locked to PRIVATE)
- ✅ No API bypass possible (enforced at database level)

### Locations Table

**Policy**: Public read for approved, admin-only for staging

```sql
-- Anyone can read approved locations
CREATE POLICY "Public can read approved locations"
  ON locations FOR SELECT
  USING (status = 'approved');

-- Only authenticated users with admin role can read all locations
CREATE POLICY "Admins can read all locations"
  ON locations FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
  );

-- Only admins can insert, update, or delete locations
CREATE POLICY "Admins can manage locations"
  ON locations FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
  );
```

**Guarantees**:

- ✅ Staging locations NEVER exposed to public API
- ✅ Only admins can create/update/delete locations
- ✅ Public users can only see approved locations

### Exports Table

**Policy**: User-owned exports

```sql
-- Users can only read their own exports
CREATE POLICY "Users can read own exports"
  ON exports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert exports for themselves
CREATE POLICY "Users can insert own exports"
  ON exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Guarantees**:

- ✅ Users can NEVER see other users' export jobs
- ✅ Export processing uses service role (bypasses RLS)
- ✅ Download URLs are signed and time-limited (1 hour)

### State Packs Table

**Policy**: Public read (no user_id)

```sql
-- Anyone can read state packs
CREATE POLICY "Public can read state packs"
  ON state_packs FOR SELECT
  TO public
  USING (true);

-- Only service role can update state packs (via Edge Functions)
```

**Guarantees**:

- ✅ State packs are public data (approved locations only)
- ✅ No private observations in packs
- ✅ Download URLs are signed and time-limited (1 hour)

## API Route Security

### Admin-Only Routes

Routes in `/api/admin/*` require admin authorization:

```typescript
// Example: /api/admin/moderation/route.ts
function isAdmin(request: NextRequest): boolean {
  // Temporary: check x-admin-role header
  // Production: check Supabase Auth JWT claims
  const adminRole = request.headers.get('x-admin-role');
  return adminRole === 'admin';
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // ... admin logic
}
```

**Production Authentication**:

```typescript
// Replace temporary header check with Supabase Auth
import { createClient } from '@/lib/supabase/server';

async function isAdmin(request: NextRequest): Promise<boolean> {
  const supabase = createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check user metadata or database role table
  return user.user_metadata?.role === 'admin';
}
```

### User-Scoped Routes

Routes like `/api/observations` enforce user ownership:

```typescript
// Example: /api/observations/route.ts
function getCurrentUserId(request: NextRequest): string | null {
  // Temporary: x-user-id header
  // Production: extract from Supabase Auth JWT
  return request.headers.get('x-user-id');
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create observation with user_id
  // RLS ensures user can only create for themselves
}
```

## Service Role vs Anon Key

### Anon Key (Public)

**Used for**: Client-side operations, user-scoped queries

**Capabilities**:

- Read approved locations
- Create/read own observations
- Create/read own exports
- Read public state packs

**Restrictions (enforced by RLS)**:

- Cannot read staging locations
- Cannot read other users' observations
- Cannot read other users' exports
- Cannot bypass RLS policies

### Service Role Key (Admin)

**Used for**: Server-side operations, background jobs

**Capabilities**:

- Bypass RLS policies (full database access)
- Read/write all tables
- Generate exports for all users
- Update state packs

**Storage**:

- ⚠️ **NEVER exposed to client**
- Stored in server-only environment variables
- Used only in API routes and Edge Functions

**Example Usage**:

```typescript
// Background job: generate export (bypasses RLS)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key
);

// Can read all locations (including staging)
const { data: locations } = await supabase.from('locations').select('*'); // No RLS filtering
```

## Data Exposure Guarantees

### What NEVER Leaves the Backend

1. **Service Role Key** - Server-only, never in client bundle
2. **Private Observations** - Never included in:
   - Exports (any format)
   - State packs
   - Public APIs
   - Location detail responses
3. **Staging Locations** - Never exposed via:
   - Public thin pins API
   - Full detail API
   - Exports
   - State packs
4. **Other Users' Data** - Users can never access:
   - Other users' observations
   - Other users' export jobs
   - Other users' personal information

### What IS Exposed Publicly

1. **Approved Locations** - Full details available to all users
2. **Rulesets** - Legal information for locations
3. **Materials** - Types of rocks/minerals available
4. **State Packs** - Vector-only JSON with approved locations

### Signed URLs

Storage resources use **signed URLs** with time-limited access:

```typescript
// Generate signed URL (1-hour expiry)
const { data } = await supabase.storage.from('exports').createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

// URL format:
// https://project.supabase.co/storage/v1/object/sign/exports/file.json?token=...
```

**Guarantees**:

- ✅ URLs expire after 1 hour
- ✅ No raw storage paths exposed
- ✅ Cannot guess URLs (cryptographically signed)
- ✅ Revocable by rotating signing key

## Admin Capabilities

### Admin Users Can:

1. **Moderate Locations**:
   - View staging locations (`status=staging`)
   - Approve or reject submissions
   - Edit location details
   - Delete locations

2. **Manage Content**:
   - Edit rulesets
   - Edit materials
   - Bulk import data

3. **View System Metrics**:
   - Total locations (approved + staging)
   - User activity
   - Export job statistics
   - State pack generation status

### Admin Users CANNOT:

1. **Access Private Data**:
   - ❌ View other users' private observations
   - ❌ Modify other users' observations
   - ❌ Access other users' export jobs

2. **Bypass Core Security**:
   - ❌ Disable RLS policies (database-level enforcement)
   - ❌ Generate signed URLs for arbitrary resources
   - ❌ Expose service role key to client

## Authentication Flow (Current vs Production)

### Current (MVP Demo)

```
User → Request with x-user-id header → API Route
       ↓
       Temporary user ID (for testing)
       ↓
       Database query with RLS (using anon key)
```

**Limitations**:

- No real authentication
- User ID is trusted (passed in header)
- Suitable for MVP demo only

### Production (Supabase Auth)

```
User → Sign in with Supabase Auth → JWT token
       ↓
       Request with Authorization: Bearer <jwt>
       ↓
       API Route extracts user ID from JWT
       ↓
       Database query with RLS (JWT verified by Supabase)
```

**Benefits**:

- Real authentication
- JWT is cryptographically verified
- User ID cannot be spoofed
- Built-in session management

**Migration Path**:

```typescript
// Replace getCurrentUserId() helper
// FROM:
function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

// TO:
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}
```

## Security Testing

### Required Test Coverage

1. **Admin Endpoint Protection**:
   - [ ] Non-admin users get 403 Forbidden
   - [ ] Admin users can access admin routes
   - [ ] Missing credentials get 401 Unauthorized

2. **Cross-User Access Prevention**:
   - [ ] User A cannot read User B's observations
   - [ ] User A cannot update User B's observations
   - [ ] User A cannot read User B's export jobs

3. **Staging Data Isolation**:
   - [ ] Public API never returns staging locations
   - [ ] Thin pins API excludes staging
   - [ ] Full detail API returns 404 for staging

4. **Export Security**:
   - [ ] Exports never include private observations
   - [ ] Signed URLs expire after 1 hour
   - [ ] Cannot access export without valid signed URL

5. **State Pack Security**:
   - [ ] State packs never include private observations
   - [ ] State packs never include staging locations
   - [ ] Signed URLs expire after 1 hour

### Security Test Examples

See `/apps/web/app/api/admin/security.test.ts` and `/apps/web/app/api/observations/security.test.ts` for implementation.

## Incident Response

### If Service Role Key is Compromised:

1. **Immediately**:
   - Rotate service role key in Supabase dashboard
   - Update environment variables in hosting platform
   - Redeploy application

2. **Investigate**:
   - Check Supabase logs for unauthorized access
   - Review database audit logs
   - Identify scope of breach

3. **Notify**:
   - Inform affected users if personal data was accessed
   - Update security documentation

### If RLS Policy is Bypassed:

1. **Immediately**:
   - Disable affected endpoint
   - Fix RLS policy or application code
   - Deploy hotfix

2. **Audit**:
   - Review all RLS policies
   - Add regression tests
   - Document root cause

## Security Checklist

Before deploying to production:

- [ ] All tables have RLS enabled
- [ ] RLS policies tested (see test files)
- [ ] Service role key stored securely (server-only)
- [ ] No sensitive data in client bundle (verify build output)
- [ ] Signed URLs configured with 1-hour expiry
- [ ] Admin routes require authentication
- [ ] User-scoped routes enforce ownership
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled (Vercel/Supabase default)
- [ ] HTTPS enforced (automatic on Vercel/Supabase)
- [ ] Environment variables validated at startup
- [ ] Error messages don't leak internal details
- [ ] Security documentation reviewed and up-to-date

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: January 21, 2026  
**Next Review**: After production deployment

# Cloudflare Deployment Readiness Report

**Date:** February 25, 2026  
**Target:** Cloudflare Workers + Pages deployment  
**Status:** ⚠️ PARTIALLY READY - Required changes identified

---

## Executive Summary

The Rockhounding web application has been successfully refactored to use a backend SDK client model (Patch 4) and cleaned of unused code (Patch 5). The project is **architecturally ready** for Cloudflare deployment, but **requires additional configuration** to enable production deployment.

**Overall Readiness: 65%**

- ✅ API client supports Workers endpoints
- ✅ Environment variables partially configured
- ✅ No breaking architectural changes needed
- ❌ Missing wrangler.toml configuration
- ❌ .env.example incomplete
- ❌ Security issue: Admin key exposed in client
- ⚠️ Base URL resolution needs refinement

---

## 1. Environment Variable Analysis

### Current State

**Configured variables:**

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase endpoint
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase auth
- ✅ `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox API token
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key
- ✅ `ADMIN_API_KEY` - Admin validation (server-side)
- ⚠️ `NEXT_PUBLIC_ADMIN_KEY` - Client-side admin key (SECURITY ISSUE)
- ⚠️ `NEXT_PUBLIC_API_URL` - Conditionally used
- ⚠️ `NEXT_PUBLIC_SITE_URL` - Optional, defaults to localhost:3000

**Missing variables:**

- ❌ `CLOUDFLARE_API_TOKEN` - For wrangler deployment
- ❌ `CLOUDFLARE_ACCOUNT_ID` - For Durable Objects
- ❌ `CLOUDFLARE_PROJECT_NAME` - Workers project identifier
- ❌ `CLOUDFLARE_KV_NAMESPACE_ID` - For edge caching (if needed)

### Environment Variable File (.env.example)

**Current:**

```dotenv
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Mapbox Configuration (for Step 6)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token-here
```

**Issues:**

- Missing `NEXT_PUBLIC_API_URL` configuration
- Missing `NEXT_PUBLIC_SITE_URL` example
- Missing Cloudflare-specific variables
- No distinction between deployment environments (dev/staging/prod)
- Admin key configuration unclear

---

## 2. API Client Configuration Analysis

### Base URL Resolution Logic

**File:** `apps/web/lib/api/client.ts:45-60`

```typescript
function resolveBaseUrl(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub != null && pub.trim().length > 0) return pub.trim();

  if (process.env.NODE_ENV === 'development') return DEFAULT_LOCAL_URL;
  return DEFAULT_PROD_URL;
}

const DEFAULT_LOCAL_URL = 'http://localhost:8787';
const DEFAULT_PROD_URL = 'https://api.rockhound.app'; // ❌ Hardcoded
```

**Issues:**

- ❌ Production URL is hardcoded (`https://api.rockhound.app`)
- ⚠️ No support for staging environments
- ⚠️ No validation of URL format (just checks NEXT_PUBLIC_API_URL)

### Supported Endpoints (Already Implemented)

✅ Standard REST endpoints: `/exports`, `/observations`, `/locations`, `/state-packs`, `/moderation/*`  
✅ Durable Objects endpoints: `/do/ExportCoordinatorDO/*`, `/do/StatePackRegistryDO/*`  
✅ Queue endpoints: `/queues/exports-queue`

**Status:** Client is already prepared for Cloudflare backend integration

---

## 3. Wrangler Configuration

### Current State

- ❌ **No wrangler.toml file exists**
- ❌ No Cloudflare Workers configured
- ❌ No build pipeline for workers
- ❌ No secrets management setup

### Required Configuration

**Missing wrangler.toml structure:**

```toml
#wrangler.toml
name = "rockhound-api"
type = "service"
account_id = "${CLOUDFLARE_ACCOUNT_ID}"
main = "src/index.ts"
compatibility_date = "2025-12-01"

# Environment-specific configuration
[env.development]
routes = [{ pattern = "api.localhost:8787/*", zone_name = "localhost" }]

[env.staging]
routes = [{ pattern = "staging-api.rockhound.app/*", zone_name = "rockhound.app" }]
vars = { ENVIRONMENT = "staging", SUPABASE_URL = "..." }

[env.production]
routes = [{ pattern = "api.rockhound.app/*", zone_name = "rockhound.app" }]
vars = { ENVIRONMENT = "production", SUPABASE_URL = "..." }

# Durable Objects bindings (when implemented)
[[durable_objects.bindings]]
name = "EXPORT_COORDINATOR"
class_name = "ExportCoordinatorDO"

[[durable_objects.bindings]]
name = "STATE_PACK_REGISTRY"
class_name = "StatePackRegistryDO"

# KV Namespace bindings (for caching)
[[kv_namespaces]]
binding = "CACHE_KV"
id = "${CLOUDFLARE_KV_NAMESPACE_ID}"
```

---

## 4. Integration Points Between Next.js and Cloudflare

### Frontend (Next.js on Cloudflare Pages)

**Current Status:** ✅ READY

- Next.js 14.1.0 with ESR support
- next-pwa for offline capability
- Mapbox GL for map rendering
- API client with retry logic

**Required Changes:** None - Cloudflare Pages supports standard Next.js deployments

### Backend (Cloudflare Workers)

**Current Status:** ⚠️ PARTIALLY READY

**Currently Missing:**

1. ❌ Worker entry point (`src/index.ts` or similar)
2. ❌ Durable Objects implementation (referenced in API client but not created)
3. ❌ Queue handler for async export jobs
4. ❌ Environment variable binding configuration
5. ⚠️ Supabase client initialization in Workers context

**What exists in client:**

- ✅ API client methods for all endpoints
- ✅ Durable Objects method signatures
- ✅ Queue enqueue method

### Authentication Flow

**Current:** Supabase JWT + admin key

- Client JWT stored in Supabase cookies
- Admin API key for moderation endpoints

**For Cloudflare:**

- ✅ Supabase auth helpers already preserved in `lib/supabase/`
- ✅ Works with Workers via environment variables
- ⚠️ Admin key needs to move server-side only

### Storage & Caching

**Current:** Supabase Storage + local KV (IndexedDB)
**For Cloudflare:**

- Can leverage Cloudflare R2 for object storage
- Can use Cloudflare KV for edge caching
- Current implementation doesn't require changes

---

## 5. Identified Issues & Security Concerns

### 🔴 Critical (Must Fix)

1. **Admin Key Exposed in Client**
   - File: `apps/web/app/admin/moderation/ModerationClient.tsx:65`
   - Variable: `NEXT_PUBLIC_ADMIN_KEY`
   - Issue: Public API keys should never be client-facing
   - Solution: Move to server-side headers only via API routes

2. **Hardcoded Production API URL**
   - File: `apps/web/lib/api/client.ts:20`
   - Value: `https://api.rockhound.app`
   - Issue: No support for custom domains or staging
   - Solution: Use environment variable with fallback

### 🟡 High Priority (Should Fix Before Deployment)

3. **Missing Environment Variable Validation for Cloudflare**
   - File: `apps/web/lib/env.ts`
   - Issue: No validation for `NEXT_PUBLIC_API_URL` format
   - Solution: Add URL format validation

4. **Missing Deployment Documentation**
   - No Cloudflare-specific deployment guide
   - No worker configuration examples
   - No environment setup instructions

### 🟠 Medium Priority (Nice to Have)

5. **No Staging Environment Support**
   - Current: dev (localhost) → prod (api.rockhound.app)
   - Missing: Staging environment with distinct URL
   - Solution: Use environment-specific .env files

6. **API Error Handling Not Cloudflare-Optimized**
   - Current: Generic ApiClientError
   - Could leverage Cloudflare error pages
   - Solution: Add Cloudflare-specific error handling

---

## 6. Required Changes Summary

### Phase 1: Security & Environment (CRITICAL)

**Time Estimate:** 2-3 hours

#### 6.1 Fix Admin Key Exposure

**File:** `apps/web/app/admin/moderation/ModerationClient.tsx`

**Current (INSECURE):**

```tsx
headers: {
  'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '',
}
```

**Required Change:**
Remove `NEXT_PUBLIC_ADMIN_KEY` from client. Instead, add server-side validation in the moderation API route that checks admin status via Supabase auth metadata or a dedicated admin table.

#### 6.2 Update .env.example

**File:** `apps/web/.env.example`

**Add:**

```dotenv
# Cloudflare Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787

# Additional Configuration (Optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_KEY=  # DEPRECATED: Remove after server-side validation

# Deployment-specific (for CI/CD)
# NEXT_PUBLIC_API_URL=https://api.rockhound.app  # Production
# NEXT_PUBLIC_API_URL=https://staging-api.rockhound.app  # Staging
```

#### 6.3 Fix Base URL Resolution

**File:** `apps/web/lib/api/client.ts`

**Required Change:**

```typescript
const DEFAULT_LOCAL_URL = 'http://localhost:8787';
const DEFAULT_STAGING_URL = 'https://staging-api.rockhound.app';
const DEFAULT_PROD_URL = 'https://api.rockhound.app';

function resolveBaseUrl(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub != null && pub.trim().length > 0) {
    // Validate URL format
    try {
      new URL(pub);
      return pub.trim();
    } catch {
      throw new Error(`Invalid NEXT_PUBLIC_API_URL: ${pub}`);
    }
  }

  if (process.env.NODE_ENV === 'development') return DEFAULT_LOCAL_URL;

  // Check for staging indicator
  if (process.env.VERCEL_ENV === 'preview') return DEFAULT_STAGING_URL;

  return DEFAULT_PROD_URL;
}
```

### Phase 2: Wrangler Configuration (HIGH PRIORITY)

**Time Estimate:** 1-2 hours

#### 6.4 Create wrangler.toml

**File:** `wrangler.toml` (root of project or backend package)

See template in Section 3 above.

#### 6.5 Create Cloudflare Deployment Guide

**File:** `docs/deployment-cloudflare.md`

Should document:

- Setting up Cloudflare Pages for static/SSR
- Setting up Cloudflare Workers for API
- Environment variable configuration per environment
- Durable Objects setup (when implemented)
- KV namespace setup for caching
- Deployment workflow

### Phase 3: Backend Integration (MEDIUM PRIORITY)

**Time Estimate:** 4-6 hours (depends on existing backend)

#### 6.6 Verify Backend Worker Endpoints

- [ ] POST `/exports` - Create export
- [ ] GET `/exports/:id` - Get export
- [ ] GET `/state-packs` - List packs
- [ ] GET `/state-packs/:state` - Get pack
- [ ] GET `/locations/:id` - Get location detail
- [ ] POST `/observations` - Create observation
- [ ] GET `/observations/:id` - Get observation
- [ ] POST `/moderation/review` - Moderation
- [ ] GET `/moderation/pending` - List pending

#### 6.7 Implement Durable Objects (When Ready)

- ExportCoordinatorDO
- StatePackRegistryDO

#### 6.8 Implement Queue Handler (When Ready)

- `exports-queue` handler for async export processing

---

## 7. Deployment Checklist

### Pre-Deployment (Dev → Staging)

- [ ] Fix admin key exposure (Phase 1)
- [ ] Update .env.example (Phase 1)
- [ ] Fix API base URL resolution (Phase 1)
- [ ] Create wrangler.toml (Phase 2)
- [ ] Run type-check: `pnpm type-check` ✅ (Already passing)
- [ ] Run all tests: `pnpm test` (if applicable)
- [ ] Build web app: `pnpm build` (if applicable)

### Staging Deployment

- [ ] Set environment variables in Cloudflare dashboard
- [ ] Deploy Next.js to Cloudflare Pages
- [ ] Deploy Workers to staging environment
- [ ] Test all API endpoints against staging
- [ ] Verify admin functionality works via server-side validation
- [ ] Load test with expected user volume

### Production Deployment

- [ ] Repeat all staging tests
- [ ] Update DNS to point to Cloudflare
- [ ] Monitor error rates and performance
- [ ] Have rollback plan ready
- [ ] Document any issues encountered

---

## 8. Environment Variable Mapping

### Development (localhost)

```
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### Staging

```
NEXT_PUBLIC_API_URL=https://staging-api.rockhound.app
NEXT_PUBLIC_SUPABASE_URL=https://staging.rockhound.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
NEXT_PUBLIC_SITE_URL=https://staging.rockhound.app
NODE_ENV=production
VERCEL_ENV=preview
```

### Production

```
NEXT_PUBLIC_API_URL=https://api.rockhound.app
NEXT_PUBLIC_SUPABASE_URL=https://prod.rockhound.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
NEXT_PUBLIC_SITE_URL=https://rockhound.app
NODE_ENV=production
VERCEL_ENV=production
```

### Cloudflare Workers (backend)

```
ENVIRONMENT=production
SUPABASE_URL=https://prod.rockhound.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
MAPBOX_API_KEY=sk.ey...
ADMIN_API_KEY=your-secret-key (environment variable, not NEXT_PUBLIC_)
CLOUDFLARE_ACCOUNT_ID=abc123...
```

---

## 9. Validation Checklist

Run before committing Patch 6 changes:

```bash
# Type checking
pnpm type-check ✅

# Linting
pnpm lint

# Environment validation
# - Verify all NEXT_PUBLIC_* variables are client-safe
# - Verify no secrets in client code
# - Verify API_URL can be configured per environment

# API client validation
# - Verify base URL resolution works
# - Verify error handling works
# - Verify retry logic works with Workers

# Build validation
pnpm build
```

---

## 10. Migration Path

### Current State (Supabase/Vercel)

```
Browser → Vercel Edge (Next.js) → Supabase (Postgres)
```

### Target State (Cloudflare)

```
Browser → Cloudflare Pages (Next.js/Static)
              ↓
         Cloudflare Workers (API)
              ↓
         Supabase (Postgres) OR Cloudflare D1
```

**Data layer:** Can keep Supabase or migrate to Cloudflare D1 (PostgreSQL)  
**No changes needed** to frontend or API client for this migration

---

## 11. Next Steps

### Immediate (Patch 6)

1. ✅ Create this deployment readiness report
2. 🔄 Fix admin key exposure
3. 🔄 Update .env.example
4. 🔄 Fix API base URL resolution
5. 🔄 Create wrangler.toml template

### Short Term (Patch 7)

1. Implement wrangler configuration
2. Create Cloudflare deployment guide
3. Test local Workers development

### Medium Term (Patch 8+)

1. Implement Durable Objects (if needed)
2. Implement Queue handlers (if needed)
3. Set up staging environment
4. Performance optimization

---

## 12. Risk Assessment

| Risk                                     | Probability | Impact   | Mitigation                                |
| ---------------------------------------- | ----------- | -------- | ----------------------------------------- |
| Admin key exposure to unauthorized users | High        | Critical | Move validation server-side (Phase 1)     |
| API URL misconfiguration in production   | Medium      | High     | Validate URL format + environment tests   |
| Workers cold start delays                | Medium      | Medium   | Implement caching layer (KV)              |
| Supabase quota exceeded                  | Low         | High     | Monitor usage, implement rate limiting    |
| DNS propagation issues                   | Low         | Medium   | Use Cloudflare DNS, pre-test with staging |

---

## 13. Success Criteria

Deployment will be considered **READY** when:

- ✅ All type checks pass
- ✅ Admin key validation server-side only
- ✅ API base URL configurable per environment
- ✅ wrangler.toml created and valid
- ✅ All API endpoints accessible from Cloudflare Workers
- ✅ Authentication working with Supabase
- ✅ No secrets exposed in client code
- ✅ Staging deployment tests passing
- ✅ Performance metrics acceptable

---

## Appendix A: Files to Modify

### Phase 1 (Security)

- `apps/web/.env.example` - Add NEXT_PUBLIC_API_URL, document variables
- `apps/web/lib/api/client.ts` - Fix URL resolution, add validation
- `apps/web/app/admin/moderation/ModerationClient.tsx` - Remove NEXT_PUBLIC_ADMIN_KEY
- `apps/web/app/admin/moderation/page.tsx` - Update admin check logic

### Phase 2 (Configuration)

- `wrangler.toml` - NEW FILE
- `docs/deployment-cloudflare.md` - NEW FILE

### Phase 3 (Backend)

- Backend Workers implementation (TBD)
- Durable Objects implementation (TBD)
- Queue handler implementation (TBD)

---

## Appendix B: Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)

---

**Report Status:** READY FOR REVIEW  
**Prepared by:** GitHub Copilot  
**Recommendation:** Proceed with Phase 1 (Security fixes) immediately

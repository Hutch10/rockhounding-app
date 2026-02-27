# Cloudflare Workers Deployment Validation Checklist

## Overview

This checklist verifies that the Cloudflare Workers API is properly deployed and accessible from the Next.js frontend. Use this before deploying to production.

---

## Phase 1: Pre-Deployment (Local Development)

### Development Environment Setup

- [ ] Node.js 18+ installed (`node --version`)
- [ ] wrangler CLI installed globally (`wrangler --version`)
- [ ] npm dependencies installed (`npm ci`)
- [ ] `.env.local` file exists with `NEXT_PUBLIC_API_URL=http://localhost:8787`
- [ ] Cloudflare account created and authenticated (`wrangler login`)

### Local Worker Server

- [ ] Run `wrangler dev --config wrangler.toml.dev` in new terminal
- [ ] Server starts on `http://localhost:8787`
- [ ] No errors in wrangler output
- [ ] Can access `http://localhost:8787/health` in browser

### Frontend Configuration

- [ ] Next.js app runs (`npm run dev` in `apps/web`)
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8787`
- [ ] No console errors about API connectivity

### Basic Connectivity

- [ ] Can make `curl http://localhost:8787/health`
- [ ] Response is valid JSON with status field
- [ ] Health endpoint returns 200 OK
- [ ] CORS headers allow requests from `http://localhost:3000`

---

## Phase 2: Endpoint Validation (Local)

### Health & Status Endpoints

```bash
# Run this command to test all endpoints
./scripts/validate-cloudflare-deployment.sh http://localhost:8787
```

- [ ] ✓ PASS GET /health
- [ ] ✓ PASS GET /locations (with bbox=-120,-40,120,40)
- [ ] ✓ PASS POST /observations (with x-user-id header)
- [ ] ✓ PASS POST /exports
- [ ] ✓ PASS GET /state-packs

### Error Handling Validation

- [ ] GET /locations without bbox returns 400 with error message
- [ ] GET /locations with invalid bbox returns 400
- [ ] POST /observations without user-id header returns 400 or 403
- [ ] Invalid JSON in request body returns 400
- [ ] Non-existent endpoint returns 404

### Response Format Validation

- [ ] All responses are valid JSON
- [ ] Success responses contain `.data` field
- [ ] Error responses contain `.error` field
- [ ] Error messages are descriptive
- [ ] Timestamps are ISO 8601 format (if present)

---

## Phase 3: Integration Testing (Local)

### TypeScript Integration Tests

```bash
cd apps/web
npm run test -- cloudflare-worker.test.ts
```

- [ ] All 40+ integration tests pass
- [ ] No timeout errors (10s timeout)
- [ ] CORS tests pass
- [ ] Performance tests pass (<500ms for health, <1s for locations)
- [ ] Authentication tests pass
- [ ] Error handling tests pass

### Browser DevTools Verification

1. [ ] Open Next.js app in browser
2. [ ] Open Developer Tools → Network tab
3. [ ] Make API call (e.g., navigate to locations page)
4. [ ] Verify request shows:
   - [ ] URL is `http://localhost:8787/...`
   - [ ] Response status is 200
   - [ ] Content-Type is `application/json`
   - [ ] Response body is valid JSON
   - [ ] No CORS errors in console

### Frontend Feature Testing

- [ ] Locations map loads and displays data
- [ ] Can search and filter locations
- [ ] Can create new observation
- [ ] Can upload images (requires R2 configuration)
- [ ] Can export data
- [ ] All forms work without API errors

---

## Phase 4: Staging Deployment

### Cloudflare Account Preparation

- [ ] Cloudflare account has active subscription
- [ ] API token created with Workers.scripts:write permission
- [ ] API token stored in environment variable `CLOUDFLARE_API_TOKEN`
- [ ] Account ID available from Cloudflare dashboard

### Staging Configuration

- [ ] Update `.env.staging`:
  ```
  NEXT_PUBLIC_API_URL=https://api-staging.rockhound.app
  ```
- [ ] Create R2 bucket `rockhounding-exports-staging`
- [ ] Create R2 bucket `rockhounding-state-packs-staging`
- [ ] Create KV namespaces `rockhounding:cache:staging` and `rockhounding:tokens:staging`

### Durable Objects Setup (Staging)

```bash
wrangler migrations create initial_schema
```

- [ ] Migration created successfully
- [ ] Migration includes ExportCoordinatorDO schema
- [ ] Migration includes StatePackRegistryDO schema
- [ ] SQL is syntactically valid

### Staging Deployment

```bash
# Update wrangler.toml with staging settings
wrangler deploy --config wrangler.toml --env staging
```

- [ ] Deployment completes without errors
- [ ] Worker deployed to Cloudflare dashboard visible
- [ ] Health endpoint responds from staging URL
- [ ] Check Cloudflare dashboard for worker status

### Staging Validation

```bash
./scripts/validate-cloudflare-deployment.sh https://api-staging.rockhound.app
```

- [ ] ✓ PASS API is reachable
- [ ] ✓ PASS Cloudflare headers present
- [ ] ✓ PASS CORS headers configured
- [ ] ✓ PASS All 10 endpoint categories pass
- [ ] ✓ PASS Error handling validation
- [ ] ✓ PASS Response format validation
- [ ] ✓ PASS Performance benchmarks
- [ ] ✓ PASS Durable Objects accessible
- [ ] ✓ PASS Authentication validation
- [ ] ✓ PASS Frontend integration tests

### Staging Frontend Testing

- [ ] Deploy Next.js app to Staging environment
- [ ] Set `NEXT_PUBLIC_API_URL` to staging API URL in deployment
- [ ] Test all features against staging API:
  - [ ] Location listing and search
  - [ ] Observation creation
  - [ ] Image uploads (R2)
  - [ ] Export generation
  - [ ] User authentication flows
- [ ] Monitor CloudWatch logs for errors
- [ ] Check Analytics Engine metrics

### Performance Testing (Staging)

- [ ] Health check latency < 500ms
- [ ] Locations endpoint < 1000ms
- [ ] Observation creation < 2000ms
- [ ] Export initiation < 1500ms
- [ ] Check Cloudflare Analytics for request distribution
- [ ] Verify no 5xx errors in logs

---

## Phase 5: Production Preparation

### Production Cloudflare Configuration

- [ ] Separate Cloudflare account or namespace for production
- [ ] Custom domain configured (rockhound.app)
- [ ] SSL/TLS certificate configured
- [ ] Rate limiting rules configured
- [ ] WAF rules configured (if required)

### Production Secrets Management

- [ ] Database connection string in Cloudflare secret
- [ ] API keys in Cloudflare secret (not in code)
- [ ] JWT signing key in secret
- [ ] R2 credentials in environment
- [ ] All secrets rotated from development versions

### Production R2 Buckets

- [ ] `rockhounding-exports` created
  - [ ] Retention policy: 30 days for temporary exports
  - [ ] CORS configured for `rockhound.app`
  - [ ] Public read disabled (signed URLs only)
- [ ] `rockhounding-state-packs` created
  - [ ] Retention policy: unlimited
  - [ ] CORS configured
  - [ ] Versioning enabled

### Production KV Namespaces

- [ ] `rockhounding:cache` created
  - [ ] TTL policies configured for cache entries
- [ ] `rockhounding:tokens` created
  - [ ] Secure token storage
  - [ ] Expiration handling

### Production Database

- [ ] D1 database created (or Supabase connection verified)
- [ ] Schema migrations applied
- [ ] Indexes created for performance
- [ ] Backup strategy configured

### Production Durable Objects

- [ ] ExportCoordinatorDO migrations applied
- [ ] StatePackRegistryDO migrations applied
- [ ] Backup/persistence strategy configured
- [ ] Monitoring alerts configured

### Production Monitoring Setup

- [ ] CloudWatch integration enabled
- [ ] Analytics Engine queries configured
- [ ] Alert policies for:
  - [ ] High error rates (>1%)
  - [ ] Slow endpoints (>2s)
  - [ ] Down detector (0 requests for 5min)
- [ ] Log retention policy set (>30 days)
- [ ] Incident response runbook created

---

## Phase 6: Production Rollout

### Pre-Production Checks

```bash
# Review all changes
git diff main...production

# Run all tests one more time
npm run test
npm run test:integration -- cloudflare-worker.test.ts

# Build next.js for production
npm run build

# Validate wrangler config
wrangler publish --dry-run
```

- [ ] All tests pass
- [ ] No warnings in build output
- [ ] wrangler validation passes
- [ ] Git history is clean

### Production Deployment

```bash
# Deploy worker to production
wrangler deploy --config wrangler.toml --env production

# Deploy frontend
npm run deploy:web
```

- [ ] Worker deployed successfully
- [ ] Frontend deployed successfully
- [ ] Deployment logs show no errors
- [ ] CloudFlare dashboard shows worker running

### Post-Deployment Validation

```bash
# Validate production API
./scripts/validate-cloudflare-deployment.sh https://api.rockhound.app
```

- [ ] ✓ PASS All 70+ validation tests
- [ ] ✓ PASS Cloudflare protection headers present
- [ ] ✓ ✓ ✓ All endpoints functional
- [ ] ✓ PASS Performance within SLA
- [ ] Check CloudWatch for errors (should be 0)

### Production Smoke Tests

1. [ ] Open `https://rockhound.app` in browser
2. [ ] Homepage loads without errors
3. [ ] Can view locations
4. [ ] Can search locations
5. [ ] Can create new observation
6. [ ] Can export data
7. [ ] No console errors
8. [ ] No Network tab errors

### Monitoring First 24 Hours

- [ ] CloudWatch error rate < 0.1%
- [ ] Response times stable
- [ ] No anomalous traffic patterns
- [ ] User feedback positive (if beta/early access)
- [ ] Database performance normal
- [ ] No database connection issues
- [ ] No R2 storage issues
- [ ] No authentication failures (except invalid credentials)

---

## Phase 7: Rollback Procedures

### If Production Issues Occur

**Critical Error (>5% error rate, severe functionality broken):**

```bash
# Rollback to previous version
wrangler rollback --message "Critical issue - rolling back"

# Or manually redeploy stable version
git checkout <stable-commit>
wrangler deploy
```

- [ ] Rollback initiated
- [ ] Previous version deployed
- [ ] Validation confirms rollback successful
- [ ] Incident documented
- [ ] Root cause analysis started

**Minor Errors (<1% error rate, specific feature broken):**

- [ ] Create bug fix branch
- [ ] Implement fix
- [ ] Test locally
- [ ] Deploy to staging
- [ ] Validate in staging
- [ ] Deploy to production
- [ ] Monitor for 1 hour

---

## Health Check Endpoints

### Health Status Endpoint

```bash
curl https://api.rockhound.app/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "region": "US",
  "components": {
    "database": "healthy",
    "storage": "healthy",
    "cache": "healthy"
  }
}
```

### Readiness Check Endpoint

```bash
curl https://api.rockhound.app/ready
```

**Expected Response:**

```json
{
  "ready": true,
  "uptime_seconds": 3600,
  "request_count": 45000
}
```

---

## Common Issues & Solutions

### 404 Error on API Endpoints

**Symptom:** All API requests return 404

- [ ] Check Route defined in `wrangler.toml`
- [ ] Verify worker code has correct path handlers
- [ ] Check CloudFlare dashboard for worker status

**Solution:**

```bash
# Redeploy worker
wrangler deploy

# Verify routes
curl -I https://api.rockhound.app/
```

### CORS Errors from Frontend

**Symptom:** Browser console shows CORS error, Network tab shows no `Access-Control-Allow-Origin`

- [ ] Check wrangler.toml has CORS headers configured
- [ ] Verify frontend origin is whitelisted
- [ ] Check CloudFlare dashboard CORS settings

**Solution:**

```ts
// In wrangler.toml
[[routes]];
pattern = 'api/*';
custom_domain = 'api.rockhound.app';

// Add to worker response:
headers.set('Access-Control-Allow-Origin', 'https://rockhound.app');
```

### Durable Objects Not Persisting Data

**Symptom:** Data written to DO is lost after request

- [ ] Check if migration was applied
- [ ] Verify DO state method called correctly
- [ ] Check cloudflare logs for DO errors

**Solution:**

```bash
# List applied migrations
wrangler migrations list

# Apply pending migrations
wrangler migrations apply
```

### R2 Upload Failures

**Symptom:** Image uploads fail with 403 or 500

- [ ] Check R2 bucket exists
- [ ] Verify bucket CORS configured
- [ ] Check R2 credentials in wrangler.toml

**Solution:**

```bash
# List R2 buckets
wrangler r2 bucket list

# Test R2 access
wrangler r2 object put rockhounding-exports test.txt
```

### KV Namespace Not Found

**Symptom:** Worker crashes with "KV namespace not found"

- [ ] Check namespace binding in wrangler.toml
- [ ] Verify namespace exists in Cloudflare
- [ ] Check environment config

**Solution:**

```bash
# List KV namespaces
wrangler kv:namespace list

# Create missing namespace
wrangler kv:namespace create rockhounding-cache
```

---

## Performance Benchmarks (SLA)

| Endpoint           | Target  | Alert Threshold |
| ------------------ | ------- | --------------- |
| /health            | <200ms  | >500ms          |
| /locations         | <500ms  | >1500ms         |
| /observations POST | <1000ms | >2500ms         |
| /exports POST      | <1000ms | >2500ms         |
| /state-packs       | <300ms  | >1000ms         |

---

## Sign-Off

- [ ] All validation tests passed
- [ ] Performance benchmarks met
- [ ] Security checks passed
- [ ] Monitoring configured
- [ ] Runbook updated
- [ ] Team notified of deployment

**Date:** ******\_\_\_\_******
**Validated By:** ******\_\_\_\_******
**Final Approval:** ******\_\_\_\_******

---

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)
- [Project Deployment Guide](./CLOUDFLARE_DEPLOYMENT_GUIDE.md)

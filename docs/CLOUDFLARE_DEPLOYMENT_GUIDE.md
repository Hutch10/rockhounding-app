# Cloudflare Workers Deployment Guide

**Date Created:** February 25, 2026  
**Target Audience:** DevOps engineers and backend developers  
**Deployment Target:** Cloudflare Workers, Durable Objects, Queues, R2, KV

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Account Setup](#account-setup)
4. [Local Development](#local-development)
5. [Deploying to Staging](#deploying-to-staging)
6. [Deploying to Production](#deploying-to-production)
7. [Post-Deployment Validation](#post-deployment-validation)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Observability](#monitoring--observability)
10. [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

The Rockhounding API is deployed across multiple Cloudflare services:

```
┌────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Next.js App on Cloudflare Pages                     │  │
│  │  (Browser: http://localhost:3000 → rockhound.app)   │  │
│  └──────────────────┬──────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      │ API Requests
                      ▼
┌────────────────────────────────────────────────────────────┐
│                    Edge Layer (Cloudflare)                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Cloudflare Workers (routing, auth, validation)     │  │
│  │  - Handler: api.rockhound.app/*                     │  │
│  └──────────────────┬──────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │
          ┌───────────┼───────────┬──────────────┐
          ▼           ▼           ▼              ▼
    ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐
    │  KV     │ │ Queues   │ │ R2     │ │ Durable   │
    │ Cache   │ │ Export   │ │ Storage│ │ Objects   │
    │         │ │ Jobs     │ │        │ │           │
    └─────────┘ └──────────┘ └────────┘ └───────────┘
          │           │           │           │
          └───────────┼───────────┼───────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │  Origin (Supabase)         │
        │  - PostgreSQL + PostGIS    │
        │  - Authentication          │
        │  - Real-time subscriptions │
        └────────────────────────────┘
```

### Services

- **Cloudflare Workers**: Routes, validates, and proxies requests
- **Durable Objects**:
  - `ExportCoordinatorDO`: Manages export job lifecycle
  - `StatePackRegistryDO`: Manages state pack metadata
- **Queues**: `exports-queue` for async export processing
- **R2**: Object storage for exports, state packs, and media
- **KV**: Caching layer for frequent queries
- **Supabase**: Data persistence layer (Postgres + PostGIS)

---

## Prerequisites

### Required Tools

```bash
# Node.js 18+ (check with: node --version)
# npm or pnpm (check with: npm --version or pnpm --version)

# Cloudflare CLI
npm install -g wrangler

# Verify installation
wrangler --version  # Should be v3.0+
```

### Required Accounts

1. **Cloudflare Account** (https://dash.cloudflare.com)
   - Must have paid Workers plan (at least $20/month)
   - Must have active domain (rockhound.app)

2. **Supabase Account** (https://supabase.com)
   - Production database
   - Service role key

3. **Mapbox Account** (https://mapbox.com)
   - API key for geocoding/map services

### Required Information

Gather these before starting:

```bash
CLOUDFLARE_ACCOUNT_ID=abc123def456...  # From Cloudflare dashboard
CLOUDFLARE_API_TOKEN=v1.abc123...      # From Cloudflare dashboard
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
MAPBOX_API_KEY=sk.ey...
```

---

## Account Setup

### Step 1: Create API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Choose template: "Workers Deployments Edit"
4. Grant permissions:
   - ✅ Cloudflare Workers Accounts Deployments
   - ✅ Durable Objects – Including Admin API
   - ✅ Workers KV Storage
   - ✅ R2 Storage
   - ✅ Queues
5. Copy token and save to environment

### Step 2: Set Up Wrangler Authentication

```bash
# Login via browser (recommended)
wrangler login

# Or, set API token manually
export CLOUDFLARE_API_TOKEN="v1.abc123..."

# Verify
wrangler whoami
```

### Step 3: Create R2 Buckets

```bash
# Production
wrangler r2 bucket create rockhound-exports
wrangler r2 bucket create rockhound-state-packs
wrangler r2 bucket create rockhound-media

# Staging
wrangler r2 bucket create rockhound-exports-staging
wrangler r2 bucket create rockhound-state-packs-staging
wrangler r2 bucket create rockhound-media-staging

# Development
wrangler r2 bucket create rockhound-exports-dev
wrangler r2 bucket create rockhound-state-packs-dev
wrangler r2 bucket create rockhound-media-dev

# List buckets to verify
wrangler r2 bucket list
```

### Step 4: Create KV Namespaces

```bash
# Production
wrangler kv:namespace create "CACHE_KV" --preview false
wrangler kv:namespace create "SESSION_KV" --preview false

# Staging
wrangler kv:namespace create "CACHE_KV_STAGING" --preview false
wrangler kv:namespace create "SESSION_KV_STAGING" --preview false

# Development (optional)
wrangler kv:namespace create "CACHE_KV_DEV" --preview false
wrangler kv:namespace create "SESSION_KV_DEV" --preview false

# List namespaces and copy IDs to wrangler.toml
wrangler kv:namespace list
```

### Step 5: Create D1 Database (Optional)

```bash
# If using Cloudflare D1 instead of Supabase:
wrangler d1 create rockhound
wrangler d1 create rockhound-staging
wrangler d1 create rockhound-dev

# Get database ID and add to wrangler.toml
wrangler d1 list
```

### Step 6: Set Environment Variables

```bash
# Production environment
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# Paste the key when prompted

wrangler secret put ADMIN_API_KEY --env production
wrangler secret put MAPBOX_API_KEY --env production

# Staging environment
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
wrangler secret put ADMIN_API_KEY --env staging
wrangler secret put MAPBOX_API_KEY --env staging

# Development (optional, but recommended)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
wrangler secret put ADMIN_API_KEY --env development

# Verify secrets are set
wrangler secret list --env production
wrangler secret list --env staging
```

### Step 7: Update wrangler.toml

Replace placeholders with actual IDs:

```bash
# Get your account ID
wrangler whoami | grep "Account ID"

# Update these in wrangler.toml:
# account_id = "your-account-id"
#
# R2 bucket names (already set, verify they match)
# KV namespace IDs (from wrangler kv:namespace list)
# D1 database IDs (from wrangler d1 list, if using D1)

# Example:
# [[r2_buckets]]
# binding = "EXPORTS_BUCKET"
# bucket_name = "rockhound-exports"
#
# [[kv_namespaces]]
# binding = "CACHE_KV"
# id = "1a2b3c4d5e6f7g8h9i0j"
# preview_id = "9i0j1a2b3c4d5e6f7g8h"
```

---

## Local Development

### Starting the Development Server

```bash
# Install dependencies
cd apps/backend
npm install

# Start Supabase locally (if not already running)
cd ../.. # Back to project root
supabase start

# In a new terminal, start wrangler dev
wrangler dev --config wrangler.toml.dev --env development

# Output should show:
# > Listening on http://localhost:8787
```

### Testing Local Worker

```bash
# Health check
curl http://localhost:8787/health

# List locations (bbox: minLon,minLat,maxLon,maxLat)
curl "http://localhost:8787/locations?bbox=-120,-40,120,40"

# Create an export
curl -X POST http://localhost:8787/exports \
  -H "Content-Type: application/json" \
  -d '{"type":"observations"}'

# Get state packs
curl http://localhost:8787/state-packs

# Get location detail
curl http://localhost:8787/locations/1
```

### Development Mode Features

✅ Full request/response logging  
✅ Live reload on code changes  
✅ Breakpoint debugging  
✅ Local Durable Objects simulation  
✅ Local KV simulation  
✅ Local R2 simulation  
✅ CORS disabled (all origins allowed)  
✅ Auth checks disabled (SKIP_AUTH=true)

---

## Deploying to Staging

### Pre-Deployment Checks

```bash
# 1. Type checking
pnpm type-check

# 2. Lint
pnpm lint

# 3. Build backend
cd apps/backend
npm run build

# 4. Test
npm run test  # If tests exist

# 5. Verify configuration
wrangler publish --dry-run --env staging
```

### Deploy Staging

```bash
# Deploy Workers
wrangler deploy --env staging

# Verify deployment
wrangler deployments list --env staging

# Test staging API
curl https://staging-api.rockhound.app/health
```

### Create Durable Objects

```bash
# List DO instances
wrangler durable-objects list --env staging

# The first request to a DO creates it automatically:
curl -X POST https://staging-api.rockhound.app/do/ExportCoordinatorDO/create \
  -H "Content-Type: application/json" \
  -d '{"type":"observations"}'

# Verify DOs are created
wrangler durable-objects list --env staging
```

### Set Up Staging Queues

```bash
# Queues are created automatically when Worker publishes messages
# Verify queue is ready:
wrangler queues stats --env staging --queue exports-queue

# Manually trigger a queue message to test:
curl -X POST https://staging-api.rockhound.app/queues/exports-queue \
  -H "Content-Type: application/json" \
  -d '{"exportId":"test-export-id","type":"observations"}'
```

### Verify Staging Data

```bash
# Check R2 uploads
wrangler r2 object list rockhound-exports-staging

# Check KV cache
wrangler kv:key list --namespace-id YOUR_STAGING_KV_ID

# Check KV session store
wrangler kv:key list --namespace-id YOUR_STAGING_SESSION_KV_ID
```

---

## Deploying to Production

⚠️ **CRITICAL: Execute ONLY after successful staging tests**

### Pre-Production Verification

```bash
# 1. Test staging for 24-48 hours minimum
# 2. Verify all API endpoints work
# 3. Monitor staging metrics
# 4. Verify Supabase connection
# 5. Verify R2 bucket access
# 6. Verify KV caching

# Checklist:
# ☐ Staging API responding
# ☐ Durable Objects initialized
# ☐ Queue processing exports
# ☐ R2 storage working
# ☐ KV cache working
# ☐ Error rates < 0.1%
# ☐ Response times < 1s
```

### Production Deployment

```bash
# 1. Tag the release
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0

# 2. Build and verify
cd apps/backend
npm run build
npm run test

# 3. Deploy to production
wrangler deploy --env production

# 4. Verify deployment
wrangler deployments list --env production

# 5. Test production API
curl https://api.rockhound.app/health
curl "https://api.rockhound.app/locations?bbox=-120,-40,120,40"

# 6. Monitor logs
wrangler tail --env production

# 7. Set up rollback point
# (Copy deployment ID for emergency rollback)
```

### DNS Configuration

Update DNS records to point to Cloudflare Workers:

```dns
# If using Cloudflare for DNS:
api.rockhound.app  CNAME  rockhound.app

# If using external DNS:
api.rockhound.app  CNAME  rockhound.workers.dev
```

---

## Post-Deployment Validation

### Comprehensive Health Check

```bash
# Create validation script: scripts/validate-deployment.sh

#!/bin/bash
set -e

API_URL="${1:-https://api.rockhound.app}"

echo "🔍 Validating deployment to $API_URL"

# Test 1: Health endpoint
echo "✓ Health check"
curl -f "$API_URL/health" || exit 1

# Test 2: Locations endpoint
echo "✓ Locations endpoint"
curl -f "$API_URL/locations?bbox=-120,-40,120,40" || exit 1

# Test 3: Create export
echo "✓ Create export"
EXPORT_ID=$(curl -s -X POST "$API_URL/exports" \
  -H "Content-Type: application/json" \
  -d '{"type":"observations"}' | jq -r .id)
echo "  Export ID: $EXPORT_ID"

# Test 4: Get export
echo "✓ Get export status"
curl -f "$API_URL/exports/$EXPORT_ID" || exit 1

# Test 5: State packs
echo "✓ State packs list"
curl -f "$API_URL/state-packs" || exit 1

# Test 6: Create observation
echo "✓ Create observation"
curl -f -X POST "$API_URL/observations" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"locationId":"1","title":"Test observation"}' || exit 1

echo ""
echo "✅ All validation tests passed!"
echo "API is ready for production traffic"
```

Run it:

```bash
chmod +x scripts/validate-deployment.sh
./scripts/validate-deployment.sh https://api.rockhound.app
```

### Performance Benchmarking

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: sudo apt install apache2-utils

# Test response times
ab -n 1000 -c 10 "https://api.rockhound.app/health"

# Expected: < 100ms median latency

# Test concurrent connections
ab -n 10000 -c 100 "https://api.rockhound.app/locations?bbox=-120,-40,120,40"

# Expected: 99th percentile < 1s
```

### Log Analysis

```bash
# Stream production logs
wrangler tail --format json --env production | head -100

# Look for errors
wrangler tail --status=error --env production

# Look for slow requests (>1s)
wrangler tail --format json --env production | \
  jq 'select(.Outcomes[0].Cpu > 1000)'
```

---

## Troubleshooting

### Common Issues

#### 1. "Missing Secret" Error

```
Error: Missing secret: SUPABASE_SERVICE_ROLE_KEY
```

**Solution:**

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# Paste the key when prompted
```

#### 2. "Durable Object Not Found"

```
Error: Failed to fetch 404 Not Found
```

**Solution:** DO instances are created on first request:

```bash
# Trigger creation
curl -X POST https://api.rockhound.app/do/ExportCoordinatorDO/init

# Verify
wrangler durable-objects list --env production
```

#### 3. "R2 Bucket Access Denied"

```
Error: Access Denied to bucket rockhound-exports
```

**Solution:**

- Verify bucket name in wrangler.toml
- Verify R2 binding is correct
- Verify User has R2 permissions
- Check bucket is in same account

```bash
wrangler r2 bucket list
wrangler whoami
```

#### 4. "KV Namespace Not Found"

```
Error: KV namespace not found
```

**Solution:**

```bash
# Get correct namespace IDs
wrangler kv:namespace list

# Update wrangler.toml with correct IDs
# Then restart: wrangler deploy
```

#### 5. "Queue Consumer Not Activated"

```
Error: Queue consumer not running
```

**Solution:**

```bash
# Ensure deployment includes queue consumer config
wrangler deploy --env production

# Verify registration
wrangler queues stats exports-queue --env production

# Trigger a message
curl -X POST https://api.rockhound.app/queues/exports-queue \
  -H "Content-Type: application/json" \
  -d '{"exportId":"test-id"}'
```

### Debugging

#### Enable Debug Logging

```bash
# In wrangler.toml [env.production]:
vars = {
  DEBUG_API = "true",
  LOG_LEVEL = "debug"
}

# Deploy
wrangler deploy --env production

# View logs
wrangler tail --format json --env production
```

#### Test with curl

```bash
# Add verbose output
curl -v https://api.rockhound.app/health

# Include headers
curl -i https://api.rockhound.app/health

# Trace DNS
curl -v https://api.rockhound.app/health 2>&1 | grep -A5 "Connected to"
```

#### Check Staging First

Always test problematic changes on staging before production:

```bash
# Deploy to staging only
wrangler deploy --env staging

# Test thoroughly
curl https://staging-api.rockhound.app/health

# Then deploy to production
wrangler deploy --env production
```

---

## Monitoring & Observability

### Real-time Logs

```bash
# Follow production logs in real-time
wrangler tail --env production

# Filter by status
wrangler tail --status error --env production
wrangler tail --status success --env production

# Follow specific URL
wrangler tail --env production | grep "/exports"

# JSON format for parsing
wrangler tail --format json --env production | jq '.Outcomes'
```

### Metrics & Analytics

1. **Via Cloudflare Dashboard**
   - Visit https://dash.cloudflare.com/rockhound.app/workers/overview
   - View request count, error rate, latency
   - Monitor by route and response code

2. **Via Wrangler**

   ```bash
   wrangler analytics --env production --since 1h
   ```

3. **Custom Monitoring** (Optional)
   ```bash
   # Send metrics to Datadog, Sentry, etc.
   # Configure in worker code:
   # sendMetric('requests', 1, { path: request.url })
   ```

### Alerting

Set up alerts via Cloudflare dashboard:

1. Go to Notifications > Create
2. Select "Worker Errors"
3. Set threshold: Error rate > 1%
4. Add email notifications
5. Set PagerDuty integration (optional)

---

## Rollback Procedures

### Emergency Rollback (Fast)

```bash
# Get previous deployment ID
wrangler deployments list --env production --limit 10

# Rollback to previous version
wrangler deploy --env production --compatibility-flags nodejs_compat

# Or manually trigger previous deployment
wrangler rollback --env production
```

### Full Rollback

```bash
# If something is seriously broken:

# 1. Redirect traffic away from broken Worker
# (Update DNS or Cloudflare routing)

# 2. Investigate issue thoroughly
wrangler tail --env production --format json | jq '.Exceptions'

# 3. Fix code and test on staging
wrangler deploy --env staging

# 4. Redeploy fixed version
wrangler deploy --env production

# 5. Monitor for regression
wrangler tail --env production
```

### Database Rollback

If Durable Objects state is corrupted:

```bash
# Delete and recreate DO
wrangler durable-objects delete ExportCoordinatorDO --env production

# This will lose in-flight state but prevent further corruption
# Queued jobs will retry automatically

# Restore from Supabase backups if needed
```

---

## Quick Reference

### Useful Commands

```bash
# Deployment
wrangler deploy --env production
wrangler deploy --env staging
wrangler publish --dry-run --env production

# Logs and debugging
wrangler tail --env production
wrangler tail --status error --env production
wrangler tail --format json --env production

# Secrets management
wrangler secret list --env production
wrangler secret put NAME --env production
wrangler secret delete NAME --env production

# Durable Objects
wrangler durable-objects list --env production
wrangler durable-objects delete CLASS_NAME --env production

# Queues
wrangler queues stats exports-queue --env production
wrangler queues local

# R2 Storage
wrangler r2 bucket list
wrangler r2 object list BUCKET_NAME
wrangler r2 object delete BUCKET_NAME KEY

# KV Storage
wrangler kv:namespace list
wrangler kv:key list --namespace-id NAMESPACE_ID
wrangler kv:key get KEY --namespace-id NAMESPACE_ID
wrangler kv:key delete KEY --namespace-id NAMESPACE_ID
```

---

## Checklist: Production Deployment

- [ ] Code reviewed and merged to main
- [ ] Type-check passing: `pnpm type-check`
- [ ] All tests passing: `npm run test`
- [ ] Staging deployment successful
- [ ] Staging tested for 24+ hours
- [ ] No errors > 0.1% on staging
- [ ] Supabase backed up
- [ ] R2 buckets created
- [ ] KV namespaces created
- [ ] All secrets set: `wrangler secret list --env production`
- [ ] wrangler.toml correct
- [ ] DNS records prepared
- [ ] Rollback plan documented
- [ ] On-call engineer assigned
- [ ] Status page updated
- [ ] Stakeholders notified

---

## Need Help?

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Durable Objects**: https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
- **Cloudflare Support**: https://support.cloudflare.com/

---

**Last Updated:** February 25, 2026  
**Maintained By:** Backend Team  
**Next Review:** September 2026

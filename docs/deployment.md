# Deployment Guide

This guide covers deploying the Rockhounding MVP to production using Supabase and Vercel (or similar Next.js hosting platform).

## Prerequisites

- [Supabase account](https://supabase.com) (free tier available)
- [Vercel account](https://vercel.com) (free tier available) or alternative Next.js host
- [Mapbox account](https://mapbox.com) (free tier available)
- Domain name (optional, for custom domain)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐         ┌──────────────────────────┐    │
│  │   Vercel      │         │      Supabase Cloud      │    │
│  │  (Next.js)    │────────▶│  ┌────────────────────┐  │    │
│  │               │         │  │  Postgres + PostGIS │  │    │
│  │  - SSR        │         │  │  - locations        │  │    │
│  │  - API Routes │         │  │  - observations     │  │    │
│  │  - Static     │         │  │  - exports          │  │    │
│  └───────────────┘         │  │  - state_packs      │  │    │
│                            │  └────────────────────┘  │    │
│                            │                          │    │
│                            │  ┌────────────────────┐  │    │
│                            │  │  Edge Functions    │  │    │
│                            │  │  - process-exports │  │    │
│                            │  │  - state-packs     │  │    │
│                            │  └────────────────────┘  │    │
│                            │                          │    │
│                            │  ┌────────────────────┐  │    │
│                            │  │  Storage Buckets   │  │    │
│                            │  │  - exports         │  │    │
│                            │  │  - state-packs     │  │    │
│                            │  └────────────────────┘  │    │
│                            └──────────────────────────┘    │
│                                                               │
│  ┌───────────────┐                                          │
│  │   Mapbox GL   │                                          │
│  │  (Map Tiles)  │                                          │
│  └───────────────┘                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `rockhounding-mvp`
   - **Database Password**: Generate strong password (save securely)
   - **Region**: Choose closest to your users (e.g., `us-west-1`)
4. Click "Create new project" (takes ~2 minutes)

### 1.2 Enable PostGIS Extension

1. Go to **Database** → **Extensions** in Supabase dashboard
2. Search for `postgis` and enable it
3. Verify by running in SQL Editor:
   ```sql
   SELECT PostGIS_version();
   ```

### 1.3 Run Database Migrations

1. Install Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Link to your project:

   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. Apply migrations:

   ```bash
   cd supabase
   supabase db push
   ```

4. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

### 1.4 Seed Initial Data

Run seed scripts in SQL Editor:

1. Open **SQL Editor** in Supabase dashboard
2. Copy contents of `/supabase/migrations/004_seed_materials.sql`
3. Execute
4. Repeat for other seed files (rulesets, locations, etc.)

### 1.5 Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create bucket `exports`:
   - **Public**: Yes (via signed URLs)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `application/json, application/geo+json, application/vnd.google-earth.kml+xml, text/csv`
3. Create bucket `state-packs`:
   - **Public**: Yes (via signed URLs)
   - **File size limit**: 100 MB
   - **Allowed MIME types**: `application/json`

### 1.6 Deploy Edge Functions

1. Deploy export processor:

   ```bash
   cd supabase/functions
   supabase functions deploy process-exports
   ```

2. Deploy state pack generator:

   ```bash
   supabase functions deploy state-packs
   ```

3. Set secrets:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 1.7 Schedule Background Jobs

Set up pg_cron for automated pack generation:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule state pack generation (nightly at 2 AM UTC)
SELECT cron.schedule(
  'state-packs-nightly',
  '0 2 * * *',
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/state-packs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) $$
);

-- Schedule export processing (every minute)
SELECT cron.schedule(
  'process-exports-job',
  '* * * * *',
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-exports',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) $$
);
```

### 1.8 Copy Environment Variables

From Supabase dashboard (**Settings** → **API**):

- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Step 2: Mapbox Setup

### 2.1 Create Mapbox Account

1. Go to [mapbox.com](https://mapbox.com) and sign up
2. Navigate to **Account** → **Access Tokens**
3. Create new token:
   - **Name**: `rockhounding-production`
   - **Scopes**: `styles:read`, `tiles:read`
   - **URL Restrictions**: Add your production domain
4. Copy token: `NEXT_PUBLIC_MAPBOX_TOKEN`

## Step 3: Vercel Deployment

### 3.1 Prepare Repository

1. Create GitHub repository (or GitLab/Bitbucket)
2. Push code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/rockhounding-mvp.git
   git push -u origin main
   ```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build` (or auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### 3.3 Set Environment Variables

In Vercel project settings (**Settings** → **Environment Variables**), add:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Storage Buckets (optional, defaults to 'exports' and 'state-packs')
EXPORTS_BUCKET=exports
STATE_PACKS_BUCKET=state-packs
```

**Important**: Mark `SUPABASE_SERVICE_ROLE_KEY` as **secret** (not exposed to client).

### 3.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Verify deployment at `https://your-project.vercel.app`

### 3.5 Add Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `rockhounding.app`)
3. Configure DNS:
   - **Type**: `CNAME`
   - **Name**: `@` or `www`
   - **Value**: `cname.vercel-dns.com`
4. Wait for DNS propagation (~10 minutes)

## Step 4: Verify Deployment

### 4.1 Health Checks

Visit these URLs to verify:

1. **Homepage**: `https://your-domain.com`
2. **Map page**: `https://your-domain.com/map`
3. **API health**: `https://your-domain.com/api/locations` (should return thin pins)
4. **State packs**: `https://your-domain.com/state-packs` (should list packs)

### 4.2 Test Core Features

1. **Map loads**: Verify Mapbox tiles display
2. **Thin pins**: Verify location markers appear
3. **Location detail**: Click pin, verify full detail loads
4. **Exports**: Create export, verify background processing
5. **State packs**: Download pack, verify JSON content

### 4.3 Monitor Logs

- **Vercel logs**: **Deployments** → **Functions** → View logs
- **Supabase logs**: **Logs** → **API** / **Database** / **Functions**

## Step 5: Production Checklist

### Security

- [ ] RLS policies enabled on all tables
- [ ] Service role key stored securely (server-only)
- [ ] Signed URLs configured with 1-hour expiry
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled (Vercel: automatic, Supabase: configure in dashboard)

### Performance

- [ ] Next.js production build completed successfully
- [ ] Static pages pre-rendered
- [ ] API routes optimized (caching where appropriate)
- [ ] Database indexes created (see migrations)
- [ ] CDN enabled (Vercel: automatic)

### Monitoring

- [ ] Error tracking configured (e.g., Sentry)
- [ ] Uptime monitoring enabled (e.g., Vercel Analytics)
- [ ] Database backup schedule (Supabase: automatic daily)
- [ ] Alerts configured for critical failures

### Documentation

- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Deployment process documented (this file!)
- [ ] Security model documented (`/docs/security.md`)

## Troubleshooting

### Build Fails on Vercel

**Error**: `Cannot find module '@/lib/supabase/server'`

**Fix**: Ensure `tsconfig.json` has correct paths:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Database Connection Errors

**Error**: `Unable to connect to database`

**Fix**:

1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check Supabase project is running (not paused)
3. Verify network access (Supabase allows all IPs by default)

### Edge Function Timeouts

**Error**: `Function execution timed out`

**Fix**:

1. Check function logs in Supabase dashboard
2. Optimize queries (add indexes, reduce data fetched)
3. Increase timeout in `supabase/functions/{function-name}/index.ts`

### Map Tiles Not Loading

**Error**: `Failed to load map tiles`

**Fix**:

1. Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set
2. Check token has correct scopes (`styles:read`, `tiles:read`)
3. Verify domain is whitelisted in Mapbox dashboard

## Rollback Procedure

If deployment fails:

1. **Vercel**: Go to **Deployments**, find previous successful deployment, click "..." → "Promote to Production"
2. **Supabase**: Restore database from backup (**Database** → **Backups**)
3. **Edge Functions**: Redeploy previous version:
   ```bash
   git checkout <previous-commit>
   supabase functions deploy <function-name>
   ```

## Scaling Considerations

### Database

- **Free tier**: 500 MB storage, 50 GB bandwidth
- **Pro tier**: $25/mo, 8 GB storage, 250 GB bandwidth
- **Upgrade when**: Approaching storage/bandwidth limits

### Next.js Hosting

- **Vercel Free**: 100 GB bandwidth
- **Vercel Pro**: $20/mo, 1 TB bandwidth
- **Upgrade when**: Approaching bandwidth limits or need team features

### Cost Estimates (Monthly)

| Service   | Free Tier             | Paid Tier            | Recommended    |
| --------- | --------------------- | -------------------- | -------------- |
| Supabase  | $0 (500 MB DB)        | $25 (8 GB DB)        | Free for MVP   |
| Vercel    | $0 (100 GB bandwidth) | $20 (1 TB bandwidth) | Free for MVP   |
| Mapbox    | $0 (50k loads/mo)     | Pay-as-you-go        | Free for MVP   |
| **Total** | **$0**                | **$45+**             | **$0 for MVP** |

## Support

- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **GitHub Issues**: [github.com/yourusername/rockhounding-mvp/issues](https://github.com/yourusername/rockhounding-mvp/issues)

---

**Last Updated**: January 21, 2026  
**Next Review**: After Step 12 (Field Mode + GPS)

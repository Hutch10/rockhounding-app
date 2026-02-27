# Next.js Web App

Production-grade Next.js PWA with TypeScript and App Router.

## Purpose

This is the main web application that provides:

- Interactive map interface for rockhounding locations
- Legal status and access model display
- Geologist field observation tools
- Offline-capable PWA functionality
- Progressive disclosure UI based on zoom levels

## Stack

- Next.js 14+ (App Router, TypeScript)
- React 18+
- Mapbox GL JS (abstracted for future MapLibre migration)
- Supabase client
- PWA support via next-pwa

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check
```

## Architecture

- Uses shared contracts from `@rockhounding/shared`
- TypeScript project references for fast incremental builds
- Strict TypeScript configuration with no implicit any
- App Router for file-based routing
- Server Components by default, Client Components where needed

## Constraints

- DO NOT duplicate enums or schemas (use @rockhounding/shared)
- Follow API contracts exactly (thin pins for map, full detail on click)
- Enforce legal gating in UI logic
- No full-detail data during map panning

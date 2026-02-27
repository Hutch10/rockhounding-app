# Shared Package

Shared TypeScript contracts, enums, and Zod validators.

## Purpose

This package contains all shared code that must NOT be duplicated:

- Enums (legal_tag, source_tier, status, visibility)
- TypeScript types and interfaces
- Zod validation schemas
- Shared constants

## Key Principle

**SINGLE SOURCE OF TRUTH**: All enums and types are defined here and imported by both the web app and backend functions. DO NOT duplicate these definitions.

## Usage

```typescript
import { LegalTag, SourceTier } from '@rockhounding/shared';
```

## Development

```bash
# Build package
pnpm build

# Type checking
pnpm type-check

# Run tests
pnpm test
```

## Architecture

- TypeScript project references for fast builds
- Compiled to ES modules in `/dist`
- Zod for runtime validation
- Vitest for testing schemas

## Constraints

- This is the ONLY place to define shared enums
- All enums must match Build Document exactly
- Every enum should have a Zod schema validator
- Every validator should have unit tests (Step 2)

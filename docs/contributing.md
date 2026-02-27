# Contributing to Rockhounding MVP

Thank you for your interest in contributing to the Rockhounding MVP! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Pre-commit Hooks](#pre-commit-hooks)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful**: Treat all contributors with respect and professionalism
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors of all backgrounds and skill levels

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **pnpm**: 8.x or higher
- **Git**: Latest stable version
- **Supabase CLI**: For local database development
- **Mapbox Account**: For map tile access

### Installation

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/rockhounding-mvp.git
   cd rockhounding-mvp
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/rockhounding-mvp.git
   ```

4. **Install dependencies**:

   ```bash
   pnpm install
   ```

5. **Set up environment variables**:

   ```bash
   cd apps/web
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

6. **Run migrations** (if using local Supabase):

   ```bash
   supabase db reset
   ```

7. **Start development server**:
   ```bash
   pnpm dev
   ```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes
- `chore/description` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Run build
pnpm build
```

### 4. Commit Your Changes

Follow the [commit guidelines](#commit-guidelines) below.

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### TypeScript

- **Use TypeScript strict mode** (enabled in tsconfig.json)
- **Explicit return types** for functions
- **No `any` types** unless absolutely necessary (use `unknown` instead)
- **Prefer interfaces** over type aliases for object shapes
- **Use enums** for fixed sets of values

**Example**:

```typescript
// Good
interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
}

function getLocation(id: string): Promise<Location | null> {
  // ...
}

// Bad
function getLocation(id: string) {
  // Missing return type
}
```

### React/Next.js

- **Use functional components** with hooks
- **Server Components by default**, use 'use client' only when needed
- **Colocate related code** (components, hooks, utils)
- **Prefer composition** over prop drilling
- **Use React Server Actions** for mutations when possible

**Example**:

```typescript
// Good: Server Component
export default async function LocationPage({ params }: { params: { id: string } }) {
  const location = await getLocation(params.id);

  return (
    <div>
      <LocationDetails location={location} />
    </div>
  );
}

// Good: Client Component (when needed)
'use client';

export function InteractiveMap({ locations }: { locations: Location[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ...
}
```

### File Naming

- **Components**: PascalCase (e.g., `LocationCard.tsx`)
- **Utilities**: camelCase (e.g., `formatCoordinates.ts`)
- **API routes**: lowercase with hyphens (e.g., `thin-pins/route.ts`)
- **Types**: PascalCase, suffix with `Type` if ambiguous (e.g., `LocationType.ts`)

### Import Order

1. External dependencies (React, Next.js, etc.)
2. Internal libraries (`@/lib`)
3. Components (`@/components`)
4. Types (`@/types`)
5. Utilities (`@/utils`)
6. Relative imports

**Example**:

```typescript
import { useState } from 'react';
import { NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/client';

import LocationCard from '@/components/LocationCard';

import { Location } from '@/types/location';

import { formatCoordinates } from '@/utils/format';

import './styles.css';
```

### CSS/Styling

- **Use Tailwind CSS** for styling
- **Avoid inline styles** unless dynamic
- **Use CSS modules** for component-specific styles
- **Follow mobile-first** approach
- **Use semantic class names**

**Example**:

```tsx
// Good
<div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// Bad (inline styles)
<div style={{ display: 'flex', padding: '16px' }}>
  <h2 style={{ fontSize: '24px' }}>Title</h2>
</div>
```

## Commit Guidelines

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Revert a previous commit

### Scopes

- `map`: Map-related changes
- `observations`: Observations feature
- `exports`: Export functionality
- `admin`: Admin dashboard
- `api`: API routes
- `db`: Database/migrations
- `ui`: UI components
- `docs`: Documentation

### Examples

```bash
feat(map): add cluster markers for dense location groups

fix(exports): correct GeoJSON coordinate order (lng, lat)

docs(deployment): add Vercel deployment instructions

refactor(api): extract common RLS helpers to shared utility

test(observations): add security tests for cross-user access
```

### Commit Body

- Explain **what** and **why**, not **how**
- Reference issues/PRs: `Fixes #123`, `Closes #456`, `Related to #789`
- Break lines at 72 characters

**Example**:

```
feat(state-packs): add nightly regeneration job

Implements pg_cron scheduled task to regenerate state packs
every night at 2 AM. This ensures users always download fresh
data without manual intervention.

Fixes #234
```

## Testing

### Test Types

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test API routes and database interactions
3. **Security Tests**: Test RLS policies and authorization

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test path/to/test.test.ts
```

### Writing Tests

**API Route Test Example**:

```typescript
import { describe, it, expect } from '@jest/globals';
import { GET } from './route';

describe('GET /api/locations/thin-pins', () => {
  it('should return locations within bounds', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/locations/thin-pins?bounds=-180,-90,180,90'
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.locations).toBeDefined();
    expect(Array.isArray(data.locations)).toBe(true);
  });
});
```

**Component Test Example**:

```typescript
import { render, screen } from '@testing-library/react';
import LocationCard from './LocationCard';

describe('LocationCard', () => {
  it('should render location name', () => {
    const location = {
      id: '1',
      name: 'Test Location',
      coordinates: [-122.4, 37.8],
    };

    render(<LocationCard location={location} />);
    expect(screen.getByText('Test Location')).toBeInTheDocument();
  });
});
```

### Test Coverage

Maintain **80%+ code coverage** for:

- API routes
- Utility functions
- Critical components

Use coverage reports to identify gaps:

```bash
pnpm test:coverage
open coverage/lcov-report/index.html
```

## Pull Request Process

### Before Submitting

1. ✅ **Sync with upstream**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. ✅ **Run all checks**:

   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

3. ✅ **Update documentation** if needed

4. ✅ **Add tests** for new functionality

5. ✅ **Squash commits** if you have many small commits

### PR Title Format

Follow the same format as commit messages:

```
feat(map): add cluster markers for dense location groups
```

### PR Description

Include:

1. **Summary**: What does this PR do?
2. **Motivation**: Why is this change needed?
3. **Changes**: What specific changes were made?
4. **Testing**: How was this tested?
5. **Screenshots**: For UI changes
6. **Checklist**: Use the template below

**Template**:

```markdown
## Summary

Brief description of changes

## Motivation

Why is this change needed?

## Changes

- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Security tests pass

## Screenshots (if applicable)

[Screenshots here]

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added and passing
- [ ] Build succeeds
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **At least one approval** required from maintainers
3. **Address feedback** promptly and professionally
4. **Keep discussions focused** on the code

### After Approval

1. **Squash and merge** (default)
2. **Delete branch** after merge
3. **Thank reviewers** for their time

## Project Structure

```
rockhounding-mvp/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages
│       │   ├── api/            # API routes
│       │   │   ├── admin/      # Admin-only routes
│       │   │   ├── exports/    # Export endpoints
│       │   │   ├── locations/  # Location endpoints
│       │   │   └── observations/ # Observation endpoints
│       │   ├── map/            # Map page
│       │   └── page.tsx        # Homepage
│       ├── components/         # React components
│       ├── lib/                # Utilities and libraries
│       │   ├── supabase/       # Supabase clients
│       │   └── utils/          # Utility functions
│       ├── public/             # Static assets
│       │   ├── icons/          # PWA icons
│       │   ├── manifest.json   # PWA manifest
│       │   └── sw.js           # Service worker
│       └── styles/             # Global styles
├── packages/                   # Shared packages (future)
├── supabase/                   # Supabase configuration
│   ├── functions/              # Edge Functions
│   │   ├── process-exports/    # Export processing
│   │   └── state-packs/        # State pack generation
│   └── migrations/             # Database migrations
├── docs/                       # Documentation
│   ├── deployment.md           # Deployment guide
│   ├── security.md             # Security model
│   ├── pwa.md                  # PWA documentation
│   └── contributing.md         # This file
└── .github/
    └── workflows/              # CI/CD workflows
        └── ci.yml              # Main CI pipeline
```

## Environment Setup

### Required Environment Variables

See [.env.example](../apps/web/.env.example) for complete list.

**Minimal setup**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your.mapbox.token

# Optional (defaults provided)
EXPORTS_BUCKET=exports
STATE_PACKS_BUCKET=state-packs
```

### Local Supabase

For local development with Supabase CLI:

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Stop local Supabase
supabase stop
```

## Pre-commit Hooks

### Setup Husky

Husky runs checks before commits to catch issues early:

```bash
# Install Husky
pnpm add -D husky

# Initialize Husky
pnpm exec husky install

# Add pre-commit hook
pnpm exec husky add .husky/pre-commit "pnpm lint-staged"
```

### Setup lint-staged

lint-staged runs linters only on staged files:

```bash
# Install lint-staged
pnpm add -D lint-staged

# Add config to package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Pre-commit Checks

Automatically run on `git commit`:

1. **ESLint**: Fix linting errors
2. **Prettier**: Format code
3. **Type check**: Verify TypeScript types
4. **Tests**: Run affected tests (optional)

**Skip hooks** (not recommended):

```bash
git commit --no-verify
```

## Common Tasks

### Adding a New API Route

1. Create file in `apps/web/app/api/your-route/route.ts`
2. Implement GET/POST/PUT/DELETE handlers
3. Add RLS checks if accessing database
4. Add tests in `your-route.test.ts`
5. Update API documentation

### Adding a New Component

1. Create file in `apps/web/components/YourComponent.tsx`
2. Use TypeScript and proper types
3. Add tests in `YourComponent.test.tsx`
4. Export from `components/index.ts` if needed

### Adding a Database Migration

1. Create migration file in `supabase/migrations/`
2. Name format: `YYYYMMDDHHMMSS_description.sql`
3. Include both `up` and `down` migrations
4. Test locally before committing

### Updating Documentation

1. Edit files in `docs/` directory
2. Use clear headings and examples
3. Include code snippets where helpful
4. Update table of contents

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Security issues**: Email security@example.com (private disclosure)
- **Feature requests**: Open a GitHub Issue with "enhancement" label

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes (for significant contributions)
- Project README (for major features)

---

Thank you for contributing to Rockhounding MVP! 🎉

# Fantasy Baseball App

A React web client for researching MLB players and building fantasy baseball lineups, backed by the external **JellyBaseballV2** ASP.NET Core API.

## Architecture

This is a **web-client-only** repository. There is no local backend. All data — auth, players, scoring, lineups, leagues, saved searches — is owned by the JellyBaseballV2 API.

```
browser
  └── React 19 SPA (this repo)
        └── Axios typed client (src/api/client.ts)
              └── JellyBaseballV2 API  (ASP.NET Core, separate repo)
                    └── PostgreSQL / MLB data
```

## Tech Stack

- **React 19** + **React Router 7** + **TanStack Query 5**
- **TypeScript 5.7** / **Vite 6** (dev server & build)
- **Axios 1.12** — typed API client with single-flight token refresh
- **`@react-aria/*`** — accessible UI primitives
- **Tailwind CSS 3**
- **Vitest 4** + **Testing Library** + **MSW** — unit & integration tests
- **`openapi-typescript`** (dev) — generates `src/api/types.generated.ts` from the API's OpenAPI spec

## Getting Started

### Prerequisites

- Node.js 20 LTS
- JellyBaseballV2 API running locally (see that repo's README for setup)

### 1. Clone and install

```bash
git clone <repository-url>
cd fantasy-baseball-app
npm install
```

### 2. Configure environment

Copy the example and set the API URL:

```bash
cp .env.development.local.example .env.development.local
# Edit VITE_API_BASE_URL to point at your local JellyBaseballV2 instance
# Default: https://localhost:7088
```

### 3. (Optional) Regenerate API types

When the JellyBaseballV2 API schema changes, regenerate the TypeScript DTOs:

```bash
npm run gen:types
```

This calls `openapi-typescript` against `$VITE_API_BASE_URL/swagger/v1/swagger.json` and writes `src/api/types.generated.ts`.

### 4. Start the dev server

```bash
npm run dev
```

The app is available at http://localhost:5173.

## Project Structure

```
src/
├── api/              # Typed API modules (one file per resource)
│   ├── client.ts     # Axios instance with auth interceptors
│   ├── auth.ts       # Auth endpoints
│   ├── players.ts
│   ├── scoringConfigs.ts
│   ├── savedSearches.ts
│   ├── leagues.ts
│   ├── teams.ts
│   ├── errors.ts     # RFC 7807 error mapper
│   ├── jsonBlobs.ts  # Opaque JSON-field helpers
│   └── tokens.ts     # In-memory access-token store
├── auth/             # AuthContext, ProtectedRoute, Login/Register pages
├── components/       # Shared UI components
├── features/         # Feature-scoped components and hooks
├── hooks/            # TanStack Query hooks (useScoringConfigs, useLineup, …)
├── pages/            # Route-level page components
└── test/             # MSW setup for tests
specs/                # Specify framework feature specs
infrastructure/       # nginx config for production serving
```

## Development Commands

```bash
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run preview       # Preview production build locally
npm run lint          # ESLint
npm test              # Run Vitest suite (watch mode)
npx vitest run        # Run tests once
npm run gen:types     # Regenerate API types from live OpenAPI spec
```

## API Client Conventions

- **All HTTP calls go through `src/api/`** — never call `axios` or `fetch` directly from components or hooks.
- Hooks in `src/hooks/` wrap the API functions with TanStack Query (`useQuery` / `useMutation`).
- Opaque JSON fields (e.g., `categoriesJson`, `filtersJson`) are decoded/encoded via `src/api/jsonBlobs.ts`.
- `SavedSearchFilters` always carries `filterVersion: 2`; the parser rejects blobs with a different version.

## Environment Variables

```env
# .env.development.local
VITE_API_BASE_URL=https://localhost:7088
```

## Running Tests

```bash
npx vitest run          # Run all tests once
npx vitest run --reporter=verbose  # Verbose output
```

Tests use MSW to intercept HTTP calls — no real API needed.

## Specifications

Feature specs live in `specs/`:
- `specs/003-jellybaseballv2-api-migration/` — current feature (API migration)
  - `spec.md` — requirements and user stories
  - `plan.md` — architecture decisions
  - `quickstart.md` — end-to-end setup and acceptance scenarios
  - `contracts/` — API contract markdown

## License

Private project — All rights reserved.

# Fantasy Baseball App

A React web client for researching MLB players and managing fantasy baseball lineups, backed by the **JellyBaseballV2** ASP.NET Core API.

## Features

| Feature | Status |
|---|---|
| User accounts (register, login, password reset, email verification) | ✅ Live |
| Player research — search, filter, sort by position / team / status | ✅ Live |
| Scoring configurations — create custom stat-weight configs | ✅ Live |
| Player score breakdown — per-player score detail against a config | ✅ Live |
| Saved searches — save and re-apply filter sets | ✅ Live |
| Lineup management | 🚧 Stub (league selector + editor coming) |

## Architecture

This is a **web-client-only** repository. There is no local backend — all data (auth, players, scoring, lineups, leagues, saved searches) is owned by the JellyBaseballV2 API.

```
Browser
  └── React 19 SPA  (this repo)
        └── Axios typed client  src/api/client.ts
              └── JellyBaseballV2 API  (ASP.NET Core, separate repo)
                    └── PostgreSQL + MLB data feed
```

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, React Router 7, Tailwind CSS 3, `@react-aria/*` |
| Data fetching | TanStack Query 5, Axios 1.12 |
| Build | Vite 6, TypeScript 5.7 |
| Testing | Vitest 4, Testing Library, MSW, vitest-axe |
| Type generation | `openapi-typescript` (dev) |

## Getting Started

### Prerequisites

- Node.js 20 LTS
- JellyBaseballV2 API running locally (see that repo's README)

### 1. Install

```bash
git clone <repository-url>
cd fantasy-baseball-app
npm install
```

### 2. Configure environment

```bash
cp .env.development.local.example .env.development.local
```

Edit `VITE_API_BASE_URL` to point at your local JellyBaseballV2 instance (default: `https://localhost:7088`).

### 3. Start the dev server

```bash
npm run dev
```

App is available at http://localhost:5173.

### 4. (Optional) Regenerate API types

When the JellyBaseballV2 OpenAPI schema changes:

```bash
npm run gen:types
```

Writes generated DTOs to `src/api/types.generated.ts`.

## Routes

| Path | Page | Auth required |
|---|---|---|
| `/login` | Sign in | — |
| `/register` | Create account | — |
| `/forgot-password` | Request password reset | — |
| `/reset-password` | Set new password (token link) | — |
| `/verify-email` | Confirm email (token link) | — |
| `/` | Home | ✅ |
| `/account` | Profile (read-only) | ✅ |
| `/scoring-configs` | List scoring configs | ✅ |
| `/scoring-configs/new` | Create scoring config | ✅ |
| `/player-research` | Search & score players | ✅ |
| `/lineups` | Lineups (placeholder) | ✅ |

## Project Structure

```
src/
├── api/              # Typed API modules — one file per resource
│   ├── client.ts     # Axios instance, single-flight token refresh, RFC 7807 errors
│   ├── auth.ts
│   ├── players.ts
│   ├── scoringConfigs.ts
│   ├── savedSearches.ts
│   ├── leagues.ts
│   ├── teams.ts
│   ├── errors.ts     # ApiError, isApiError, splitValidationDetail
│   ├── jsonBlobs.ts  # Typed helpers for opaque JSON fields
│   └── tokens.ts     # In-memory access token + localStorage refresh token
├── auth/             # AuthContext, ProtectedRoute, Login/Register pages
├── components/       # Shared UI (Header, ApiErrorNotifier)
├── features/         # Feature-scoped components (player research, saved searches)
├── hooks/            # TanStack Query hooks per resource
│   ├── useScoringConfigs.ts
│   ├── useSavedSearches.ts
│   └── useLineup.ts
├── pages/            # Route-level page components
└── test/             # MSW server setup
```

## Development Commands

```bash
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # ESLint
npm test              # Vitest in watch mode
npx vitest run        # Run tests once (181 tests, 24 files)
npm run gen:types     # Regenerate DTOs from live OpenAPI spec
```

## Conventions

- **All HTTP calls go through `src/api/`** — no direct `axios`/`fetch` in components or hooks.
- Hooks in `src/hooks/` wrap API functions with TanStack Query (`useQuery` / `useMutation`).
- Opaque JSON fields (`categoriesJson`, `filtersJson`) are encoded/decoded via `src/api/jsonBlobs.ts`.
- `SavedSearchFilters` always carries `filterVersion: 2`; the parser rejects blobs with a different version.
- Tests use MSW to intercept HTTP — no real API required.

## Known Gaps

See [`specs/003-jellybaseballv2-api-migration/KNOWN-GAPS.md`](specs/003-jellybaseballv2-api-migration/KNOWN-GAPS.md) for a full audit of API capabilities vs. current UI coverage.

## License

Private project — All rights reserved.

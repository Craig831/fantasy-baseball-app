# Implementation Plan: JellyBaseballV2 API Migration

**Branch**: `003-jellybaseballv2-api-migration` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-jellybaseballv2-api-migration/spec.md`

## Summary

Replace the local NestJS+Prisma+Postgres backend with a typed client against the external JellyBaseballV2 ASP.NET Core API. The web app in `` becomes the only application code in this repository. Auth (register/login/refresh/logout) is delegated to the API via JWT, with access tokens held in memory and refresh tokens in `localStorage`; an Axios response interceptor performs single-flight refresh-and-retry on `401`. TypeScript DTOs are generated from the API's OpenAPI spec (`/swagger/v1/swagger.json`) and consumed through a thin client layer organized by feature area. Five opaque JSON-string fields on the API are parsed and serialized at the boundary using documented shapes. Server state is cached with TanStack Query (already a dependency). The `backend/`, Prisma artifacts, Postgres service in container orchestration, and related infrastructure are removed entirely.

## Technical Context

**Language/Version**: TypeScript 5.7 / Node.js 20 LTS (build & dev tooling only; runtime is the browser)
**Primary Dependencies**: React 19, React Router 7, TanStack Query 5, Axios 1.12, `@react-aria/*`, Tailwind 3, Vite 6. New: `openapi-typescript` (dev), `jwt-decode` (runtime)
**Storage**: Browser only — access token in module-scoped memory, refresh token in `localStorage`. No application database in this repository.
**Testing**: Vitest 4 + Testing Library + jsdom for unit and component tests. MSW (Mock Service Worker) for HTTP mocks at the typed-client boundary; introduce as a new dev dependency.
**Target Platform**: Modern evergreen browsers (last two versions of Chrome, Firefox, Safari, Edge). Mobile-first per constitution.
**Project Type**: Web frontend only (single project at ``).
**Performance Goals**: Cache reads aggressively via TanStack Query so repeated player-research interactions hit memory rather than the network. Initial app shell time-to-interactive within current Vite-dev baseline. No regression-comparison against the legacy backend is performed — that backend is being deleted in this branch.
**Constraints**: API unreachable on startup must surface a clear error within 5 seconds (FR-012). Refresh-token rotation must be single-flight across concurrent requests and across browser tabs. Mobile-first responsive UI. WCAG-conformant input flows (continue using `@react-aria/*`).
**Scale/Scope**: ~40 DTOs across auth, leagues, members, invitations, draft, teams, rosters, lineups, players, scoring-configs, saved-searches, waivers, trades. Single-tenant fantasy app.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Guiding Questions (from constitution)

1. **Does this feature respect user privacy and data security?**
   Yes. The application stores only the credentials required for an authenticated session. Access tokens live in memory (cleared on reload). Refresh tokens live in `localStorage` — an acknowledged tradeoff per the API's published guidance, mitigated by short access-token lifetime, refresh-token rotation, and revocation on logout. No application data is persisted client-side beyond what TanStack Query caches in memory. **One open consideration:** the constitution requires MFA as an "industry-standard, secure method." The external API does not currently expose MFA endpoints — this is documented as a known gap and tracked outside this branch. See [Complexity Tracking](#complexity-tracking).

2. **Is this design accessible to all users, including those with disabilities?**
   Yes. Existing app stack (`@react-aria/*`) already provides accessible primitives. New screens introduced by this branch (login, register) will reuse those primitives, with labelled inputs, visible focus states, and keyboard-only flows. Error messaging from RFC 7807 responses is rendered as text near the offending field rather than via icon alone.

3. **Will this implementation perform well on both web and mobile clients?**
   Web only in this branch; the constitution's "cross-platform" principle is satisfied by mobile-first responsive design. TanStack Query reduces round trips. Polling fallbacks for the API's known real-time gap are gated to active views and stop on unmount.

4. **How does this feature contribute to a simple and intuitive user experience?**
   Eliminating the local backend removes a class of "is the local DB up?" failures. Centralizing data access in a single typed client makes errors and loading states consistent across the app. Validation errors are surfaced inline using parsed `detail` strings.

5. **Can this feature scale with a growing user base?**
   Scale is now the API's responsibility. The web client adds caching (TanStack Query) and minimizes redundant requests; nothing here bottlenecks scale.

### Quality Gate

- API-first development: ✅ Already API-first; now consuming an external, well-documented API with a published OpenAPI schema.
- Performance: ✅ Player-research baseline preserved by aggressive client caching and identical UI.
- Scalable architecture: ✅ Stateless web client.
- Cross-platform: ✅ Mobile-first responsive design preserved.
- User accounts as core identity: ✅ All authenticated flows tied to API identity.
- Secure by default: ✅ JWT bearer + rotation; no inline HTML; no SQL.
- Auditable: ✅ Audit logging is the API's responsibility; out of scope here.

**Result**: PASS, with one tracked deviation (MFA) documented in Complexity Tracking.

### Post-Design Re-check (after Phase 1)

After producing `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`, re-evaluating the same gates:

- API-first development: ✅ Reinforced — `src/api/` is the single boundary; every other module consumes it via TanStack Query.
- Performance: ✅ TanStack Query caching design preserves player-research baseline; polling intervals are bounded and gated to active views.
- Scalable architecture: ✅ No regressions — client is fully stateless aside from cached server state and tokens.
- Cross-platform / mobile-first: ✅ No new UI primitives that would compromise responsive layout; auth screens reuse existing accessible primitives.
- Secure by default: ✅ Single-flight refresh and storage-event cross-tab sync close the obvious refresh races; logout body required to revoke server-side.
- User accounts as core identity: ✅ All authenticated calls attach Bearer tokens; protected routes gate the UI.
- Auditable: ✅ Out of scope here, owned by the API.

**No new deviations introduced by Phase 1.** The two tracked deviations (MFA gap, refresh token in `localStorage`) remain the only constitution gaps and are unchanged from pre-research.

## Project Structure

### Documentation (this feature)

```text
specs/003-jellybaseballv2-api-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── README.md
│   ├── auth.md
│   ├── players.md
│   ├── leagues.md
│   ├── scoring-configs.md
│   ├── lineups.md
│   └── saved-searches.md
└── checklists/
    └── requirements.md  # From /speckit.specify
```

### Source Code (repository root)

```text

├── src/
│   ├── api/                          # NEW
│   │   ├── client.ts                 # Axios instance, interceptors, single-flight refresh
│   │   ├── tokens.ts                 # In-memory access token + localStorage refresh token + cross-tab sync
│   │   ├── errors.ts                 # ApiError type, isApiError, RFC 7807 mapping
│   │   ├── jsonBlobs.ts              # parse/stringify helpers for the five opaque fields
│   │   ├── types.generated.ts        # openapi-typescript output (committed)
│   │   ├── auth.ts                   # register/login/refresh/logout calls
│   │   ├── players.ts                # players + filters endpoints
│   │   ├── leagues.ts                # leagues + members + invitations + draft
│   │   ├── teams.ts                  # team rosters and lineups (per league)
│   │   ├── scoringConfigs.ts         # personal scoring configs
│   │   └── savedSearches.ts          # saved player searches
│   │   # Trades, trading block, waiver claims, and FAAB bids are out of scope
│   │   # for this branch. Free-agent *add* is in scope and lives on teams.ts.
│   ├── auth/                         # NEW
│   │   ├── AuthContext.tsx           # Provides current user, signIn, signOut, register
│   │   ├── ProtectedRoute.tsx        # Route gate that redirects unauthenticated users
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── components/                   # existing
│   ├── features/                     # existing (player-research)
│   ├── hooks/                        # existing
│   ├── pages/                        # existing (HomePage, Lineups, ScoringConfigs, PlayerResearch, Account)
│   ├── services/                     # existing — to be deleted or merged into src/api/
│   ├── styles/
│   ├── types/                        # existing — keep app-specific view types only
│   ├── utils/
│   ├── App.tsx
│   └── index.tsx
└── (no other top-level frontend changes)

# Removed in this branch (US4):
# backend/                            (entire NestJS app)
# backend/prisma/                     (schema + migrations)
# backend/prisma/migrations/20260421195202_add_teams_and_fix_players/  (untracked leftover)
# infrastructure/                     (anything that provisioned Postgres or the backend service)
# docker-compose.yml                  (rewritten to start only the web client, OR removed if not needed)
# DOCKER.md                           (rewritten or deleted; refer to JellyBaseballV2 docs)
```

**Structure Decision**: The repository becomes a single-project web client at the repo root. A new `src/api/` module is the only place that talks to the external API; all hooks and components consume it via TanStack Query. A new `src/auth/` module owns sign-in flows and route protection. The legacy `src/services/` content is migrated into `src/api/` and deleted. The former `frontend/` subdirectory has been relocated to the repo root (done as part of this branch).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| MFA not implemented | The constitution requires "industry-standard, secure methods, including multi-factor authentication." The external API does not currently expose MFA endpoints; only single-factor email/password is supported. | Building MFA in the web client without server support is impossible. Mitigation: short access-token lifetime, refresh rotation, server-side revocation on logout, and a follow-up to track an API-side MFA capability. |
| Refresh token in `localStorage` | The API returns tokens in the response body and does not set httpOnly cookies. Memory storage cannot survive a page reload, which is required for the user not to be re-prompted on every refresh. | `httpOnly` cookies would be ideal but are not offered by the API. Mitigation: short access-token lifetime, refresh-token rotation on every refresh, server-side revocation on logout, single-flight refresh to prevent races, immediate clear on refresh failure. |

# Research: JellyBaseballV2 API Migration

**Feature**: 003-jellybaseballv2-api-migration
**Date**: 2026-05-07
**Status**: Phase 0 complete

This document resolves the unknowns that surfaced from the spec and the Technical Context in `plan.md`. Every decision is backed by either the API documentation at `/mnt/c/Users/craig/source/repos/JellyBaseballV2/docs/web-client/` or the existing dependencies already in `frontend/package.json`.

---

## 1. Token storage strategy

**Decision**: Access token in module-scoped memory inside `src/api/tokens.ts`. Refresh token in `localStorage` under key `jb2:refreshToken`. On app boot, hydrate the in-memory access token by calling the refresh endpoint with the persisted refresh token; if that fails, treat the user as signed out.

**Rationale**: AUTH.md is explicit — the API returns tokens in the response body, not as `httpOnly` cookies. With cookies off the table, the only durable client storage is `localStorage`/`sessionStorage`. The access token is short-lived (15 minutes) and can stay in memory; the refresh token is long-lived (30 days) and must survive page reload, so it goes to `localStorage`. AUTH.md explicitly recommends this split.

**Alternatives considered**:
- *`localStorage` for both*: Simpler, but exposes the access token to XSS for the entire 15 minutes between refreshes. Rejected.
- *`sessionStorage` for refresh token*: Lost on tab close, forcing re-login after every browser restart. Rejected.
- *`httpOnly` cookies*: Ideal but not supported by the API. Out of scope for this branch (would require an API change).
- *Service worker–held tokens*: Adds complexity and a same-origin SW deployment. Rejected for this scope.

---

## 2. Single-flight refresh and cross-tab coordination

**Decision**: When any request returns `401`, the response interceptor checks a module-level `Promise<AuthTokens> | null` named `inFlightRefresh`. If null, it sets the promise and calls `POST /api/auth/refresh`; if non-null, it awaits the existing promise. On resolution, all queued requests retry with the new access token. Across tabs, listen on `window.addEventListener('storage', ...)` for changes to `jb2:refreshToken`; when another tab rotates the token, update the in-memory access token by calling refresh once locally.

**Rationale**: The Axios interceptor pattern in AUTH.md handles the per-tab race trivially. Cross-tab coordination is harder: each tab has its own in-memory access token, so a refresh in tab A must invalidate tab B's stale access token. The `storage` event fires in *other* tabs when `localStorage` is written, giving us a free signal. We don't need `BroadcastChannel`; the `storage` event is sufficient and supported in all targeted browsers.

**Alternatives considered**:
- *`BroadcastChannel` API*: More explicit, slightly cleaner semantics, but the `storage` event already gives us what we need. Defer.
- *Web Locks API*: Real mutex, supported in modern browsers, but overkill — the worst case of two tabs racing is one extra refresh call, which is harmless because refresh tokens rotate on every refresh and the API accepts the most recent token.
- *Per-tab independent refresh with no coordination*: Causes one user to see stale data after a refresh in another tab, eventually self-correcting on next 401. Rejected for predictability.

---

## 3. TypeScript DTO generation

**Decision**: Use `openapi-typescript` (dev dependency in `frontend/`). Generated file is committed at `frontend/src/api/types.generated.ts`. Regenerate by running `npx openapi-typescript http://localhost:5000/swagger/v1/swagger.json --output src/api/types.generated.ts` from `frontend/` while the API is running. Add an npm script `gen:types` to make this discoverable.

**Rationale**: KNOWN-GAPS.md explicitly recommends `openapi-typescript` and provides the exact command. The package outputs a single self-contained `.d.ts`-style file with `paths` and `components.schemas`. We import generated types as `components['schemas']['SomeDto']` or alias them in our hand-written client modules.

**Alternatives considered**:
- *`openapi-fetch` (companion library)*: Auto-generates a typed client. Considered, but we have specific needs (the interceptor, RFC 7807 handling, JSON-blob parsing) that are easier to layer on top of Axios. Rejected for now.
- *Hand-written types*: ~40 DTOs with frequent change is too much manual maintenance. Rejected.
- *NSwag, openapi-codegen, swagger-typescript-api*: Heavier, generate full clients we don't need. Rejected.

---

## 4. HTTP client and server-state management

**Decision**: Continue using **Axios** (already a dependency) for the underlying HTTP layer. Continue using **TanStack Query 5** (already installed) for server-state caching, deduplication, and refetching. Wrap each API endpoint in a thin function returning `Promise<T>`, then expose a TanStack Query hook per resource (e.g., `usePlayer(id)`, `useUpdateLineup()`).

**Rationale**: Both libraries are already in `frontend/package.json` but TanStack Query is not yet wired up across the app. Using both is a low-friction path: Axios handles interceptors and base config; TanStack Query handles caching, polling intervals (for the API's known real-time gap), and optimistic updates.

**Alternatives considered**:
- *`fetch` directly*: Loses the interceptor pattern; would need a custom wrapper that re-implements what Axios provides.
- *SWR*: Comparable to TanStack Query but already-installed wins.
- *Redux Toolkit Query*: Heavier; brings Redux even where unneeded.

---

## 5. RFC 7807 error mapping

**Decision**: Define `ApiError = { title: string; detail: string; status: number }` and an `isApiError` type guard in `src/api/errors.ts`. The Axios response error interceptor parses `error.response?.data` (which is `application/problem+json`) and rejects with an `ApiError` shape. Validation errors (status 400, title `"Validation Error"`) include a helper `splitValidationDetail(err)` that splits on `'; '` and returns an array of human-readable strings for inline display.

**Rationale**: ERRORS.md documents the exact shape and the semicolon-delimited validation pattern. Centralizing the mapping at the interceptor means every consuming component sees the same error shape.

**Alternatives considered**:
- *Pass the raw Axios error through*: Forces every component to know about `error.response?.data?.detail`. Rejected.
- *Per-field error parsing in the interceptor*: ERRORS.md explicitly says per-field maps are not supported — we'd be inventing a fragile parser. Provide the helper but make per-field resolution opt-in at the call site.

---

## 6. Opaque JSON-string field handling

**Decision**: Implement `parseJsonBlob<T>(raw)` and `stringifyJsonBlob<T>(value)` in `src/api/jsonBlobs.ts`, exactly per JSON-BLOBS.md. Define TypeScript interfaces for the five known shapes (`PositionSlot`, `StatCategoryWeight`, `DraftOrderEntry`, `LineupCategory`, `SavedSearchFilters`) in the same file. Empty defaults (`"{}"` and `"[]"`) parse to `null` so consumers can distinguish "not yet configured" from "configured as empty."

**Rationale**: JSON-BLOBS.md documents the recommended shapes and provides reference helpers. Treating `"{}"`/`"[]"` as null is the cleanest way to drive the "no config yet — show default UI" branch in setup screens.

**Validation note**: `FiltersJson` requires `"filterVersion": 2` exactly. The serializer must always set this; the parser must validate and reject otherwise so a buggy round-trip doesn't silently produce a 400 on save.

---

## 7. Polling strategy for the API's real-time gap

**Decision**: Use TanStack Query's `refetchInterval` per the table in KNOWN-GAPS.md — 5 s for an in-progress draft, 30 s for trades, 60 s for waivers. Polling is gated to `enabled` only on the relevant view; navigating away cancels it via component unmount.

**Rationale**: KNOWN-GAPS.md prescribes the intervals. TanStack Query's `refetchInterval` is the idiomatic mechanism and respects `enabled` flags out of the box.

**Alternatives considered**:
- *Custom `setInterval` with `useEffect`*: Reinvents what TanStack Query already does and risks leaking timers.
- *SignalR / SSE*: Not exposed by the API. Out of scope.

---

## 8. Configuration

**Decision**: Single env var `VITE_API_BASE_URL`, defaulting to `http://localhost:5000` for development. Read once into `src/api/client.ts`. The existing `services/api.ts` reads `VITE_API_URL` — that variable is renamed and consolidated.

**Rationale**: KNOWN-GAPS.md uses `VITE_API_BASE_URL` for the avatar URL example, which is the asset origin and identical to the API origin in this design. Standardizing on one name avoids confusion. CORS on the API defaults to `http://localhost:5173` (Vite default), which matches our dev setup.

---

## 9. Mobile-first UI primitives for new screens

**Decision**: Login, register, and any 401-recovery toast use existing `@react-aria/*` primitives plus Tailwind. No new UI library.

**Rationale**: Constitution requires WCAG conformance and a consistent design system. Existing components already meet this bar.

---

## 10. Testing approach

**Decision**: Three layers.
- *Unit*: Token store, interceptor refresh logic, JSON-blob helpers, error mapper. Vitest, no DOM needed.
- *Component*: Auth flows, protected route gate, error rendering. Testing Library + jsdom + MSW for HTTP fakes.
- *Integration (live API, manual)*: Quickstart scenarios run against a locally running JellyBaseballV2.

**Rationale**: MSW intercepts at the network layer, which is exactly where our typed client sits — no special test plumbing needed in the app code. Live integration is gated to manual quickstart runs because we don't run the .NET API in CI on this branch.

**New dev dependency**: `msw`.

---

## 11. Backend deletion plan

**Decision**: After all P1–P3 stories pass, US4 deletes:
- `backend/` directory (entire NestJS app, Prisma schema, migrations, generated client, tests, Dockerfile)
- `docker-compose.yml` rewritten to remove the Postgres and backend services; if the file then has nothing meaningful, delete it
- `DOCKER.md` rewritten to point developers at the JellyBaseballV2 README, or deleted
- `infrastructure/` audited and pruned of any backend/Postgres provisioning
- The unstaged leftover migration `backend/prisma/migrations/20260421195202_add_teams_and_fix_players/` (currently untracked)
- Top-level package scripts that referenced the backend
- `CLAUDE.md` "Active Technologies" section updated (remove NestJS, Prisma, MLB-StatsAPI, Postgres entries; the API now owns those)

**Rationale**: FR-007/008/009 are explicit and SC-003 measures the result. Doing the deletion as a final story protects against accidentally breaking development on the new client during the migration.

**Risk mitigation**: Run a final repo-wide grep for `prisma`, `nest`, `pg`, `postgres`, `@nestjs`, `5432` after the delete to catch leftovers before merge.

---

## 12. Out-of-scope technologies (explicitly removed)

These are in the project's `CLAUDE.md` "Active Technologies" today and become obsolete:
- NestJS 11
- Prisma ORM 6
- PostgreSQL 15+
- MLB-StatsAPI (the API owns ingestion now)
- Jest backend tests

Frontend testing remains Vitest.

---

## Open questions resolved by this document

| From spec / plan | Resolved here |
|---|---|
| How to coordinate refresh across tabs | §2 |
| Whether to keep Axios or move to fetch | §4 |
| How to organize generated types in the repo | §3 |
| How to surface validation errors | §5 |
| What to do with `{}` / `[]` defaults | §6 |
| Polling cadence | §7 |
| Env var naming | §8 |
| Where MFA fits | Plan §Constitution Check (deferred — API gap) |
| What to delete and when | §11 |

No `[NEEDS CLARIFICATION]` remain.

# Quickstart: JellyBaseballV2 API Migration

**Feature**: 003-jellybaseballv2-api-migration
**Date**: 2026-05-07

This document is the step-by-step path for a developer to run the web client end-to-end against the JellyBaseballV2 API on a fresh checkout. Each step maps to verifiable acceptance scenarios from `spec.md`.

---

## Prerequisites

- Node.js 20 LTS and npm.
- Git.
- The JellyBaseballV2 .NET API checked out at `../JellyBaseballV2` (sibling directory).
- .NET SDK (per JellyBaseballV2 README).

---

## 1. Start the API

```bash
cd ../JellyBaseballV2
# Build and run per the API's own README.
# Default address used by this client: http://localhost:5000
```

Confirm the API is up:

```bash
curl -s http://localhost:5000/swagger/v1/swagger.json | head -c 200
```

Expected: a JSON body starting with `{"openapi":...`.

---

## 2. Configure the web client

In `frontend/`, create `.env.development.local` (gitignored):

```env
VITE_API_BASE_URL=http://localhost:5000
```

Confirm the API's CORS allowlist includes the dev server origin (`http://localhost:5173` by default — Vite's standard port). Adjust the API's `Cors:AllowedOrigins` if the web client is served from a different origin.

---

## 3. Generate types

From `frontend/`:

```bash
npm install
npx openapi-typescript http://localhost:5000/swagger/v1/swagger.json --output src/api/types.generated.ts
```

After this branch lands, the generation is wrapped in:

```bash
npm run gen:types
```

The generated file is committed; regenerate any time the API contract changes.

---

## 4. Run the web client

```bash
npm start            # vite dev server on http://localhost:5173
```

Open `http://localhost:5173`. With no session, the app routes you to the login screen.

---

## 5. Verify US1 — Authentication

1. Click **Register**, submit `dev@example.com` / `Passw0rd` / first + last name. → You are signed in and routed to the home page. *(Maps to US1 acceptance #1.)*
2. Open DevTools → Application → Local Storage. → A `jb2:refreshToken` entry exists.
3. Open DevTools → Network. Wait ~16 minutes (or shorten access-token lifetime in API config) and trigger a protected request (e.g., reload player research). → A single `POST /api/auth/refresh` is followed by the original request retrying. No re-prompt. *(US1 acceptance #2.)*
4. Reload the page hard. → Session is restored without re-login. *(US1 acceptance #3.)*
5. Click **Log out**. Try to access a protected page. → Routed to login. *(US1 acceptance #4.)*
6. Manually edit `jb2:refreshToken` in localStorage to garbage and trigger a request. → All tokens cleared, routed to login with a clear message. *(US1 acceptance #5.)*

---

## 6. Verify US2 — Player research

1. Sign in. Navigate to **Player Research**.
2. Search for a name, filter by position, sort by JellyScore. → Results match filter; data is populated. *(US2 acceptance #1, #2.)*
3. Open a player detail. → Profile and game stats render; news section is omitted (NoOp service per known gap).
4. In DevTools → Network, confirm: zero requests to `localhost:3000` (old backend); all requests go to `${VITE_API_BASE_URL}`.
5. Stop the API (`Ctrl+C` in its terminal). Try a search. → A clear "API unreachable" message within 5 seconds. *(US2 acceptance #4 + edge case + SC-005.)*

---

## 7. Verify US3 — Personal data writes

1. With the API running, navigate to **Scoring Configs**. Create a new config with a few category weights. → Save succeeds; config appears in the list.
2. Sign out, sign back in. → Config still present and unchanged. *(US3 acceptance #1.)*
3. Open a league and set a weekly lineup slot. Sign out and back in. → Lineup persists. *(US3 acceptance #2.)*
4. Save a player-search filter. → Persists across sign-out/in. *(US3 acceptance #3.)* Confirm the saved object's `filtersJson` includes `"filterVersion": 2`.
5. Try to create a saved search with an empty name. → API returns 400 with semicolon-delimited `detail`; UI surfaces each error inline. *(US3 acceptance #4.)*

---

## 8. Verify US4 — Repo cleanup

After the deletion task lands:

```bash
# from repo root
[ ! -d backend ]                                  && echo OK: no backend
grep -r "@nestjs" --include="*.json" || echo "OK: no NestJS deps"
grep -r "prisma"  --include="*.json" || echo "OK: no Prisma deps"
grep -r "5432"    --exclude-dir=node_modules || echo "OK: no Postgres port"
grep -r "postgres" docker-compose.yml 2>/dev/null && echo "FAIL" || echo "OK: no postgres service"
ls infrastructure/ 2>/dev/null
```

All checks should pass. The web client should still run end-to-end with **only** the JellyBaseballV2 API as a local dependency.

---

## 9. Run the test suite

From `frontend/`:

```bash
npm test                # vitest run
npm run test:coverage   # with coverage
```

Tests covered by this branch:
- `src/api/tokens.test.ts` — in-memory access token + localStorage refresh + cross-tab sync
- `src/api/client.test.ts` — interceptor: single-flight refresh, retry once, clear-and-route on second 401
- `src/api/errors.test.ts` — RFC 7807 mapping + validation splitter
- `src/api/jsonBlobs.test.ts` — five-field round-trip, `filterVersion: 2` enforcement, `{}`/`[]` → null
- `src/auth/AuthContext.test.tsx` — register / login / logout flows
- `src/auth/ProtectedRoute.test.tsx` — redirect when unauthenticated
- Existing player-research tests, updated to mock the typed client at the network layer with MSW

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| CORS error on every request | API's `Cors:AllowedOrigins` does not include `http://localhost:5173` | Add it to `appsettings.Development.json` |
| Infinite 401 loop | Refresh token revoked or expired | Clear `jb2:refreshToken` in localStorage and re-login |
| `cannot find module '/.../types.generated.ts'` | Type generation step skipped | `npm run gen:types` (or the full `npx` command) |
| Saved search returns 400 with "filterVersion: 2" message | Old saved-search rows missing the field, or serializer broken | Confirm `stringifyJsonBlob` always sets `filterVersion: 2` |
| Inning counts look like 18, 20 | Displaying raw `inningsPitched` | Format with `formatInnings(outs)` — divide by 3 |
| Avatar broken image | `avatarUrl` is root-relative | Prefix with `${VITE_API_BASE_URL}` |

---

## 11. What's next

After this branch:
- `/speckit.tasks` to generate the dependency-ordered implementation task list.
- `/speckit.implement` to execute it.
- A follow-up branch for MFA support once the API exposes endpoints.
- A follow-up branch for real-time updates (SignalR / SSE) once the API exposes them.

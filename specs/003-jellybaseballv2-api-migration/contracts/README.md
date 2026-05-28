# API Contracts

The web client consumes the JellyBaseballV2 ASP.NET Core API. The authoritative contract is the API's OpenAPI document at `http://localhost:5000/swagger/v1/swagger.json`. The TypeScript projection of that document is generated into `src/api/types.generated.ts` via `openapi-typescript` and is the canonical source of shapes for client code.

The files in this directory document **the subset of the API the web client depends on for this branch**, organized by feature area. Each file lists:

- The endpoints called by the client.
- The DTOs (by name) referenced as request and response bodies.
- Notable behaviors, gaps, and workarounds (cross-referenced to the docs at `JellyBaseballV2/docs/web-client/`).

These files are *consumer-side dependency declarations*, not API definitions. If the API changes, regenerate `types.generated.ts` and update the relevant file(s) here to reflect added or removed dependencies.

## Index

| File | Owns | User stories |
|---|---|---|
| `auth.md` | Register, login, refresh, logout, current user | US1 |
| `players.md` | Player search, detail, filters, score breakdown | US2 |
| `leagues.md` | Leagues, members, invitations, settings, draft control | US2/US3 |
| `scoring-configs.md` | Personal scoring configurations | US3 |
| `lineups.md` | Team dashboards, rosters, weekly lineups | US3 |
| `saved-searches.md` | Saved player-search filters | US3 |

## Conventions

- All endpoints are rooted at `${VITE_API_BASE_URL}` (default `http://localhost:5000`).
- All authenticated endpoints expect `Authorization: Bearer ${accessToken}`.
- All requests with bodies use `Content-Type: application/json`.
- All errors use `application/problem+json` per RFC 7807; see `errors.ts` and `ApiError`.
- Enums are sent and received as **string** names (e.g., `"FreeAgent"`), not integers.

## Out of scope (not consumed)

These exist in the API but the web client does not call them on this branch:

- `POST /api/leagues/{id}/draft/pick` — does not exist (KNOWN-GAPS.md).
- Real-time / websocket / SSE endpoints — none exist.
- Email-only invitation send — no-op service; share-link UI only.
- Player news — no-op service; news section omitted from UI.
- Admin endpoints — not exposed.

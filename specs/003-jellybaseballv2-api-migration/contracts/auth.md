# Auth Contract

**User Story**: US1 — Authenticated Sessions Against the External API
**Source**: `JellyBaseballV2/docs/web-client/AUTH.md`

## Endpoints

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account, return tokens |
| `POST` | `/api/auth/login` | No | Authenticate, return tokens |
| `POST` | `/api/auth/refresh` | No | Rotate tokens; both old tokens invalidated |
| `POST` | `/api/auth/logout` | Yes (Bearer) | Revoke refresh token; body required |
| `GET` | `/api/users/me` | Yes | Current user profile (`UserProfileDto`) |

## Request and response shapes

All shapes are imported from `types.generated.ts`:

- **Register**: `RegisterRequest` → `AuthResponse`
- **Login**: `LoginRequest` → `AuthResponse`
- **Refresh**: `RefreshRequest` → `AuthResponse`
- **Logout**: `LogoutRequest` (body `{ refreshToken }`) → 204 No Content
- **Current user**: () → `UserProfileDto`

`AuthResponse = { accessToken: string; refreshToken: string; expiresIn: number }`

## Token lifetimes (from AUTH.md)

| Token | Lifetime |
|---|---|
| Access token (JWT) | 15 minutes |
| Refresh token (opaque) | 30 days |

## JWT claims (from AUTH.md)

```ts
interface JwtPayload {
  sub: string;             // userId (GUID)
  email: string;
  role: string | string[]; // "User" | "Admin"
  exp: number;             // Unix timestamp
  jti: string;             // Token ID
}
```

## Client-side validation rules

- `email`: must be a valid email format (HTML5 input validation is sufficient at the boundary; the API is authoritative).
- `password`: minimum 8 characters and at least one digit (mirrored from API per AUTH.md).

## Behaviors

- **Refresh rotation**: Both the access token *and* the refresh token are replaced on every successful refresh. The client must persist the new refresh token immediately and discard the old one.
- **Single-flight refresh**: When a 401 triggers refresh, all concurrent failed requests await the same in-flight refresh promise and retry once. See `client.ts` interceptor.
- **Cross-tab sync**: A `storage`-event listener on `jb2:refreshToken` keeps the in-memory access token current across tabs.
- **Logout body**: The `POST /api/auth/logout` body **must** include `{ refreshToken }`. Header-only logout will not revoke the refresh token server-side.

## Error mapping

| Status | Title | Client behavior |
|---|---|---|
| 400 | `Validation Error` | Surface field-level errors by splitting `detail` on `'; '`. |
| 401 | `Unauthorized` | Trigger silent refresh once; on second failure, clear tokens and route to `/login`. |
| 500 | `Internal Server Error` | Generic toast; do not surface `detail`. |

## Out of scope

- MFA — API does not expose endpoints (constitution deviation tracked in `plan.md`).
- Password reset — not yet documented in the API.
- OAuth / SSO — not exposed.

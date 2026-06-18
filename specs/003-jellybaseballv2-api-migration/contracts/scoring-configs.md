# Scoring Configs Contract

**User Story**: US3 — User-Owned Data Persists via the External API
**Source**: `JellyBaseballV2/docs/web-client/JSON-BLOBS.md` §4

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/scoring-configs` | Yes | List the current user's personal scoring configs |
| `POST` | `/api/scoring-configs` | Yes | Create one |
| `GET` | `/api/scoring-configs/{id}` | Yes | Detail |

## Notable shapes

- **`ScoringConfigDto`** carries `categoriesJson` — opaque JSON string of `[{ statKey, pointValue }, ...]`.

## Behaviors

- These configs are **personal** to the user and **independent** of league scoring. They feed the personal lineup builder. UI must label them clearly to avoid confusion with `ScoringSettings.StatCategoriesJson`.
- `categoriesJson` is always non-empty on create; client should require at least one category.

## Error mapping

| Status | Cause |
|---|---|
| 400 | `categoriesJson` not valid JSON, or other validation |
| 401 | Auth required |
| 404 | Config not owned by current user |

## Out of scope

- Sharing or duplicating configs across users.
- Update/delete endpoints (no `PUT`/`DELETE` exposed today). The UI surfaces "create new" instead of "edit" until those exist.

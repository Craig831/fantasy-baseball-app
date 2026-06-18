# Saved Searches Contract

**User Story**: US3 — User-Owned Data Persists via the External API
**Source**: `JellyBaseballV2/docs/web-client/JSON-BLOBS.md` §5

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/saved-searches` | Yes | List current user's saved searches |
| `POST` | `/api/saved-searches` | Yes | Create one |

## Notable shapes

- **`SavedSearchDto`** carries `filtersJson` — opaque JSON string with mandatory `"filterVersion": 2`.

## Validation rule (mirrored client-side)

`filtersJson` MUST contain `"filterVersion": 2`. Any other value (or missing field) returns:

```json
{ "title": "Validation Error", "detail": "FiltersJson must contain filterVersion: 2", "status": 400 }
```

`stringifyJsonBlob` for saved searches always sets `filterVersion: 2`. The parser validates and rejects anything else.

## Recommended `SavedSearchFilters` shape

```ts
interface SavedSearchFilters {
  filterVersion: 2;
  nameQuery: string | null;
  positionId: number | null;
  mlbTeamId: number | null;
  statusCode: string | null;
  availability: 'All' | 'FreeAgent' | 'Owned' | null;
}
```

## Error mapping

| Status | Cause |
|---|---|
| 400 | Missing `filterVersion: 2`, invalid JSON, or empty name |
| 401 | Auth required |

## Out of scope

- Update / delete (no `PUT`/`DELETE` exposed today). UI offers "create new" until those exist.
- Sharing saved searches across users.

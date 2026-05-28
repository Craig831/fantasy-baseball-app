/**
 * Parse/stringify helpers for the API's five opaque JSON-string fields:
 *   positionSlotsJson, statCategoriesJson, draftOrderJson, categoriesJson, filtersJson
 *
 * Empty defaults ("{}" and "[]") parse to `null` so consumers can distinguish
 * "not yet configured" from "configured as empty."
 *
 * filtersJson must always include `filterVersion: 2` — the API returns 400
 * otherwise. The serializer always sets it; the parser rejects on mismatch.
 */

export interface PositionSlot {
  positionCode: string;
  slots: number;
}

export interface StatCategoryWeight {
  statKey: string;
  pointValue: number;
}

export type DraftOrder = number[];

export interface LineupCategory {
  statKey: string;
  pointValue: number;
}

export interface SavedSearchFilters {
  filterVersion: 2;
  nameQuery: string | null;
  positionId: number | null;
  mlbTeamId: number | null;
  statusCode: string | null;
  availability: 'All' | 'FreeAgent' | 'Owned' | null;
}

export const SAVED_SEARCH_FILTER_VERSION = 2 as const;

export function parseJsonBlob<T>(raw: string | null | undefined): T | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '{}' || trimmed === '[]') return null;
  return JSON.parse(trimmed) as T;
}

export function stringifyJsonBlob<T>(value: T | null | undefined): string {
  if (value == null) return '{}';
  return JSON.stringify(value);
}

export function parseSavedSearchFilters(
  raw: string | null | undefined,
): SavedSearchFilters | null {
  const parsed = parseJsonBlob<Partial<SavedSearchFilters>>(raw);
  if (parsed == null) return null;
  if (parsed.filterVersion !== SAVED_SEARCH_FILTER_VERSION) {
    throw new Error(
      `SavedSearch filter version mismatch: expected ${SAVED_SEARCH_FILTER_VERSION}, got ${String(parsed.filterVersion)}`,
    );
  }
  return parsed as SavedSearchFilters;
}

export function stringifySavedSearchFilters(
  value: Omit<SavedSearchFilters, 'filterVersion'> & { filterVersion?: 2 },
): string {
  const withVersion: SavedSearchFilters = {
    ...value,
    filterVersion: SAVED_SEARCH_FILTER_VERSION,
  };
  return JSON.stringify(withVersion);
}

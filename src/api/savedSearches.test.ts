import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import { __resetTokensForTests } from './tokens';
import { isApiError } from './errors';
import { getSavedSearches, createSavedSearch } from './savedSearches';
import { stringifySavedSearchFilters, parseSavedSearchFilters } from './jsonBlobs';
import type { SavedSearchDto } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

function makeSearch(overrides: Partial<SavedSearchDto> = {}): SavedSearchDto {
  return {
    id: 'ss-1',
    name: 'Power Hitters',
    filtersJson: stringifySavedSearchFilters({
      nameQuery: null,
      positionId: null,
      mlbTeamId: null,
      statusCode: null,
      availability: null,
    }),
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getSavedSearches', () => {
  it('GETs /api/saved-searches and returns the list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/saved-searches`, () =>
        HttpResponse.json([makeSearch(), makeSearch({ id: 'ss-2', name: 'Free Agents' })]),
      ),
    );

    const result = await getSavedSearches();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Power Hitters');
    expect(result[1].id).toBe('ss-2');
  });

  it('returns an empty array when the user has no saved searches', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/saved-searches`, () => HttpResponse.json([])),
    );

    const result = await getSavedSearches();
    expect(result).toHaveLength(0);
  });
});

describe('createSavedSearch', () => {
  it('POSTs /api/saved-searches and returns the created search', async () => {
    const filtersJson = stringifySavedSearchFilters({
      nameQuery: 'judge',
      positionId: null,
      mlbTeamId: 147,
      statusCode: null,
      availability: null,
    });
    const created = makeSearch({ id: 'ss-new', name: 'Yankees Search', filtersJson });

    mswServer.use(
      http.post(`${BASE_URL}/api/saved-searches`, () =>
        HttpResponse.json(created, { status: 201 }),
      ),
    );

    const result = await createSavedSearch({ name: 'Yankees Search', filtersJson });

    expect(result.id).toBe('ss-new');
    expect(result.name).toBe('Yankees Search');
  });

  it('always serializes filtersJson with filterVersion: 2', async () => {
    const filtersJson = stringifySavedSearchFilters({
      nameQuery: null,
      positionId: null,
      mlbTeamId: null,
      statusCode: 'active',
      availability: 'FreeAgent',
    });

    const parsed = JSON.parse(filtersJson);
    expect(parsed.filterVersion).toBe(2);
    expect(parsed.statusCode).toBe('active');
    expect(parsed.availability).toBe('FreeAgent');
  });

  it('round-trips filters through stringify and parse', () => {
    const filters = {
      nameQuery: 'ohtani',
      positionId: 3,
      mlbTeamId: 119,
      statusCode: null,
      availability: 'All' as const,
    };

    const filtersJson = stringifySavedSearchFilters(filters);
    const parsed = parseSavedSearchFilters(filtersJson);

    expect(parsed).not.toBeNull();
    expect(parsed!.nameQuery).toBe('ohtani');
    expect(parsed!.positionId).toBe(3);
    expect(parsed!.mlbTeamId).toBe(119);
    expect(parsed!.availability).toBe('All');
    expect(parsed!.filterVersion).toBe(2);
  });

  it('parser rejects filtersJson with missing filterVersion', () => {
    const badJson = JSON.stringify({ nameQuery: null });
    expect(() => parseSavedSearchFilters(badJson)).toThrow(/filter version mismatch/i);
  });

  it('parser rejects filtersJson with wrong filterVersion', () => {
    const badJson = JSON.stringify({ filterVersion: 1, nameQuery: null });
    expect(() => parseSavedSearchFilters(badJson)).toThrow(/filter version mismatch/i);
  });

  it('surfaces a 400 error for missing filterVersion: 2', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/saved-searches`, () =>
        new HttpResponse(
          JSON.stringify({
            title: 'Validation Error',
            status: 400,
            detail: 'FiltersJson must contain filterVersion: 2',
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await createSavedSearch({
      name: 'Bad',
      filtersJson: JSON.stringify({ filterVersion: 1 }),
    }).then(() => null, (e: unknown) => e);

    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('filterVersion');
    }
  });
});

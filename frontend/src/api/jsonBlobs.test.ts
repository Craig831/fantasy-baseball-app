import { describe, expect, it } from 'vitest';

import {
  DraftOrder,
  PositionSlot,
  SAVED_SEARCH_FILTER_VERSION,
  SavedSearchFilters,
  StatCategoryWeight,
  parseJsonBlob,
  parseSavedSearchFilters,
  stringifyJsonBlob,
  stringifySavedSearchFilters,
} from './jsonBlobs';

describe('parseJsonBlob / stringifyJsonBlob', () => {
  it('parses "{}" and "[]" to null', () => {
    expect(parseJsonBlob('{}')).toBeNull();
    expect(parseJsonBlob('[]')).toBeNull();
    expect(parseJsonBlob('   {}   ')).toBeNull();
  });

  it('parses null and undefined to null', () => {
    expect(parseJsonBlob(null)).toBeNull();
    expect(parseJsonBlob(undefined)).toBeNull();
    expect(parseJsonBlob('')).toBeNull();
  });

  it('round-trips PositionSlot arrays', () => {
    const positions: PositionSlot[] = [
      { positionCode: 'C', slots: 1 },
      { positionCode: 'OF', slots: 3 },
    ];
    const round = parseJsonBlob<PositionSlot[]>(stringifyJsonBlob(positions));
    expect(round).toEqual(positions);
  });

  it('round-trips StatCategoryWeight arrays', () => {
    const weights: StatCategoryWeight[] = [
      { statKey: 'HR', pointValue: 4 },
      { statKey: 'SB', pointValue: 2 },
    ];
    const round = parseJsonBlob<StatCategoryWeight[]>(stringifyJsonBlob(weights));
    expect(round).toEqual(weights);
  });

  it('round-trips DraftOrder (integer arrays)', () => {
    const order: DraftOrder = [12, 5, 9, 1];
    const round = parseJsonBlob<DraftOrder>(stringifyJsonBlob(order));
    expect(round).toEqual(order);
  });

  it('stringifies null/undefined to the empty default "{}"', () => {
    expect(stringifyJsonBlob(null)).toBe('{}');
    expect(stringifyJsonBlob(undefined)).toBe('{}');
  });
});

describe('parseSavedSearchFilters', () => {
  const validFilters: SavedSearchFilters = {
    filterVersion: 2,
    nameQuery: 'mookie',
    positionId: 7,
    mlbTeamId: 119,
    statusCode: 'A',
    availability: 'FreeAgent',
  };

  it('parses valid filters with filterVersion 2', () => {
    const raw = JSON.stringify(validFilters);
    expect(parseSavedSearchFilters(raw)).toEqual(validFilters);
  });

  it('rejects when filterVersion is missing', () => {
    const { filterVersion: _drop, ...rest } = validFilters;
    void _drop;
    const raw = JSON.stringify(rest);
    expect(() => parseSavedSearchFilters(raw)).toThrow(/filter version mismatch/i);
  });

  it('rejects when filterVersion is wrong', () => {
    const raw = JSON.stringify({ ...validFilters, filterVersion: 1 });
    expect(() => parseSavedSearchFilters(raw)).toThrow(/filter version mismatch/i);
  });

  it('returns null for empty defaults', () => {
    expect(parseSavedSearchFilters('{}')).toBeNull();
    expect(parseSavedSearchFilters(null)).toBeNull();
  });
});

describe('stringifySavedSearchFilters', () => {
  it('always sets filterVersion to 2 even if the input omits it', () => {
    const raw = stringifySavedSearchFilters({
      nameQuery: 'x',
      positionId: null,
      mlbTeamId: null,
      statusCode: null,
      availability: null,
    });
    const parsed = JSON.parse(raw);
    expect(parsed.filterVersion).toBe(SAVED_SEARCH_FILTER_VERSION);
  });

  it('round-trips through parseSavedSearchFilters', () => {
    const input: Omit<SavedSearchFilters, 'filterVersion'> = {
      nameQuery: 'mookie',
      positionId: 7,
      mlbTeamId: 119,
      statusCode: 'A',
      availability: 'FreeAgent',
    };
    const raw = stringifySavedSearchFilters(input);
    expect(parseSavedSearchFilters(raw)).toMatchObject({
      ...input,
      filterVersion: 2,
    });
  });
});

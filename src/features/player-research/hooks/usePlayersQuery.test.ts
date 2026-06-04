import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../../test/mswServer';
import {
  playersKeys,
  usePlayerQuery,
  usePlayerScoreBreakdownQuery,
  usePlayersQuery,
  usePositionsQuery,
  useTeamsQuery,
} from './usePlayersQuery';
import type { PagedResult, PlayerSummaryDto } from '../../../api/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { queryClient, Wrapper };
}

function emptyPage(): PagedResult<PlayerSummaryDto> {
  return {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 50,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

// ── playersKeys factory ───────────────────────────────────────────────────────

describe('playersKeys', () => {
  it('list key contains the params object', () => {
    const params = { pageNumber: 1, nameQuery: 'judge' };
    const key = playersKeys.list(params);
    expect(key[key.length - 1]).toMatchObject(params);
  });

  it('different params produce different list keys', () => {
    expect(playersKeys.list({ pageNumber: 1 })).not.toEqual(
      playersKeys.list({ pageNumber: 2 }),
    );
  });

  it('same params produce equal list keys', () => {
    const params = { pageNumber: 1, pageSize: 25 };
    expect(playersKeys.list(params)).toEqual(playersKeys.list(params));
  });

  it('detail key includes mlbPlayerId', () => {
    expect(playersKeys.detail(660271)).toContain(660271);
  });

  it('detail key with leagueId differs from detail key without', () => {
    expect(playersKeys.detail(1)).not.toEqual(playersKeys.detail(1, 5));
  });

  it('teams and positions keys are stable and distinct', () => {
    expect(playersKeys.teams()).toEqual(playersKeys.teams());
    expect(playersKeys.positions()).toEqual(playersKeys.positions());
    expect(playersKeys.teams()).not.toEqual(playersKeys.positions());
  });

  it('scoreBreakdown key includes both mlbPlayerId and scoringConfigId', () => {
    const key = playersKeys.scoreBreakdown(592450, 'cfg-1');
    expect(key).toContain(592450);
    expect(key).toContain('cfg-1');
  });

  it('different scoringConfigIds produce different scoreBreakdown keys', () => {
    expect(playersKeys.scoreBreakdown(1, 'cfg-a')).not.toEqual(
      playersKeys.scoreBreakdown(1, 'cfg-b'),
    );
  });
});

// ── usePlayersQuery ───────────────────────────────────────────────────────────

describe('usePlayersQuery', () => {
  it('fetches and exposes paged player data', async () => {
    const page: PagedResult<PlayerSummaryDto> = {
      items: [
        {
          mlbPlayerId: 592450,
          fullName: 'Aaron Judge',
          primaryPosition: 'RF',
          mlbTeam: { mlbTeamId: 147, name: 'New York Yankees', abbreviation: 'NYY' },
          status: 'Active',
          jellyScore: 42.5,
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 50,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () => HttpResponse.json(page)),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePlayersQuery({ pageNumber: 1 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].fullName).toBe('Aaron Judge');
    expect(result.current.data?.totalCount).toBe(1);
  });

  it('starts in loading state then transitions to success', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () => HttpResponse.json(emptyPage())),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePlayersQuery({}), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches when params change', async () => {
    let callCount = 0;
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () => {
        callCount++;
        return HttpResponse.json(emptyPage());
      }),
    );

    const { Wrapper } = makeWrapper();
    const { rerender } = renderHook(
      ({ params }) => usePlayersQuery(params),
      { wrapper: Wrapper, initialProps: { params: { pageNumber: 1 } } },
    );

    await waitFor(() => expect(callCount).toBe(1));

    rerender({ params: { pageNumber: 2 } });
    await waitFor(() => expect(callCount).toBe(2));
  });

  it('does NOT refetch when params are referentially different but deeply equal', async () => {
    let callCount = 0;
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () => {
        callCount++;
        return HttpResponse.json(emptyPage());
      }),
    );

    const params = { pageNumber: 1, pageSize: 50 };
    const { Wrapper } = makeWrapper();
    const { rerender } = renderHook(
      ({ p }) => usePlayersQuery(p),
      { wrapper: Wrapper, initialProps: { p: params } },
    );

    await waitFor(() => expect(callCount).toBe(1));

    // Same content, new object — TanStack Query serializes to JSON so cache hits
    rerender({ p: { pageNumber: 1, pageSize: 50 } });
    await waitFor(() => expect(result => result).toBeTruthy()); // give it a tick
    expect(callCount).toBe(1);
  });

  it('exposes error state on failure', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () =>
        new HttpResponse(
          JSON.stringify({ status: 500, title: 'Error', detail: 'Server error' }),
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePlayersQuery({}), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

// ── usePlayerQuery ────────────────────────────────────────────────────────────

describe('usePlayerQuery', () => {
  it('fetches /api/players/:mlbPlayerId', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players/660271`, () =>
        HttpResponse.json({
          mlbPlayerId: 660271,
          fullName: 'Shohei Ohtani',
          primaryPosition: 'DH',
          status: 'Active',
          news: [],
        }),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePlayerQuery(660271), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.fullName).toBe('Shohei Ohtani');
  });
});

// ── useTeamsQuery ─────────────────────────────────────────────────────────────

describe('useTeamsQuery', () => {
  it('fetches /api/players/filters/teams and returns the list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players/filters/teams`, () =>
        HttpResponse.json([
          { mlbTeamId: 147, name: 'New York Yankees', abbreviation: 'NYY' },
        ]),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTeamsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].abbreviation).toBe('NYY');
  });
});

// ── usePositionsQuery ─────────────────────────────────────────────────────────

describe('usePositionsQuery', () => {
  it('fetches /api/players/filters/positions and returns the list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players/filters/positions`, () =>
        HttpResponse.json([{ positionId: 1, name: 'Pitcher', abbreviation: 'P' }]),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => usePositionsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].positionId).toBe(1);
  });
});

// ── usePlayerScoreBreakdownQuery ──────────────────────────────────────────────

describe('usePlayerScoreBreakdownQuery', () => {
  it('is idle when mlbPlayerId is 0', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlayerScoreBreakdownQuery(0, 'cfg-1'),
      { wrapper: Wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('is idle when scoringConfigId is undefined', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlayerScoreBreakdownQuery(592450, undefined),
      { wrapper: Wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is idle when scoringConfigId is an empty string', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlayerScoreBreakdownQuery(592450, ''),
      { wrapper: Wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches when both mlbPlayerId and scoringConfigId are set', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players/592450/score-breakdown`, () =>
        HttpResponse.json({
          mlbPlayerId: 592450,
          scoringConfigId: 'cfg-1',
          totalScore: 88.0,
          categories: [{ name: 'HR', statValue: 20, weight: 3.0, points: 60.0 }],
        }),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlayerScoreBreakdownQuery(592450, 'cfg-1'),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalScore).toBe(88.0);
    expect(result.current.data?.categories[0].name).toBe('HR');
  });
});

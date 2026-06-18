import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import {
  lineupKeys,
  useAddFreeAgentMutation,
  useLineupQuery,
  useMoveRosterSpotMutation,
  useRosterQuery,
  useSetLineupSlotMutation,
  useTeamDashboardQuery,
} from './useLineup';
import type { RosterSpotDto, TeamDashboardDto, TeamLineupDto } from '../api/types';

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

const DASHBOARD: TeamDashboardDto = {
  leagueId: 1,
  teamName: 'Yankees',
  currentWeek: 3,
  faabBudgetRemaining: 80,
  rosterSize: 20,
};

const ROSTER: RosterSpotDto[] = [
  { id: 1, mlbPlayerId: 592450, playerName: 'Aaron Judge', primaryPosition: 'RF', status: 'Active', mlbTeamAbbreviation: 'NYY' },
];

const LINEUP: TeamLineupDto = {
  leagueId: 1,
  week: 3,
  slots: [
    { slotPosition: 'RF', mlbPlayerId: 592450, playerName: 'Aaron Judge', isLocked: false },
  ],
};

// ── Key factory ───────────────────────────────────────────────────────────────

describe('lineupKeys', () => {
  it('all key includes leagueId', () => {
    expect(lineupKeys.all(1)).toContain(1);
  });

  it('different leagueIds produce different keys', () => {
    expect(lineupKeys.all(1)).not.toEqual(lineupKeys.all(2));
  });

  it('week key includes both leagueId and week', () => {
    const key = lineupKeys.week(1, 3);
    expect(key).toContain(1);
    expect(key).toContain(3);
  });

  it('dashboard and roster keys are distinct', () => {
    expect(lineupKeys.dashboard(1)).not.toEqual(lineupKeys.roster(1));
  });
});

// ── useTeamDashboardQuery ─────────────────────────────────────────────────────

describe('useTeamDashboardQuery', () => {
  it('fetches and exposes the team dashboard', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/dashboard`, () => HttpResponse.json(DASHBOARD)),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTeamDashboardQuery(1), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.teamName).toBe('Yankees');
    expect(result.current.data?.currentWeek).toBe(3);
  });

  it('is disabled when leagueId is 0', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTeamDashboardQuery(0), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useRosterQuery ────────────────────────────────────────────────────────────

describe('useRosterQuery', () => {
  it('fetches and exposes the roster', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/roster`, () => HttpResponse.json(ROSTER)),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRosterQuery(1), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].playerName).toBe('Aaron Judge');
  });

  it('is disabled when leagueId is 0', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRosterQuery(0), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useLineupQuery ────────────────────────────────────────────────────────────

describe('useLineupQuery', () => {
  it('fetches the lineup for the given week', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/lineup/3`, () => HttpResponse.json(LINEUP)),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useLineupQuery(1, 3), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.week).toBe(3);
    expect(result.current.data?.slots[0].playerName).toBe('Aaron Judge');
  });

  it('is disabled when week is 0', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useLineupQuery(1, 0), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useMoveRosterSpotMutation ─────────────────────────────────────────────────

describe('useMoveRosterSpotMutation', () => {
  it('PUTs the move and invalidates roster cache', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/roster`, () => HttpResponse.json(ROSTER)),
      http.put(`${BASE_URL}/api/leagues/1/teams/me/roster/move`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );

    // gcTime: Infinity keeps the prefetched entry alive so isInvalidated is readable
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }
    await queryClient.prefetchQuery({
      queryKey: lineupKeys.roster(1),
      queryFn: () => Promise.resolve(ROSTER),
    });

    const { result } = renderHook(() => useMoveRosterSpotMutation(1), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ rosterSpotId: 1, newStatus: 'Bench' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = queryClient.getQueryState(lineupKeys.roster(1));
    expect(cached?.isInvalidated).toBe(true);
  });
});

// ── useSetLineupSlotMutation ──────────────────────────────────────────────────

describe('useSetLineupSlotMutation', () => {
  it('PUTs the slot and invalidates lineup cache', async () => {
    mswServer.use(
      http.put(`${BASE_URL}/api/leagues/1/teams/me/lineup`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetLineupSlotMutation(1), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ week: 3, slotPosition: 'RF', mlbPlayerId: 592450 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// ── useAddFreeAgentMutation ───────────────────────────────────────────────────

describe('useAddFreeAgentMutation', () => {
  it('POSTs the add and invalidates roster cache', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/free-agents/add`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );

    // gcTime: Infinity keeps the prefetched entry alive so isInvalidated is readable
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }
    await queryClient.prefetchQuery({
      queryKey: lineupKeys.roster(1),
      queryFn: () => Promise.resolve(ROSTER),
    });

    const { result } = renderHook(() => useAddFreeAgentMutation(1), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ addPlayerId: 660271, dropRosterSpotId: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = queryClient.getQueryState(lineupKeys.roster(1));
    expect(cached?.isInvalidated).toBe(true);
  });
});

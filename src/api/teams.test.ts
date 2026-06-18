import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import { __resetTokensForTests } from './tokens';
import { isApiError } from './errors';
import {
  addFreeAgent,
  getLineup,
  getRoster,
  getTeamDashboard,
  moveRosterSpot,
  setLineupSlot,
} from './teams';
import type { RosterSpotDto, TeamDashboardDto, TeamLineupDto } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

const DASHBOARD: TeamDashboardDto = {
  leagueId: 1,
  teamName: 'Yankees',
  currentWeek: 3,
  faabBudgetRemaining: 80,
  rosterSize: 20,
};

describe('getTeamDashboard', () => {
  it('GETs /api/leagues/:id/teams/me/dashboard and returns authoritative currentWeek', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/dashboard`, () =>
        HttpResponse.json(DASHBOARD),
      ),
    );

    const result = await getTeamDashboard(1);
    expect(result.currentWeek).toBe(3);
    expect(result.teamName).toBe('Yankees');
  });
});

describe('getRoster', () => {
  it('GETs /api/leagues/:id/teams/me/roster and returns the roster spots', async () => {
    const spots: RosterSpotDto[] = [
      { id: 1, mlbPlayerId: 660271, playerName: 'Shohei Ohtani', primaryPosition: 'DH', status: 'Active', mlbTeamAbbreviation: 'LAD' },
      { id: 2, mlbPlayerId: 592450, playerName: 'Aaron Judge', primaryPosition: 'RF', status: 'Bench', mlbTeamAbbreviation: 'NYY' },
    ];
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/roster`, () => HttpResponse.json(spots)),
    );

    const result = await getRoster(1);
    expect(result).toHaveLength(2);
    expect(result[0].playerName).toBe('Shohei Ohtani');
    expect(result[1].status).toBe('Bench');
  });
});

describe('moveRosterSpot', () => {
  it('PUTs /api/leagues/:id/teams/me/roster/move', async () => {
    let body: unknown;
    mswServer.use(
      http.put(`${BASE_URL}/api/leagues/1/teams/me/roster/move`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await moveRosterSpot(1, { rosterSpotId: 1, newStatus: 'Bench' });
    expect((body as { newStatus: string }).newStatus).toBe('Bench');
  });

  it('surfaces a 400 when moving to InjuredReserve without injury status', async () => {
    mswServer.use(
      http.put(`${BASE_URL}/api/leagues/1/teams/me/roster/move`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Bad Request', status: 400, detail: 'Player does not have an injury status' }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await moveRosterSpot(1, { rosterSpotId: 1, newStatus: 'InjuredReserve' }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('injury status');
    }
  });
});

describe('getLineup', () => {
  it('GETs /api/leagues/:id/teams/me/lineup/:week and returns the weekly lineup', async () => {
    const lineup: TeamLineupDto = {
      leagueId: 1,
      week: 3,
      slots: [
        { slotPosition: 'C', mlbPlayerId: 660271, playerName: 'Shohei Ohtani', isLocked: false },
        { slotPosition: 'RF', mlbPlayerId: null, playerName: null, isLocked: false },
      ],
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/teams/me/lineup/3`, () => HttpResponse.json(lineup)),
    );

    const result = await getLineup(1, 3);
    expect(result.week).toBe(3);
    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].playerName).toBe('Shohei Ohtani');
  });
});

describe('setLineupSlot', () => {
  it('PUTs /api/leagues/:id/teams/me/lineup with the slot details', async () => {
    let body: unknown;
    mswServer.use(
      http.put(`${BASE_URL}/api/leagues/1/teams/me/lineup`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await setLineupSlot(1, { week: 3, slotPosition: 'C', mlbPlayerId: 660271 });
    expect((body as { slotPosition: string }).slotPosition).toBe('C');
    expect((body as { mlbPlayerId: number }).mlbPlayerId).toBe(660271);
  });

  it('surfaces a 400 when editing a locked slot', async () => {
    mswServer.use(
      http.put(`${BASE_URL}/api/leagues/1/teams/me/lineup`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Bad Request', status: 400, detail: 'Slot is locked' }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await setLineupSlot(1, { week: 3, slotPosition: 'C', mlbPlayerId: 1 }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('locked');
    }
  });
});

describe('addFreeAgent', () => {
  it('POSTs /api/leagues/:id/free-agents/add', async () => {
    let body: unknown;
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/free-agents/add`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await addFreeAgent(1, { addPlayerId: 660271, dropRosterSpotId: 5 });
    expect((body as { addPlayerId: number }).addPlayerId).toBe(660271);
  });

  it('surfaces a 400 when roster is full and no drop is provided', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/free-agents/add`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Bad Request', status: 400, detail: 'Roster is full; provide dropRosterSpotId' }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await addFreeAgent(1, { addPlayerId: 12345 }).then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('dropRosterSpotId');
    }
  });
});

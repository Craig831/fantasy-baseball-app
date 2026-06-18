import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import { __resetTokensForTests } from './tokens';
import { isApiError } from './errors';
import {
  getPlayerById,
  getPlayerScoreBreakdown,
  getPositions,
  getTeams,
  searchPlayers,
} from './players';
import type {
  PagedResult,
  PlayerProfileDto,
  PlayerSummaryDto,
  PositionDto,
  ScoreBreakdownDto,
  TeamSummaryDto,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function makePlayerSummary(overrides: Partial<PlayerSummaryDto> = {}): PlayerSummaryDto {
  return {
    mlbPlayerId: 592450,
    fullName: 'Aaron Judge',
    primaryPosition: 'RF',
    mlbTeam: { mlbTeamId: 147, name: 'New York Yankees', abbreviation: 'NYY' },
    status: 'Active',
    jellyScore: null,
    ...overrides,
  };
}

function makePage<T>(items: T[], overrides: Partial<PagedResult<T>> = {}): PagedResult<T> {
  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  };
}

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

describe('searchPlayers', () => {
  it('GETs /api/players and returns the paged result', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () =>
        HttpResponse.json(makePage([makePlayerSummary()])),
      ),
    );

    const result = await searchPlayers({ pageNumber: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].mlbPlayerId).toBe(592450);
    expect(result.items[0].fullName).toBe('Aaron Judge');
  });

  it('maps the full pagination shape', async () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayerSummary({ mlbPlayerId: i + 1 }),
    );
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () =>
        HttpResponse.json(
          makePage(players, {
            totalCount: 35,
            pageNumber: 2,
            pageSize: 10,
            totalPages: 4,
            hasNextPage: true,
            hasPreviousPage: true,
          }),
        ),
      ),
    );

    const result = await searchPlayers({ pageNumber: 2, pageSize: 10 });

    expect(result.totalCount).toBe(35);
    expect(result.pageNumber).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(4);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('serializes scalar params without bracket notation (paramsSerializer: indexes null)', async () => {
    let receivedSearch = '';
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, ({ request }) => {
        receivedSearch = new URL(request.url).search;
        return HttpResponse.json(makePage([]));
      }),
    );

    await searchPlayers({
      pageNumber: 2,
      pageSize: 25,
      sortBy: 'fullName',
      sortOrder: 'asc',
      nameQuery: 'judge',
    });

    expect(receivedSearch).toContain('pageNumber=2');
    expect(receivedSearch).toContain('pageSize=25');
    expect(receivedSearch).toContain('sortBy=fullName');
    expect(receivedSearch).toContain('sortOrder=asc');
    expect(receivedSearch).toContain('nameQuery=judge');
    expect(receivedSearch).not.toMatch(/\[/);
  });

  it('omits undefined params from the request', async () => {
    let receivedSearch = '';
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, ({ request }) => {
        receivedSearch = new URL(request.url).search;
        return HttpResponse.json(makePage([]));
      }),
    );

    await searchPlayers({ pageNumber: 1 });

    expect(receivedSearch).not.toContain('nameQuery');
    expect(receivedSearch).not.toContain('positionId');
    expect(receivedSearch).not.toContain('mlbTeamId');
  });

  it('surfaces a 400 response as a branded ApiError', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players`, () =>
        new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Validation Error',
            status: 400,
            detail: 'pageSize must be between 1 and 100',
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await searchPlayers({ pageNumber: 0 }).then(
      () => null,
      (e: unknown) => e,
    );

    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('pageSize must be between 1 and 100');
    }
  });
});

describe('getPlayerById', () => {
  it('GETs /api/players/:mlbPlayerId and returns the profile', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/players/660271`, () =>
        HttpResponse.json<PlayerProfileDto>({
          mlbPlayerId: 660271,
          fullName: 'Shohei Ohtani',
          primaryPosition: 'DH',
          mlbTeam: { mlbTeamId: 119, name: 'Los Angeles Dodgers', abbreviation: 'LAD' },
          status: 'Active',
          birthDate: '1994-07-05',
          height: "6' 4\"",
          weight: 210,
          news: [],
        }),
      ),
    );

    const profile = await getPlayerById(660271);

    expect(profile.mlbPlayerId).toBe(660271);
    expect(profile.fullName).toBe('Shohei Ohtani');
    expect(profile.mlbTeam?.abbreviation).toBe('LAD');
    expect(profile.news).toEqual([]);
  });

  it('appends leagueId as a query param when provided', async () => {
    let receivedSearch = '';
    mswServer.use(
      http.get(`${BASE_URL}/api/players/660271`, ({ request }) => {
        receivedSearch = new URL(request.url).search;
        return HttpResponse.json({
          mlbPlayerId: 660271,
          fullName: 'Shohei Ohtani',
          primaryPosition: 'DH',
          status: 'Active',
          news: [],
        });
      }),
    );

    await getPlayerById(660271, 99);

    expect(receivedSearch).toContain('leagueId=99');
  });

  it('omits leagueId when not provided', async () => {
    let receivedSearch = '';
    mswServer.use(
      http.get(`${BASE_URL}/api/players/660271`, ({ request }) => {
        receivedSearch = new URL(request.url).search;
        return HttpResponse.json({
          mlbPlayerId: 660271,
          fullName: 'Shohei Ohtani',
          primaryPosition: 'DH',
          status: 'Active',
          news: [],
        });
      }),
    );

    await getPlayerById(660271);

    expect(receivedSearch).not.toContain('leagueId');
  });
});

describe('getTeams', () => {
  it('GETs /api/players/filters/teams and returns the list', async () => {
    const teams: TeamSummaryDto[] = [
      { mlbTeamId: 147, name: 'New York Yankees', abbreviation: 'NYY' },
      { mlbTeamId: 119, name: 'Los Angeles Dodgers', abbreviation: 'LAD' },
    ];
    mswServer.use(
      http.get(`${BASE_URL}/api/players/filters/teams`, () => HttpResponse.json(teams)),
    );

    const result = await getTeams();

    expect(result).toHaveLength(2);
    expect(result[0].abbreviation).toBe('NYY');
    expect(result[1].mlbTeamId).toBe(119);
  });
});

describe('getPositions', () => {
  it('GETs /api/players/filters/positions and returns the list', async () => {
    const positions: PositionDto[] = [
      { positionId: 1, name: 'Pitcher', abbreviation: 'P' },
      { positionId: 3, name: 'First Base', abbreviation: '1B' },
    ];
    mswServer.use(
      http.get(`${BASE_URL}/api/players/filters/positions`, () =>
        HttpResponse.json(positions),
      ),
    );

    const result = await getPositions();

    expect(result).toHaveLength(2);
    expect(result[0].abbreviation).toBe('P');
    expect(result[1].positionId).toBe(3);
  });
});

describe('getPlayerScoreBreakdown', () => {
  it('GETs /api/players/:mlbPlayerId/score-breakdown with scoringConfigId', async () => {
    const breakdown: ScoreBreakdownDto = {
      mlbPlayerId: 592450,
      scoringConfigId: 'cfg-abc',
      totalScore: 55.5,
      categories: [
        { name: 'HR', statValue: 10, weight: 3.0, points: 30.0 },
        { name: 'RBI', statValue: 25, weight: 1.0, points: 25.5 },
      ],
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/players/592450/score-breakdown`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('scoringConfigId')).toBe('cfg-abc');
        return HttpResponse.json(breakdown);
      }),
    );

    const result = await getPlayerScoreBreakdown(592450, 'cfg-abc');

    expect(result.totalScore).toBe(55.5);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe('HR');
    expect(result.categories[1].points).toBe(25.5);
  });
});

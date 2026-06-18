import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import { __resetTokensForTests } from './tokens';
import { isApiError } from './errors';
import {
  archiveLeague,
  createLeague,
  getDraftSettings,
  getLeagueById,
  getLeagueInviteCode,
  getLeagueMembers,
  getLeagues,
  getRosterSettings,
  getScoringSettings,
  joinLeague,
  previewLeagueInvite,
} from './leagues';
import type { DraftSettingsDto, LeagueDto, LeagueMemberDto, RosterSettingsDto, ScoringSettingsDto } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

const LEAGUE: LeagueDto = {
  id: 1,
  name: 'Test League',
  type: 'HeadToHead',
  status: 'Active',
  commissionerUserId: 'user-abc',
  maxTeams: 10,
  currentWeek: 3,
  createdAt: '2025-01-01T00:00:00Z',
};

describe('getLeagues', () => {
  it('GETs /api/leagues and returns the list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues`, () =>
        HttpResponse.json([{ id: 1, name: 'Test League', type: 'HeadToHead', status: 'Active' }]),
      ),
    );

    const result = await getLeagues();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test League');
  });
});

describe('createLeague', () => {
  it('POSTs /api/leagues and returns the created league', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues`, () => HttpResponse.json(LEAGUE, { status: 201 })),
    );

    const result = await createLeague({ name: 'Test League', type: 'HeadToHead', maxTeams: 10 });
    expect(result.id).toBe(1);
    expect(result.currentWeek).toBe(3);
  });
});

describe('getLeagueById', () => {
  it('GETs /api/leagues/:id and returns the detail', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1`, () => HttpResponse.json(LEAGUE)),
    );

    const result = await getLeagueById(1);
    expect(result.id).toBe(1);
    expect(result.commissionerUserId).toBe('user-abc');
  });

  it('surfaces a 404 as an ApiError', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/999`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Not Found', status: 404, detail: 'League not found' }),
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await getLeagueById(999).then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) expect(err.status).toBe(404);
  });
});

describe('getLeagueMembers', () => {
  it('GETs /api/leagues/:id/members and returns the list', async () => {
    const members: LeagueMemberDto[] = [
      { id: 1, userId: 'user-abc', teamName: 'Yankees', status: 'Active', faabBudgetRemaining: 100 },
    ];
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/members`, () => HttpResponse.json(members)),
    );

    const result = await getLeagueMembers(1);
    expect(result).toHaveLength(1);
    expect(result[0].teamName).toBe('Yankees');
  });
});

describe('getLeagueInviteCode', () => {
  it('GETs /api/leagues/:id/invite-code', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/invite-code`, () =>
        HttpResponse.json({ inviteCode: 'ABC123' }),
      ),
    );

    const result = await getLeagueInviteCode(1);
    expect(result.inviteCode).toBe('ABC123');
  });
});

describe('previewLeagueInvite', () => {
  it('GETs /api/leagues/invite/:token (unauthenticated)', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/invite/tok123`, () =>
        HttpResponse.json({
          leagueId: 1,
          leagueName: 'Test League',
          inviterTeamName: 'Yankees',
          expiresAt: null,
        }),
      ),
    );

    const result = await previewLeagueInvite('tok123');
    expect(result.leagueName).toBe('Test League');
  });
});

describe('joinLeague', () => {
  it('POSTs /api/leagues/join', async () => {
    let body: unknown;
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/join`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await joinLeague({ token: 'tok123', teamName: 'My Team' });
    expect((body as { token: string }).token).toBe('tok123');
  });
});

describe('archiveLeague', () => {
  it('POSTs /api/leagues/:id/archive', async () => {
    let called = false;
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/archive`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await archiveLeague(1);
    expect(called).toBe(true);
  });

  it('surfaces a 401 when called by a non-commissioner', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/archive`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Unauthorized', status: 401 }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await archiveLeague(1).then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) expect(err.status).toBe(401);
  });
});

describe('getRosterSettings', () => {
  it('GETs /api/leagues/:id/settings/roster including positionSlotsJson', async () => {
    const settings: RosterSettingsDto = {
      maxPlayers: 25,
      maxBenchPlayers: 10,
      positionSlotsJson: '[{"positionCode":"C","slots":1}]',
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/settings/roster`, () => HttpResponse.json(settings)),
    );

    const result = await getRosterSettings(1);
    expect(result.maxPlayers).toBe(25);
    expect(result.positionSlotsJson).toContain('positionCode');
  });
});

describe('getScoringSettings', () => {
  it('GETs /api/leagues/:id/settings/scoring including statCategoriesJson', async () => {
    const settings: ScoringSettingsDto = {
      statCategoriesJson: '[{"statKey":"HR","pointValue":4}]',
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/settings/scoring`, () => HttpResponse.json(settings)),
    );

    const result = await getScoringSettings(1);
    expect(result.statCategoriesJson).toContain('HR');
  });
});

describe('getDraftSettings', () => {
  it('GETs /api/leagues/:id/settings/draft and returns DraftSettingsDto', async () => {
    const settings: DraftSettingsDto = {
      draftType: 'Snake',
      draftStatus: 'NotStarted',
      scheduledAt: null,
      secondsPerPick: 60,
      draftOrderJson: '[1, 2, 3]',
    };
    mswServer.use(
      http.get(`${BASE_URL}/api/leagues/1/settings/draft`, () => HttpResponse.json(settings)),
    );

    const result = await getDraftSettings(1);
    expect(result.draftStatus).toBe('NotStarted');
    expect(result.draftType).toBe('Snake');
  });

  it('surfaces a 400 when trying to start from an invalid state', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/leagues/1/settings/draft/start`, () =>
        new HttpResponse(
          JSON.stringify({
            title: 'Bad Request',
            status: 400,
            detail: "Cannot start draft from status 'InProgress'.",
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const { startDraft } = await import('./leagues');
    const err = await startDraft(1).then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain("Cannot start draft");
    }
  });
});

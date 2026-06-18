import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import { __resetTokensForTests } from './tokens';
import { isApiError } from './errors';
import { getScoringConfigs, createScoringConfig, getScoringConfigById } from './scoringConfigs';
import type { ScoringConfigDto } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

function makeConfig(overrides: Partial<ScoringConfigDto> = {}): ScoringConfigDto {
  return {
    id: 'cfg-1',
    name: 'Standard',
    categoriesJson: '[{"statKey":"HR","pointValue":4}]',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getScoringConfigs', () => {
  it('GETs /api/scoring-configs and returns the list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () =>
        HttpResponse.json([makeConfig(), makeConfig({ id: 'cfg-2', name: 'Custom' })]),
      ),
    );

    const result = await getScoringConfigs();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('cfg-1');
    expect(result[1].name).toBe('Custom');
  });

  it('returns an empty array when the user has no configs', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () => HttpResponse.json([])),
    );

    const result = await getScoringConfigs();
    expect(result).toHaveLength(0);
  });

  it('surfaces a 401 response as a branded ApiError', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Unauthorized', status: 401, detail: 'Auth required' }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await getScoringConfigs().then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) expect(err.status).toBe(401);
  });
});

describe('createScoringConfig', () => {
  it('POSTs /api/scoring-configs and returns the created config', async () => {
    const created = makeConfig({ id: 'cfg-new', name: 'New Config' });
    mswServer.use(
      http.post(`${BASE_URL}/api/scoring-configs`, () => HttpResponse.json(created, { status: 201 })),
    );

    const result = await createScoringConfig({
      name: 'New Config',
      categoriesJson: '[{"statKey":"HR","pointValue":4}]',
    });

    expect(result.id).toBe('cfg-new');
    expect(result.name).toBe('New Config');
  });

  it('surfaces a 400 error for invalid categoriesJson', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/scoring-configs`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Validation Error', status: 400, detail: 'categoriesJson is invalid' }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await createScoringConfig({ name: 'X', categoriesJson: 'not-json' }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.detail).toContain('categoriesJson');
    }
  });

  it('categoriesJson round-trips correctly', async () => {
    const categories = [
      { statKey: 'HR', pointValue: 4 },
      { statKey: 'SB', pointValue: 2 },
    ];
    const categoriesJson = JSON.stringify(categories);

    let sentBody: unknown;
    mswServer.use(
      http.post(`${BASE_URL}/api/scoring-configs`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(makeConfig({ categoriesJson }), { status: 201 });
      }),
    );

    await createScoringConfig({ name: 'Test', categoriesJson });

    expect((sentBody as { categoriesJson: string }).categoriesJson).toBe(categoriesJson);
  });
});

describe('getScoringConfigById', () => {
  it('GETs /api/scoring-configs/:id and returns the detail', async () => {
    const config = makeConfig({ id: 'cfg-abc', name: 'Detail Config' });
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs/cfg-abc`, () => HttpResponse.json(config)),
    );

    const result = await getScoringConfigById('cfg-abc');

    expect(result.id).toBe('cfg-abc');
    expect(result.name).toBe('Detail Config');
  });

  it('surfaces a 404 as an ApiError when config is not found', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs/missing`, () =>
        new HttpResponse(
          JSON.stringify({ title: 'Not Found', status: 404, detail: 'Config not found' }),
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const err = await getScoringConfigById('missing').then(() => null, (e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) expect(err.status).toBe(404);
  });
});

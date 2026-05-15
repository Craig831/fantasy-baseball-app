import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isApiError } from './errors';
import { mswServer } from '../test/mswServer';
import {
  __resetTokensForTests,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens';
import { createApiClient, onSessionCleared } from './client';

const BASE_URL = 'http://api.test.invalid';

beforeEach(() => {
  __resetTokensForTests();
});

afterEach(() => {
  __resetTokensForTests();
});

describe('apiClient interceptor', () => {
  it('attaches a Bearer token from the token store', async () => {
    setTokens({ accessToken: 'token-a', refreshToken: 'refresh-a' });
    let observedAuth: string | null = null;
    mswServer.use(
      http.get(`${BASE_URL}/echo`, ({ request }) => {
        observedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    const client = createApiClient(BASE_URL);
    await client.get('/echo');

    expect(observedAuth).toBe('Bearer token-a');
  });

  it('on 401 triggers a single-flight refresh and retries the original request', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });

    const refreshSpy = vi.fn();
    let echoCalls = 0;

    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, async ({ request }) => {
        refreshSpy();
        const body = (await request.json()) as { refreshToken: string };
        expect(body.refreshToken).toBe('refresh-1');
        return HttpResponse.json({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        });
      }),
      http.get(`${BASE_URL}/echo`, ({ request }) => {
        echoCalls += 1;
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer new-access') {
          return HttpResponse.json({ ok: true, calls: echoCalls });
        }
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token expired',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    const client = createApiClient(BASE_URL);
    const response = await client.get('/echo');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(echoCalls).toBe(2);
    expect(response.data).toEqual({ ok: true, calls: 2 });
    expect(getAccessToken()).toBe('new-access');
    expect(getRefreshToken()).toBe('new-refresh');
  });

  it('coalesces concurrent 401s onto a single refresh call', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });

    const refreshSpy = vi.fn();
    let echoCalls = 0;

    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, async () => {
        refreshSpy();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        });
      }),
      http.get(`${BASE_URL}/echo`, ({ request }) => {
        echoCalls += 1;
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer new-access') {
          return HttpResponse.json({ ok: true });
        }
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token expired',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    const client = createApiClient(BASE_URL);
    const [a, b, c] = await Promise.all([
      client.get('/echo'),
      client.get('/echo'),
      client.get('/echo'),
    ]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(echoCalls).toBe(6); // 3 initial 401s + 3 successful retries
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(c.data).toEqual({ ok: true });
  });

  it('clears tokens and emits session-cleared when refresh itself fails', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'bad-refresh' });
    const sessionListener = vi.fn();
    const unsubscribe = onSessionCleared(sessionListener);

    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, () => {
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Refresh token revoked',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
      http.get(`${BASE_URL}/echo`, () => {
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token expired',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    const client = createApiClient(BASE_URL);
    const err = await client.get('/echo').then(
      () => null,
      (e: unknown) => e,
    );

    expect(err).toBeTruthy();
    expect(isApiError(err)).toBe(true);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(sessionListener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('maps RFC 7807 error responses to ApiError', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () => {
        return new HttpResponse(
          JSON.stringify({
            type: 'https://example.com/probs/validation',
            title: 'Validation Error',
            status: 400,
            detail: 'Email is required; Password must be at least 8 characters',
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    const client = createApiClient(BASE_URL);
    const err = await client.post('/api/auth/register', {}).then(
      () => null,
      (e: unknown) => e,
    );

    expect(isApiError(err)).toBe(true);
    if (isApiError(err)) {
      expect(err.status).toBe(400);
      expect(err.title).toBe('Validation Error');
      expect(err.detail).toContain('Email is required');
    }
  });

  it('does not loop when the refresh call itself returns 401', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    const refreshSpy = vi.fn();

    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, () => {
        refreshSpy();
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Refresh token revoked',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
      http.get(`${BASE_URL}/echo`, () => {
        return new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token expired',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    const client = createApiClient(BASE_URL);
    await client.get('/echo').catch(() => undefined);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});

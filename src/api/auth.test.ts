import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetTokensForTests,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens';
import { isApiError } from './errors';
import { mswServer } from '../test/mswServer';
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
} from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

beforeEach(() => {
  __resetTokensForTests();
});

afterEach(() => {
  __resetTokensForTests();
});

describe('auth API', () => {
  describe('register', () => {
    it('posts the payload, stores tokens, and returns AuthResponse', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/register`, async ({ request }) => {
          const body = (await request.json()) as { email: string };
          expect(body.email).toBe('new@example.com');
          return HttpResponse.json({
            accessToken: 'a1',
            refreshToken: 'r1',
            expiresIn: 900,
          });
        }),
      );

      const result = await register({
        email: 'new@example.com',
        password: 'Passw0rd',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.accessToken).toBe('a1');
      expect(getAccessToken()).toBe('a1');
      expect(getRefreshToken()).toBe('r1');
    });

    it('surfaces a 400 validation error as ApiError', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/register`, () =>
          new HttpResponse(
            JSON.stringify({
              type: 'about:blank',
              title: 'Validation Error',
              status: 400,
              detail: 'Email is required; Password must contain a digit',
            }),
            { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      );

      const err = await register({ email: '', password: '' }).then(
        () => null,
        (e: unknown) => e,
      );
      expect(isApiError(err)).toBe(true);
      if (isApiError(err)) {
        expect(err.status).toBe(400);
        expect(err.detail).toContain('Email is required');
      }
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('login', () => {
    it('stores tokens on success', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/login`, () =>
          HttpResponse.json({
            accessToken: 'a2',
            refreshToken: 'r2',
            expiresIn: 900,
          }),
        ),
      );

      await login({ email: 'dev@example.com', password: 'Passw0rd' });
      expect(getAccessToken()).toBe('a2');
      expect(getRefreshToken()).toBe('r2');
    });

    it('surfaces a 401 as ApiError without touching tokens', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/login`, () =>
          new HttpResponse(
            JSON.stringify({
              type: 'about:blank',
              title: 'Unauthorized',
              status: 401,
              detail: 'Invalid credentials',
            }),
            { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      );

      const err = await login({ email: 'x@example.com', password: 'wrong' }).then(
        () => null,
        (e: unknown) => e,
      );
      expect(isApiError(err)).toBe(true);
      if (isApiError(err)) expect(err.status).toBe(401);
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('refresh', () => {
    it('uses the persisted refresh token and rotates both tokens', async () => {
      setTokens({ accessToken: 'old', refreshToken: 'old-refresh' });
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/refresh`, async ({ request }) => {
          const body = (await request.json()) as { refreshToken: string };
          expect(body.refreshToken).toBe('old-refresh');
          return HttpResponse.json({
            accessToken: 'new',
            refreshToken: 'new-refresh',
            expiresIn: 900,
          });
        }),
      );

      const result = await refresh();
      expect(result.accessToken).toBe('new');
      expect(getAccessToken()).toBe('new');
      expect(getRefreshToken()).toBe('new-refresh');
    });

    it('throws when no refresh token is available', async () => {
      await expect(refresh()).rejects.toThrow(/no refresh token/i);
    });
  });

  describe('logout', () => {
    it('posts the refresh token body and clears local tokens', async () => {
      setTokens({ accessToken: 'a3', refreshToken: 'r3' });
      let bodySeen: unknown = null;
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/logout`, async ({ request }) => {
          bodySeen = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await logout();

      expect(bodySeen).toEqual({ refreshToken: 'r3' });
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it('clears local tokens even when the server returns 500', async () => {
      setTokens({ accessToken: 'a4', refreshToken: 'r4' });
      mswServer.use(
        http.post(`${BASE_URL}/api/auth/logout`, () =>
          new HttpResponse(
            JSON.stringify({
              type: 'about:blank',
              title: 'Internal Server Error',
              status: 500,
              detail: 'Something went wrong',
            }),
            { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      );

      await logout().catch(() => undefined);
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it('is a no-op when no refresh token is persisted', async () => {
      // No MSW handler — if logout calls the server, MSW will fail the test
      // with onUnhandledRequest:'error'.
      await logout();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user profile', async () => {
      setTokens({ accessToken: 'a5', refreshToken: 'r5' });
      mswServer.use(
        http.get(`${BASE_URL}/api/users/me`, () =>
          HttpResponse.json({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@example.com',
            firstName: 'Dev',
            lastName: 'User',
            avatarUrl: null,
          }),
        ),
      );

      const profile = await getCurrentUser();
      expect(profile.email).toBe('dev@example.com');
    });
  });
});

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetTokensForTests,
  REFRESH_TOKEN_KEY,
  getAccessToken,
  getRefreshToken,
} from '../api/tokens';
import { mswServer } from '../test/mswServer';
import { renderWithAuth } from '../test/renderWithAuth';
import { useAuth } from './AuthContext';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function AuthHarness() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="loading">{auth.isLoading ? 'loading' : 'idle'}</p>
      <p data-testid="authed">{auth.isAuthenticated ? 'yes' : 'no'}</p>
      <p data-testid="email">{auth.currentUser?.email ?? '-'}</p>
      <button type="button" onClick={() => auth.signIn('dev@example.com', 'Passw0rd')}>
        sign in
      </button>
      <button
        type="button"
        onClick={() =>
          auth.register({
            email: 'new@example.com',
            password: 'Passw0rd',
            firstName: 'New',
            lastName: 'User',
          })
        }
      >
        register
      </button>
      <button type="button" onClick={() => auth.signOut()}>
        sign out
      </button>
    </div>
  );
}

beforeEach(() => {
  __resetTokensForTests();
});

afterEach(() => {
  __resetTokensForTests();
});

describe('AuthContext', () => {
  it('starts unauthenticated when no refresh token is present', async () => {
    renderWithAuth(<AuthHarness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('idle'),
    );
    expect(screen.getByTestId('authed').textContent).toBe('no');
  });

  it('signIn stores tokens and loads the user profile', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a-login',
          refreshToken: 'r-login',
          expiresIn: 900,
        }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({
          id: 'u-1',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
        }),
      ),
    );

    renderWithAuth(<AuthHarness />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('yes'));
    expect(screen.getByTestId('email').textContent).toBe('dev@example.com');
    expect(getAccessToken()).toBe('a-login');
    expect(getRefreshToken()).toBe('r-login');
  });

  it('register stores tokens and loads the user profile', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () =>
        HttpResponse.json({
          accessToken: 'a-reg',
          refreshToken: 'r-reg',
          expiresIn: 900,
        }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u-2', email: 'new@example.com' }),
      ),
    );

    renderWithAuth(<AuthHarness />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    fireEvent.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('new@example.com'));
    expect(getAccessToken()).toBe('a-reg');
  });

  it('signOut clears tokens and current user', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a-x',
          refreshToken: 'r-x',
          expiresIn: 900,
        }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u-3', email: 'x@example.com' }),
      ),
      http.post(`${BASE_URL}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    );

    renderWithAuth(<AuthHarness />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('yes'));

    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));
    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('no'));
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('hydrates on boot when a refresh token is already in localStorage', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'preexisting');
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, async ({ request }) => {
        const body = (await request.json()) as { refreshToken: string };
        expect(body.refreshToken).toBe('preexisting');
        return HttpResponse.json({
          accessToken: 'a-hydrated',
          refreshToken: 'r-hydrated',
          expiresIn: 900,
        });
      }),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u-h', email: 'hydrated@example.com' }),
      ),
    );

    renderWithAuth(<AuthHarness />);

    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('yes'));
    expect(screen.getByTestId('email').textContent).toBe('hydrated@example.com');
  });

  it('treats a failed boot refresh as signed out', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'expired');
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, () =>
        new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Refresh token revoked',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    renderWithAuth(<AuthHarness />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('idle'));
    expect(screen.getByTestId('authed').textContent).toBe('no');
  });

  it('surfaces a login failure to the caller', async () => {
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

    let capturedError: unknown = null;
    function ErrorHarness() {
      const auth = useAuth();
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await auth.signIn('x@example.com', 'wrong');
            } catch (e) {
              capturedError = e;
            }
          }}
        >
          go
        </button>
      );
    }

    renderWithAuth(<ErrorHarness />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'go' }));
    });
    await waitFor(() => expect(capturedError).not.toBeNull());
  });
});

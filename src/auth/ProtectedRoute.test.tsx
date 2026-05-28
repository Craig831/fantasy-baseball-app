import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REFRESH_TOKEN_KEY,
  __resetTokensForTests,
} from '../api/tokens';
import { mswServer } from '../test/mswServer';
import { AuthProvider } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function LoginScreen() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return (
    <div>
      <p data-testid="route">login</p>
      <p data-testid="redirect-from">{state?.from ?? '-'}</p>
    </div>
  );
}

function PrivateScreen() {
  return <p data-testid="route">private</p>;
}

function renderTree(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <PrivateScreen />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  __resetTokensForTests();
});

afterEach(() => {
  __resetTokensForTests();
});

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', async () => {
    renderTree('/secret');
    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('login'));
  });

  it('preserves the originally requested path in router state', async () => {
    renderTree('/secret');
    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('login'));
    expect(screen.getByTestId('redirect-from').textContent).toBe('/secret');
  });

  it('renders the children when the user is authenticated', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'r1');
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u', email: 'x@example.com' }),
      ),
    );

    renderTree('/secret');
    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('private'));
  });
});

import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetTokensForTests } from '../api/tokens';
import { mswServer } from '../test/mswServer';
import { AuthProvider } from './AuthContext';
import LoginPage from './LoginPage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderLogin(initialEntry: { pathname: string; state?: unknown } = { pathname: '/login' }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <>
                <p data-testid="route">home</p>
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/scoring-configs"
            element={
              <>
                <p data-testid="route">scoring-configs</p>
                <LocationProbe />
              </>
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

describe('LoginPage', () => {
  it('renders email and password fields and the sign-in button', async () => {
    renderLogin();
    await waitFor(() => screen.getByRole('heading', { name: /sign in/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submits successfully and navigates home', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a',
          refreshToken: 'r',
          expiresIn: 900,
        }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u', email: 'dev@example.com' }),
      ),
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'dev@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('home'));
  });

  it('redirects to the original path after sign-in when redirect state is present', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        HttpResponse.json({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u', email: 'dev@example.com' }),
      ),
    );

    renderLogin({ pathname: '/login', state: { from: '/scoring-configs' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'dev@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId('route').textContent).toBe('scoring-configs'),
    );
  });

  it('shows an "Invalid email or password" error on 401', async () => {
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

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'dev@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/invalid email or password/i);
  });

  it('surfaces semicolon-delimited 400 validation errors as separate list items', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Validation Error',
            status: 400,
            detail: 'Email is required; Password is required',
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/email is required/i);
    expect(alert.textContent).toMatch(/password is required/i);
  });

  it('renders a generic message on 500', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/login`, () =>
        new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            detail: 'top-secret stack trace',
          }),
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'whatever' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/something went wrong/i);
    expect(alert.textContent).not.toMatch(/top-secret/i);
  });
});

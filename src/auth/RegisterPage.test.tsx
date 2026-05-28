import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetTokensForTests } from '../api/tokens';
import { mswServer } from '../test/mswServer';
import { AuthProvider } from './AuthContext';
import RegisterPage from './RegisterPage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<p data-testid="route">home</p>} />
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

describe('RegisterPage', () => {
  it('blocks submit when password is too short', async () => {
    let serverHit = false;
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () => {
        serverHit = true;
        return HttpResponse.json({});
      }),
    );

    renderRegister();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/at least 8 characters/i);
    expect(serverHit).toBe(false);
  });

  it('blocks submit when password has no digit', async () => {
    let serverHit = false;
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () => {
        serverHit = true;
        return HttpResponse.json({});
      }),
    );

    renderRegister();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'nodigitsX' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/must contain at least one digit/i);
    expect(serverHit).toBe(false);
  });

  it('submits when client-side validation passes and navigates home', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () =>
        HttpResponse.json({
          accessToken: 'a',
          refreshToken: 'r',
          expiresIn: 900,
        }),
      ),
      http.get(`${BASE_URL}/api/users/me`, () =>
        HttpResponse.json({ id: 'u', email: 'new@example.com' }),
      ),
    );

    renderRegister();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('home'));
  });

  it('renders semicolon-delimited 400 errors as inline list items', async () => {
    mswServer.use(
      http.post(`${BASE_URL}/api/auth/register`, () =>
        new HttpResponse(
          JSON.stringify({
            type: 'about:blank',
            title: 'Validation Error',
            status: 400,
            detail: 'Email is already in use; Password must be at least 8 characters',
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    renderRegister();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'taken@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    const items = alert.querySelectorAll('li');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(alert.textContent).toMatch(/already in use/i);
    expect(alert.textContent).toMatch(/at least 8 characters/i);
  });
});

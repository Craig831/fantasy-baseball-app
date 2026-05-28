/**
 * Test helper that renders a tree under the real providers used at runtime
 * (BrowserRouter substitute, AuthProvider). MSW intercepts the network calls
 * the AuthProvider makes on hydration.
 */

import React from 'react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthProvider } from '../auth/AuthContext';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: MemoryRouterProps['initialEntries'];
}

export function renderWithAuth(
  ui: React.ReactElement,
  { initialEntries, ...rest }: Options = {},
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries ?? ['/']}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...rest });
}

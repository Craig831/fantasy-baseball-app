import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import LoginPage from './LoginPage';

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}));

describe('LoginPage accessibility', () => {
  it('has no critical or serious axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

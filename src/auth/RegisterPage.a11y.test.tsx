import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import RegisterPage from './RegisterPage';

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ register: vi.fn() }),
}));

describe('RegisterPage accessibility', () => {
  it('has no critical or serious axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

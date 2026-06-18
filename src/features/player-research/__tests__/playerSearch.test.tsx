import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { mswServer } from '../../../test/mswServer';
import { __resetTokensForTests } from '../../../api/tokens';
import PlayerResearch from '../../../pages/PlayerResearch/PlayerResearchPage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    mlbPlayerId: 592450,
    fullName: 'Aaron Judge',
    primaryPosition: 'RF',
    mlbTeam: { mlbTeamId: 147, name: 'New York Yankees', abbreviation: 'NYY' },
    status: 'Active',
    jellyScore: 42.5,
    ...overrides,
  };
}

function makePage(items = [makePlayer()]) {
  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

// Scoring-configs with no configs (avoids unhandled-request errors)
function noScoringConfigs() {
  return http.get(`${BASE_URL}/api/scoring-configs`, () => HttpResponse.json([]));
}

// Saved searches with no entries
function noSavedSearches() {
  return http.get(`${BASE_URL}/api/saved-searches`, () => HttpResponse.json([]));
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlayerResearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => __resetTokensForTests());
afterEach(() => __resetTokensForTests());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('player search flow', () => {
  it('displays the initial player list on mount', async () => {
    mswServer.use(
      noScoringConfigs(),
      noSavedSearches(),
      http.get(`${BASE_URL}/api/players`, () => HttpResponse.json(makePage())),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Aaron Judge')).toBeInTheDocument(),
    );
    expect(screen.getByText('NYY')).toBeInTheDocument();
  });

  it('fires a new request when Apply Filters is clicked', async () => {
    let requestCount = 0;
    const requestSearches: string[] = [];

    mswServer.use(
      noScoringConfigs(),
      noSavedSearches(),
      http.get(`${BASE_URL}/api/players`, ({ request }) => {
        requestCount++;
        requestSearches.push(new URL(request.url).search);
        return HttpResponse.json(makePage());
      }),
    );

    renderPage();
    await waitFor(() => expect(requestCount).toBe(1));

    // Change the status filter (makes the form dirty → enables Apply)
    fireEvent.change(screen.getByLabelText('Player status'), {
      target: { value: 'inactive' },
    });

    // Wait for Apply button to become enabled
    const applyBtn = screen.getByText('Apply Filters');
    await waitFor(() => expect(applyBtn).not.toBeDisabled());

    fireEvent.click(applyBtn);

    await waitFor(() => expect(requestCount).toBe(2));
    expect(requestSearches[1]).toContain('statusCode=inactive');
  });

  it('fires a new request with updated sort params when a column header is clicked', async () => {
    const requestSearches: string[] = [];

    mswServer.use(
      noScoringConfigs(),
      noSavedSearches(),
      http.get(`${BASE_URL}/api/players`, ({ request }) => {
        requestSearches.push(new URL(request.url).search);
        return HttpResponse.json(makePage());
      }),
    );

    renderPage();
    await waitFor(() => expect(screen.getByText('Aaron Judge')).toBeInTheDocument());

    // Click the "Pos" column header (key: 'position')
    fireEvent.click(screen.getByText('Pos ↕'));

    await waitFor(() => expect(requestSearches.length).toBe(2));
    expect(requestSearches[1]).toContain('sortBy=position');
    expect(requestSearches[1]).toContain('sortOrder=asc');
  });

  it('opens score breakdown modal after selecting a scoring config and clicking a score', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () =>
        HttpResponse.json([{ id: 'cfg-1', name: 'Standard', categoriesJson: '[]', createdAt: '2025-01-01T00:00:00Z' }]),
      ),
      noSavedSearches(),
      http.get(`${BASE_URL}/api/players`, () => HttpResponse.json(makePage())),
      http.get(`${BASE_URL}/api/players/592450/score-breakdown`, () =>
        HttpResponse.json({
          mlbPlayerId: 592450,
          scoringConfigId: 'cfg-1',
          totalScore: 42.5,
          categories: [{ name: 'HR', statValue: 10, weight: 3.0, points: 30.0 }],
        }),
      ),
    );

    renderPage();

    // Wait for players to load
    await waitFor(() =>
      expect(screen.getByText('Aaron Judge')).toBeInTheDocument(),
    );

    // Wait for scoring config selector to load, then select a config
    const configSelect = await screen.findByLabelText('Scoring Configuration:');
    fireEvent.change(configSelect, { target: { value: 'cfg-1' } });

    // Score button should now be visible (score columns are shown when a config is selected)
    const scoreBtn = await screen.findByTitle('Click for score breakdown');
    fireEvent.click(scoreBtn);

    // Modal should appear with breakdown data
    await waitFor(() => {
      expect(
        screen.getByText('Score Breakdown: Aaron Judge'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('HR')).toBeInTheDocument();
  });
});

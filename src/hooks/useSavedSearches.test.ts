import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import {
  savedSearchesKeys,
  useCreateSavedSearchMutation,
  useSavedSearchesQuery,
} from './useSavedSearches';
import { stringifySavedSearchFilters } from '../api/jsonBlobs';
import type { SavedSearchDto } from '../api/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { queryClient, Wrapper };
}

function makeSearch(overrides: Partial<SavedSearchDto> = {}): SavedSearchDto {
  return {
    id: 'ss-1',
    name: 'Power Hitters',
    filtersJson: stringifySavedSearchFilters({
      nameQuery: null,
      positionId: null,
      mlbTeamId: null,
      statusCode: null,
      availability: null,
    }),
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('savedSearchesKeys', () => {
  it('list key is stable', () => {
    expect(savedSearchesKeys.list()).toEqual(savedSearchesKeys.list());
  });
});

describe('useSavedSearchesQuery', () => {
  it('fetches and exposes the saved searches list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/saved-searches`, () =>
        HttpResponse.json([makeSearch(), makeSearch({ id: 'ss-2', name: 'Free Agents' })]),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSavedSearchesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Power Hitters');
    expect(result.current.data![1].name).toBe('Free Agents');
  });

  it('exposes an empty list when no searches exist', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/saved-searches`, () => HttpResponse.json([])),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSavedSearchesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});

describe('useCreateSavedSearchMutation', () => {
  it('POSTs and invalidates the list cache on success', async () => {
    const created = makeSearch({ id: 'ss-new', name: 'New Search' });
    mswServer.use(
      http.get(`${BASE_URL}/api/saved-searches`, () => HttpResponse.json([])),
      http.post(`${BASE_URL}/api/saved-searches`, () =>
        HttpResponse.json(created, { status: 201 }),
      ),
    );

    // gcTime: Infinity keeps the prefetched entry alive so isInvalidated is readable
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    await queryClient.prefetchQuery({
      queryKey: ['savedSearches', 'list'],
      queryFn: () => Promise.resolve([] as typeof created[]),
    });

    const { result } = renderHook(() => useCreateSavedSearchMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'New Search',
        filtersJson: stringifySavedSearchFilters({
          nameQuery: 'judge',
          positionId: null,
          mlbTeamId: 147,
          statusCode: null,
          availability: null,
        }),
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('New Search');
    const cached = queryClient.getQueryState(['savedSearches', 'list']);
    expect(cached?.isInvalidated).toBe(true);
  });
});

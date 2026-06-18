import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../test/mswServer';
import {
  scoringConfigsKeys,
  useCreateScoringConfigMutation,
  useScoringConfigsQuery,
} from './useScoringConfigs';
import type { ScoringConfigDto } from '../api/types';

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

function makeConfig(overrides: Partial<ScoringConfigDto> = {}): ScoringConfigDto {
  return {
    id: 'cfg-1',
    name: 'Standard',
    categoriesJson: '[{"statKey":"HR","pointValue":4}]',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('scoringConfigsKeys', () => {
  it('list key is stable', () => {
    expect(scoringConfigsKeys.list()).toEqual(scoringConfigsKeys.list());
  });

  it('detail key includes the id', () => {
    expect(scoringConfigsKeys.detail('cfg-1')).toContain('cfg-1');
  });

  it('different ids produce different detail keys', () => {
    expect(scoringConfigsKeys.detail('cfg-1')).not.toEqual(scoringConfigsKeys.detail('cfg-2'));
  });
});

describe('useScoringConfigsQuery', () => {
  it('fetches and exposes the configs list', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () =>
        HttpResponse.json([makeConfig(), makeConfig({ id: 'cfg-2', name: 'Custom' })]),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useScoringConfigsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Standard');
    expect(result.current.data![1].id).toBe('cfg-2');
  });

  it('starts in loading state then transitions to success', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () => HttpResponse.json([])),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useScoringConfigsQuery(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('exposes error state on failure', async () => {
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useScoringConfigsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateScoringConfigMutation', () => {
  it('POSTs and invalidates the list cache on success', async () => {
    const created = makeConfig({ id: 'cfg-new', name: 'New Config' });
    mswServer.use(
      http.get(`${BASE_URL}/api/scoring-configs`, () => HttpResponse.json([makeConfig()])),
      http.post(`${BASE_URL}/api/scoring-configs`, () =>
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
    const { result } = renderHook(() => useCreateScoringConfigMutation(), { wrapper: Wrapper });

    await queryClient.prefetchQuery({
      queryKey: ['scoringConfigs', 'list'],
      queryFn: () => Promise.resolve([makeConfig()]),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'New Config',
        categoriesJson: '[{"statKey":"HR","pointValue":4}]',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('cfg-new');
    const cached = queryClient.getQueryState(['scoringConfigs', 'list']);
    expect(cached?.isInvalidated).toBe(true);
  });
});

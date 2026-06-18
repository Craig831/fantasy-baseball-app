import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSavedSearch, getSavedSearches } from '../api/savedSearches';
import type { CreateSavedSearchRequest } from '../api/types';

export const savedSearchesKeys = {
  all: () => ['savedSearches'] as const,
  list: () => [...savedSearchesKeys.all(), 'list'] as const,
};

export function useSavedSearchesQuery() {
  return useQuery({
    queryKey: savedSearchesKeys.list(),
    queryFn: getSavedSearches,
  });
}

export function useCreateSavedSearchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateSavedSearchRequest) => createSavedSearch(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedSearchesKeys.list() });
    },
  });
}

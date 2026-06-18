import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createScoringConfig, getScoringConfigById, getScoringConfigs } from '../api/scoringConfigs';
import type { CreateScoringConfigRequest } from '../api/types';

export const scoringConfigsKeys = {
  all: () => ['scoringConfigs'] as const,
  list: () => [...scoringConfigsKeys.all(), 'list'] as const,
  detail: (id: string) => [...scoringConfigsKeys.all(), 'detail', id] as const,
};

export function useScoringConfigsQuery() {
  return useQuery({
    queryKey: scoringConfigsKeys.list(),
    queryFn: getScoringConfigs,
  });
}

export function useScoringConfigQuery(id: string) {
  return useQuery({
    queryKey: scoringConfigsKeys.detail(id),
    queryFn: () => getScoringConfigById(id),
    enabled: Boolean(id),
  });
}

export function useCreateScoringConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateScoringConfigRequest) => createScoringConfig(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringConfigsKeys.list() });
    },
  });
}

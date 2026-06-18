import { apiClient } from './client';
import type { ScoringConfigDto, CreateScoringConfigRequest } from './types';

export async function getScoringConfigs(): Promise<ScoringConfigDto[]> {
  const response = await apiClient.get<ScoringConfigDto[]>('/api/scoring-configs');
  return response.data;
}

export async function createScoringConfig(
  request: CreateScoringConfigRequest,
): Promise<ScoringConfigDto> {
  const response = await apiClient.post<ScoringConfigDto>('/api/scoring-configs', request);
  return response.data;
}

export async function getScoringConfigById(id: string): Promise<ScoringConfigDto> {
  const response = await apiClient.get<ScoringConfigDto>(`/api/scoring-configs/${id}`);
  return response.data;
}

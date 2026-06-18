import { apiClient } from './client';
import type { SavedSearchDto, CreateSavedSearchRequest } from './types';

export async function getSavedSearches(): Promise<SavedSearchDto[]> {
  const response = await apiClient.get<SavedSearchDto[]>('/api/saved-searches');
  return response.data;
}

export async function createSavedSearch(
  request: CreateSavedSearchRequest,
): Promise<SavedSearchDto> {
  const response = await apiClient.post<SavedSearchDto>('/api/saved-searches', request);
  return response.data;
}

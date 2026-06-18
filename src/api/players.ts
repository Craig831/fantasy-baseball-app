/**
 * Players API — wraps GET /api/players and related filter/detail endpoints.
 * Source of truth: contracts/players.md
 *
 * Note: response body shapes are hand-typed in types.ts (the Swagger document
 * omits response schemas for these endpoints). Adjust field names here if the
 * live API deviates from the expected shapes.
 */

import { apiClient } from './client';
import type {
  PagedResult,
  PlayerProfileDto,
  PlayerSearchParams,
  PlayerSummaryDto,
  PositionDto,
  ScoreBreakdownDto,
  TeamSummaryDto,
} from './types';

export async function searchPlayers(
  params: PlayerSearchParams,
): Promise<PagedResult<PlayerSummaryDto>> {
  const response = await apiClient.get<PagedResult<PlayerSummaryDto>>('/api/players', {
    params,
    paramsSerializer: { indexes: null },
  });
  return response.data;
}

export async function getPlayerById(
  mlbPlayerId: number,
  leagueId?: number,
): Promise<PlayerProfileDto> {
  const response = await apiClient.get<PlayerProfileDto>(`/api/players/${mlbPlayerId}`, {
    params: leagueId !== undefined ? { leagueId } : undefined,
  });
  return response.data;
}

export async function getTeams(): Promise<TeamSummaryDto[]> {
  const response = await apiClient.get<TeamSummaryDto[]>('/api/players/filters/teams');
  return response.data;
}

export async function getPositions(): Promise<PositionDto[]> {
  const response = await apiClient.get<PositionDto[]>('/api/players/filters/positions');
  return response.data;
}

export async function getPlayerScoreBreakdown(
  mlbPlayerId: number,
  scoringConfigId: string,
): Promise<ScoreBreakdownDto> {
  const response = await apiClient.get<ScoreBreakdownDto>(
    `/api/players/${mlbPlayerId}/score-breakdown`,
    { params: { scoringConfigId } },
  );
  return response.data;
}

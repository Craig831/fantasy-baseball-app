import { useQuery } from '@tanstack/react-query';

import {
  getPlayerById,
  getPlayerScoreBreakdown,
  getPositions,
  getTeams,
  searchPlayers,
} from '../../../api/players';
import type { PlayerSearchParams } from '../../../api/types';

// ── Query key factory ─────────────────────────────────────────────────────────

export const playersKeys = {
  all: ['players'] as const,
  lists: () => [...playersKeys.all, 'list'] as const,
  list: (params: PlayerSearchParams) => [...playersKeys.lists(), params] as const,
  details: () => [...playersKeys.all, 'detail'] as const,
  detail: (mlbPlayerId: number, leagueId?: number) =>
    [...playersKeys.details(), mlbPlayerId, leagueId] as const,
  teams: () => ['players', 'teams'] as const,
  positions: () => ['players', 'positions'] as const,
  scoreBreakdown: (mlbPlayerId: number, scoringConfigId: string) =>
    ['players', 'scoreBreakdown', mlbPlayerId, scoringConfigId] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePlayersQuery(params: PlayerSearchParams) {
  return useQuery({
    queryKey: playersKeys.list(params),
    queryFn: () => searchPlayers(params),
  });
}

export function usePlayerQuery(mlbPlayerId: number, leagueId?: number) {
  return useQuery({
    queryKey: playersKeys.detail(mlbPlayerId, leagueId),
    queryFn: () => getPlayerById(mlbPlayerId, leagueId),
  });
}

export function useTeamsQuery() {
  return useQuery({
    queryKey: playersKeys.teams(),
    queryFn: getTeams,
    staleTime: 24 * 60 * 60 * 1000, // teams change once a season
  });
}

export function usePositionsQuery() {
  return useQuery({
    queryKey: playersKeys.positions(),
    queryFn: getPositions,
    staleTime: 24 * 60 * 60 * 1000, // positions are effectively static
  });
}

export function usePlayerScoreBreakdownQuery(
  mlbPlayerId: number,
  scoringConfigId: string | undefined,
) {
  return useQuery({
    queryKey: playersKeys.scoreBreakdown(mlbPlayerId, scoringConfigId ?? ''),
    queryFn: () => getPlayerScoreBreakdown(mlbPlayerId, scoringConfigId!),
    enabled: mlbPlayerId !== 0 && scoringConfigId !== undefined && scoringConfigId !== '',
  });
}

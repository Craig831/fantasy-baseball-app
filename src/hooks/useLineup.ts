import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addFreeAgent,
  getLineup,
  getRoster,
  getTeamDashboard,
  moveRosterSpot,
  setLineupSlot,
} from '../api/teams';
import type { AddFreeAgentRequest, MoveRosterSpotRequest, SetLineupSlotRequest } from '../api/types';

export const lineupKeys = {
  all: (leagueId: number) => ['lineup', leagueId] as const,
  dashboard: (leagueId: number) => [...lineupKeys.all(leagueId), 'dashboard'] as const,
  roster: (leagueId: number) => [...lineupKeys.all(leagueId), 'roster'] as const,
  week: (leagueId: number, week: number) => [...lineupKeys.all(leagueId), 'week', week] as const,
};

export function useTeamDashboardQuery(leagueId: number) {
  return useQuery({
    queryKey: lineupKeys.dashboard(leagueId),
    queryFn: () => getTeamDashboard(leagueId),
    enabled: leagueId > 0,
  });
}

export function useRosterQuery(leagueId: number) {
  return useQuery({
    queryKey: lineupKeys.roster(leagueId),
    queryFn: () => getRoster(leagueId),
    enabled: leagueId > 0,
  });
}

export function useLineupQuery(leagueId: number, week: number) {
  return useQuery({
    queryKey: lineupKeys.week(leagueId, week),
    queryFn: () => getLineup(leagueId, week),
    enabled: leagueId > 0 && week > 0,
  });
}

export function useMoveRosterSpotMutation(leagueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MoveRosterSpotRequest) => moveRosterSpot(leagueId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lineupKeys.roster(leagueId) });
    },
  });
}

export function useSetLineupSlotMutation(leagueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SetLineupSlotRequest) => setLineupSlot(leagueId, request),
    onSuccess: () => {
      const weekQuery = lineupKeys.week(leagueId, 0);
      queryClient.invalidateQueries({ queryKey: weekQuery.slice(0, 3) });
    },
  });
}

export function useAddFreeAgentMutation(leagueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AddFreeAgentRequest) => addFreeAgent(leagueId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lineupKeys.roster(leagueId) });
    },
  });
}

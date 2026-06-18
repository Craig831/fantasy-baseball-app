import { apiClient } from './client';
import type {
  AddFreeAgentRequest,
  MoveRosterSpotRequest,
  RosterSpotDto,
  SetLineupSlotRequest,
  TeamDashboardDto,
  TeamLineupDto,
} from './types';

export async function getTeamDashboard(leagueId: number): Promise<TeamDashboardDto> {
  const response = await apiClient.get<TeamDashboardDto>(
    `/api/leagues/${leagueId}/teams/me/dashboard`,
  );
  return response.data;
}

export async function getRoster(leagueId: number): Promise<RosterSpotDto[]> {
  const response = await apiClient.get<RosterSpotDto[]>(
    `/api/leagues/${leagueId}/teams/me/roster`,
  );
  return response.data;
}

export async function moveRosterSpot(
  leagueId: number,
  request: MoveRosterSpotRequest,
): Promise<void> {
  await apiClient.put(`/api/leagues/${leagueId}/teams/me/roster/move`, request);
}

export async function getLineup(leagueId: number, week: number): Promise<TeamLineupDto> {
  const response = await apiClient.get<TeamLineupDto>(
    `/api/leagues/${leagueId}/teams/me/lineup/${week}`,
  );
  return response.data;
}

export async function setLineupSlot(
  leagueId: number,
  request: SetLineupSlotRequest,
): Promise<void> {
  await apiClient.put(`/api/leagues/${leagueId}/teams/me/lineup`, request);
}

export async function addFreeAgent(
  leagueId: number,
  request: AddFreeAgentRequest,
): Promise<void> {
  await apiClient.post(`/api/leagues/${leagueId}/free-agents/add`, request);
}

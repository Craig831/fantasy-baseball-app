import { apiClient } from './client';
import type {
  CreateLeagueRequest,
  DraftSettingsDto,
  JoinLeagueRequest,
  LeagueDto,
  LeagueInviteCodeDto,
  LeagueInvitePreviewDto,
  LeagueMemberDto,
  LeagueSummaryDto,
  RosterSettingsDto,
  ScoringSettingsDto,
} from './types';

export async function getLeagues(): Promise<LeagueSummaryDto[]> {
  const response = await apiClient.get<LeagueSummaryDto[]>('/api/leagues');
  return response.data;
}

export async function createLeague(request: CreateLeagueRequest): Promise<LeagueDto> {
  const response = await apiClient.post<LeagueDto>('/api/leagues', request);
  return response.data;
}

export async function getLeagueById(leagueId: number): Promise<LeagueDto> {
  const response = await apiClient.get<LeagueDto>(`/api/leagues/${leagueId}`);
  return response.data;
}

export async function archiveLeague(leagueId: number): Promise<void> {
  await apiClient.post(`/api/leagues/${leagueId}/archive`);
}

export async function getLeagueMembers(leagueId: number): Promise<LeagueMemberDto[]> {
  const response = await apiClient.get<LeagueMemberDto[]>(`/api/leagues/${leagueId}/members`);
  return response.data;
}

export async function getLeagueInviteCode(leagueId: number): Promise<LeagueInviteCodeDto> {
  const response = await apiClient.get<LeagueInviteCodeDto>(
    `/api/leagues/${leagueId}/invite-code`,
  );
  return response.data;
}

export async function previewLeagueInvite(token: string): Promise<LeagueInvitePreviewDto> {
  const response = await apiClient.get<LeagueInvitePreviewDto>(
    `/api/leagues/invite/${token}`,
  );
  return response.data;
}

export async function joinLeague(request: JoinLeagueRequest): Promise<void> {
  await apiClient.post('/api/leagues/join', request);
}

export async function getRosterSettings(leagueId: number): Promise<RosterSettingsDto> {
  const response = await apiClient.get<RosterSettingsDto>(
    `/api/leagues/${leagueId}/settings/roster`,
  );
  return response.data;
}

export async function getScoringSettings(leagueId: number): Promise<ScoringSettingsDto> {
  const response = await apiClient.get<ScoringSettingsDto>(
    `/api/leagues/${leagueId}/settings/scoring`,
  );
  return response.data;
}

export async function getDraftSettings(leagueId: number): Promise<DraftSettingsDto> {
  const response = await apiClient.get<DraftSettingsDto>(
    `/api/leagues/${leagueId}/settings/draft`,
  );
  return response.data;
}

export async function startDraft(leagueId: number): Promise<void> {
  await apiClient.post(`/api/leagues/${leagueId}/settings/draft/start`);
}

export async function pauseDraft(leagueId: number): Promise<void> {
  await apiClient.post(`/api/leagues/${leagueId}/settings/draft/pause`);
}

export async function resumeDraft(leagueId: number): Promise<void> {
  await apiClient.post(`/api/leagues/${leagueId}/settings/draft/resume`);
}

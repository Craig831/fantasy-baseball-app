import React, { useState } from 'react';
import FilterPanel from '../../components/player-research/FilterPanel';
import PlayerList from '../../components/player-research/PlayerList';
import ScoringConfigSelector from '../../components/player-research/ScoringConfigSelector';
import ScoreBreakdownModal from '../../components/player-research/ScoreBreakdownModal';
import type { ScoringConfig, PlayerResult } from '../../features/player-research/types/player-result';
import { usePlayersQuery, usePlayerScoreBreakdownQuery } from '../../features/player-research/hooks/usePlayersQuery';
import type { PlayerSearchParams, PlayerSummaryDto } from '../../api/types';
import './PlayerResearch.css';

function toPlayerResult(dto: PlayerSummaryDto): PlayerResult {
  return {
    id: String(dto.mlbPlayerId),
    mlbPlayerId: dto.mlbPlayerId,
    name: dto.fullName,
    position: dto.primaryPosition,
    teamAbbr: dto.mlbTeam?.abbreviation ?? '--',
    status: dto.status as PlayerResult['status'],
    totalPoints: dto.jellyScore ?? null,
    pointsPerGame: null,
    statistics: {},
    lastUpdated: new Date().toISOString(),
  };
}

const PlayerResearch: React.FC = () => {
  const [queryParams, setQueryParams] = useState<PlayerSearchParams>({
    pageNumber: 1,
    pageSize: 50,
    sortBy: 'fullName',
    sortOrder: 'asc',
  });
  const [scoringConfigId, setScoringConfigId] = useState<string | null>(null);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
  const [statisticType, setStatisticType] = useState<'hitting' | 'pitching'>('hitting');
  const [selectedMlbPlayerId, setSelectedMlbPlayerId] = useState<number | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');

  const { data, isLoading, error } = usePlayersQuery(queryParams);
  const scoreBreakdownQuery = usePlayerScoreBreakdownQuery(
    selectedMlbPlayerId ?? 0,
    scoringConfigId ?? undefined,
  );

  const players: PlayerResult[] = (data?.items ?? []).map(toPlayerResult);

  const pagination = data
    ? {
        page: data.pageNumber,
        limit: data.pageSize,
        total: data.totalCount,
        totalPages: data.totalPages,
        hasMore: data.hasNextPage,
      }
    : null;

  const handleConfigChange = (configId: string | null) => {
    setScoringConfigId(configId);
    // Provide a minimal ScoringConfig so PlayerList shows the score column.
    // The API already calculates jellyScore on the summary; we don't need
    // category weights here — empty categories simply suppress stat-column filtering.
    setScoringConfig(
      configId ? { id: configId, name: '', categories: { hitting: {}, pitching: {} } } : null,
    );
  };

  const handleFilterChange = (newFilters: any) => {
    setStatisticType(newFilters.statisticType ?? 'hitting');
    setQueryParams(prev => ({
      ...prev,
      pageNumber: 1,
      statusCode: newFilters.status,
    }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams(prev => ({ ...prev, pageNumber: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setQueryParams(prev => ({ ...prev, sortBy: field, sortOrder: direction, pageNumber: 1 }));
  };

  const handlePlayerClick = (_player: PlayerResult) => {
    // Future: navigate to player detail page
  };

  const handleScoreClick = (player: PlayerResult) => {
    if (!scoringConfigId) return;
    setSelectedMlbPlayerId(player.mlbPlayerId);
    setSelectedPlayerName(player.name);
  };

  const closeScoreBreakdown = () => {
    setSelectedMlbPlayerId(null);
    setSelectedPlayerName('');
  };

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="player-research-page">
        <div className="page-header">
          <h1>Player Research</h1>
          <p className="page-description">
            Search and filter baseball players to analyze performance and build your lineup.
          </p>
        </div>

        <ScoringConfigSelector
          selectedConfigId={scoringConfigId}
          onConfigChange={handleConfigChange}
        />

        {!scoringConfigId && (
          <div className="no-config-message">
            Select a scoring configuration above to see player scores
          </div>
        )}

        <div className="page-content">
          <FilterPanel onFiltersApplied={handleFilterChange} />

          <PlayerList
            players={players}
            loading={isLoading}
            error={errorMessage}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPlayerClick={handlePlayerClick}
            onScoreClick={handleScoreClick}
            onSortChange={handleSortChange}
            statisticType={statisticType}
            scoringConfig={scoringConfig}
          />
        </div>

        {selectedMlbPlayerId !== null && scoreBreakdownQuery.data && (
          <ScoreBreakdownModal
            breakdown={scoreBreakdownQuery.data}
            playerName={selectedPlayerName}
            onClose={closeScoreBreakdown}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerResearch;

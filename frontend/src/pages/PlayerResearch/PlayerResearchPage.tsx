import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FilterPanel from '../../components/player-research/FilterPanel';
import PlayerList from '../../components/player-research/PlayerList';
import ScoringConfigSelector from '../../components/player-research/ScoringConfigSelector';
import ScoreBreakdownModal from '../../components/player-research/ScoreBreakdownModal';
import { Player, PlayerSearchFilters, ScoreBreakdown } from '../../types/player';
import { searchPlayers, getPositions, getPlayerScoreBreakdown } from '../../services/api';
import { ScoringConfig, PlayerResult } from '../../features/player-research/types/player-result';
import './PlayerResearch.css';

interface SearchResponse {
  players: Player[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const PlayerResearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params or defaults
  const getInitialFilters = (): PlayerSearchFilters => {
    const positions = searchParams.getAll('position');
    const league = searchParams.get('league') as 'both' | 'AL' | 'NL' | null;
    const statisticType = searchParams.get('statisticType') as 'hitting' | 'pitching' | null;
    const status = searchParams.get('status');
    const season = searchParams.get('season');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    return {
      position: positions.length > 0 ? positions : [],
      league: league || 'both',
      statisticType: statisticType || 'hitting',
      status: status || 'active',
      season: season ? parseInt(season, 10) : new Date().getFullYear(),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
  };

  const [filters, setFilters] = useState<PlayerSearchFilters>(getInitialFilters());

  const [players, setPlayers] = useState<Player[]>([]);
  const [pagination, setPagination] = useState<SearchResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [scoringConfigId, setScoringConfigId] = useState<string | null>(null);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load filter options
  const loadPositions = useCallback(async () => {
    try {
      const positionList = await getPositions();
      setPositions(positionList);
    } catch (err) {
      console.error('Failed to load positions:', err);
    }
  }, []);

  // Load full scoring configuration details
  const loadScoringConfig = useCallback(async (configId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/scoring-configs/${configId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load scoring configuration');
      }

      const data = await response.json();
      setScoringConfig(data.data);
    } catch (err) {
      console.error('Failed to load scoring configuration:', err);
      setScoringConfig(null);
    }
  }, []);

  // Search players
  const performSearch = useCallback(async (
    searchFilters: PlayerSearchFilters,
    page: number = 1,
    configId: string | null = null,
    sort?: string,
    order?: 'asc' | 'desc'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchPlayers(searchFilters, page, 50, configId, sort, order);
      setPlayers(response.players);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load players. Please try again.');
      setPlayers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    performSearch(filters, 1, scoringConfigId, sortBy, sortOrder);
    loadPositions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle scoring config change
  const handleConfigChange = (configId: string | null) => {
    setScoringConfigId(configId);
    if (configId) {
      loadScoringConfig(configId);
    } else {
      setScoringConfig(null);
    }
    performSearch(filters, 1, configId, sortBy, sortOrder);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: PlayerSearchFilters) => {
    setFilters(newFilters);

    // Update URL parameters for shareable searches
    const params = new URLSearchParams();
    if (newFilters.position && newFilters.position.length > 0) {
      newFilters.position.forEach(pos => params.append('position', pos));
    }
    if (newFilters.league) params.set('league', newFilters.league);
    if (newFilters.statisticType) params.set('statisticType', newFilters.statisticType);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.season) params.set('season', newFilters.season.toString());
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

    setSearchParams(params, { replace: true });
    performSearch(newFilters, 1, scoringConfigId, sortBy, sortOrder);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    performSearch(filters, page, scoringConfigId, sortBy, sortOrder);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(direction);
    performSearch(filters, 1, scoringConfigId, field, direction);
  };

  // Handle player click
  const handlePlayerClick = (player: Player | PlayerResult) => {
    // Future: Open player details modal or navigate to player page
    console.log('Player clicked:', player);
  };

  // Handle score click to show breakdown
  const handleScoreClick = async (player: Player | PlayerResult) => {
    if (!scoringConfigId) return;

    try {
      const breakdown = await getPlayerScoreBreakdown(player.id, scoringConfigId);
      setScoreBreakdown(breakdown);
      // Convert PlayerResult to Player for the modal (it expects Player type)
      const playerForModal: Player = 'season' in player
        ? player as Player
        : {
            ...player,
            teamId: '',
            season: new Date().getFullYear(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Player;
      setSelectedPlayer(playerForModal);
    } catch (err) {
      console.error('Failed to load score breakdown:', err);
    }
  };

  // Close score breakdown modal
  const closeScoreBreakdown = () => {
    setScoreBreakdown(null);
    setSelectedPlayer(null);
  };

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
        <FilterPanel
          onFiltersApplied={handleFilterChange}
        />

        <PlayerList
          players={players}
          loading={loading}
          error={error}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPlayerClick={handlePlayerClick}
          onScoreClick={handleScoreClick}
          onSortChange={handleSortChange}
          statisticType={filters.statisticType || 'hitting'}
          scoringConfig={scoringConfig}
        />
      </div>

      {scoreBreakdown && selectedPlayer && (
        <ScoreBreakdownModal
          breakdown={scoreBreakdown}
          playerName={selectedPlayer.name}
          onClose={closeScoreBreakdown}
        />
      )}
      </div>
    </div>
  );
};

export default PlayerResearch;

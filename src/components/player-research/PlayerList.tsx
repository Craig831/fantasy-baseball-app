import React, { useState, useMemo } from 'react';
import { Player } from '../../types/player';
import {
  PlayerResult,
  ColumnConfig,
  ScoringConfig,
  getVisibleColumns
} from '../../features/player-research/types/player-result';
import './PlayerList.css';

interface PlayerListProps {
  players: Player[] | PlayerResult[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  onPageChange: (page: number) => void;
  onPlayerClick?: (player: Player | PlayerResult) => void;
  onScoreClick?: (player: Player | PlayerResult) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  statisticType: 'hitting' | 'pitching';
  scoringConfig?: ScoringConfig | null;
}

type SortField = 'name' | 'team' | 'position' | 'score';
type SortDirection = 'asc' | 'desc';

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  loading,
  error,
  pagination,
  onPageChange,
  onPlayerClick,
  onScoreClick,
  onSortChange,
  statisticType,
  scoringConfig,
}) => {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Calculate visible columns based on statistic type and scoring config
  const visibleColumns = useMemo(() => {
    return getVisibleColumns(statisticType, scoringConfig);
  }, [statisticType, scoringConfig]);

  const handleSort = (field: string) => {
    let newDirection: SortDirection;

    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = 'asc';
    }

    setSortField(field);
    setSortDirection(newDirection);

    // Trigger server-side sort if handler provided
    if (onSortChange) {
      onSortChange(field, newDirection);
    }
  };

  // Helper function to render cell content based on column configuration
  const renderCell = (player: Player | PlayerResult, col: ColumnConfig) => {
    const isPlayerResult = 'totalPoints' in player;

    if (col.key === 'playerName') {
      return player.name;
    }

    if (col.key === 'position') {
      return player.position;
    }

    if (col.key === 'teamAbbr') {
      if (isPlayerResult) {
        return (player as PlayerResult).teamAbbr;
      }
      return (player as Player).team?.abbreviation || (player as Player).team?.name || '--';
    }

    if (col.key === 'totalPoints') {
      if (isPlayerResult) {
        const totalPoints = (player as PlayerResult).totalPoints;
        return totalPoints !== null ? (
          <button
            className="score-button"
            onClick={(e) => {
              e.stopPropagation();
              onScoreClick?.(player);
            }}
            title="Click for score breakdown"
          >
            {totalPoints.toFixed(1)}
          </button>
        ) : '--';
      }
      return (player as Player).score !== undefined ? (player as Player).score?.toFixed(1) : '--';
    }

    if (col.key === 'pointsPerGame') {
      if (isPlayerResult) {
        const ppg = (player as PlayerResult).pointsPerGame;
        return ppg !== null ? ppg.toFixed(2) : '--';
      }
      return '--';
    }

    // Handle statistic columns
    if (col.statKey && isPlayerResult) {
      const stats = (player as PlayerResult).statistics;
      if (stats && stats[col.statKey] !== undefined) {
        return stats[col.statKey];
      }
      return '--';
    }

    return '--';
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    // Handle legacy sorting fields
    switch (sortField) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'team':
        if ('teamAbbr' in a) {
          aValue = (a as PlayerResult).teamAbbr || '';
          bValue = (b as PlayerResult).teamAbbr || '';
        } else {
          aValue = (a as Player).team?.name || '';
          bValue = (b as Player).team?.name || '';
        }
        break;
      case 'position':
        aValue = a.position;
        bValue = b.position;
        break;
      case 'score':
        if ('totalPoints' in a) {
          aValue = (a as PlayerResult).totalPoints || 0;
          bValue = (b as PlayerResult).totalPoints || 0;
        } else {
          aValue = (a as Player).score || 0;
          bValue = (b as Player).score || 0;
        }
        break;
      default:
        // Handle dynamic column sorting
        if ('statistics' in a && 'statistics' in a) {
          const aStats = (a as PlayerResult).statistics;
          const bStats = (b as PlayerResult).statistics;
          aValue = aStats?.[sortField] || 0;
          bValue = bStats?.[sortField] || 0;
        }
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  if (loading) {
    return (
      <div className="player-list-loading">
        <div className="spinner"></div>
        <p>Loading players...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-list-error">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="player-list-empty">
        <p>No players found matching your criteria.</p>
        <p className="hint">Try adjusting your filters.</p>
      </div>
    );
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="player-list-container">
      <div className="player-list-header">
        <h3>Players ({statisticType === 'hitting' ? 'Hitting' : 'Pitching'} Stats)</h3>
        {pagination && (
          <span className="result-count">
            Showing {players.length} of {pagination.total} players
          </span>
        )}
      </div>

      <div className="player-table-wrapper">
        <table className="player-table">
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={col.sortable ? 'sortable' : ''}
                  style={col.sticky ? { position: 'sticky', left: 0, zIndex: 10, background: 'white' } : {}}
                  aria-sort={sortField === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.label} {col.sortable && getSortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr
                key={player.id}
                className="player-row"
                onClick={() => onPlayerClick?.(player)}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`${col.key}-cell`}
                    style={col.sticky ? { position: 'sticky', left: 0, zIndex: 5, background: 'white' } : {}}
                  >
                    {renderCell(player, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>

          <div className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </div>

          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasMore}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerList;

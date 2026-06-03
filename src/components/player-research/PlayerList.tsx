import React, { useState, useMemo } from 'react';
import {
  PlayerResult,
  ColumnConfig,
  ScoringConfig,
  getVisibleColumns
} from '../../features/player-research/types/player-result';
import './PlayerList.css';

interface PlayerListProps {
  players: PlayerResult[];
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
  onPlayerClick?: (player: PlayerResult) => void;
  onScoreClick?: (player: PlayerResult) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  statisticType: 'hitting' | 'pitching';
  scoringConfig?: ScoringConfig | null;
}

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

  const visibleColumns = useMemo(() => {
    return getVisibleColumns(statisticType, scoringConfig);
  }, [statisticType, scoringConfig]);

  const handleSort = (field: string) => {
    const newDirection: SortDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSortChange?.(field, newDirection);
  };

  const renderCell = (player: PlayerResult, col: ColumnConfig) => {
    if (col.key === 'playerName') return player.name;
    if (col.key === 'position') return player.position;
    if (col.key === 'teamAbbr') return player.teamAbbr;

    if (col.key === 'totalPoints') {
      return player.totalPoints !== null ? (
        <button
          className="score-button"
          onClick={(e) => {
            e.stopPropagation();
            onScoreClick?.(player);
          }}
          title="Click for score breakdown"
        >
          {player.totalPoints.toFixed(1)}
        </button>
      ) : '--';
    }

    if (col.key === 'pointsPerGame') {
      return player.pointsPerGame !== null ? player.pointsPerGame.toFixed(2) : '--';
    }

    if (col.statKey) {
      const val = player.statistics?.[col.statKey];
      return val !== undefined ? val : '--';
    }

    return '--';
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'name':       aVal = a.name;     bVal = b.name;     break;
      case 'team':       aVal = a.teamAbbr; bVal = b.teamAbbr; break;
      case 'position':   aVal = a.position; bVal = b.position; break;
      case 'score':      aVal = a.totalPoints ?? 0; bVal = b.totalPoints ?? 0; break;
      default:
        aVal = a.statistics?.[sortField] ?? 0;
        bVal = b.statistics?.[sortField] ?? 0;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
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

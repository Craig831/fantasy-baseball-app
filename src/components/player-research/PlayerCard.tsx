import React from 'react';
import { Player } from '../../types/player';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  onScoreClick?: () => void;
  statisticType: 'hitting' | 'pitching';
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, onScoreClick, statisticType }) => {
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row onClick if clicking on score
    if ((e.target as HTMLElement).closest('.score-cell')) {
      return;
    }
    onClick?.();
  };

  const handleScoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onScoreClick?.();
  };

  // Format name as "Lastname, Firstname"
  const formatPlayerName = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return name;

    const firstName = parts.slice(0, -1).join(' ');
    const lastName = parts[parts.length - 1];
    return `${lastName}, ${firstName}`;
  };

  return (
    <tr className="player-row" onClick={handleRowClick}>
      <td className="name-cell">
        <div className="player-name">
          {formatPlayerName(player.name)}
          {player.jerseyNumber && <span className="jersey-number">#{player.jerseyNumber}</span>}
        </div>
      </td>
      <td className="team-cell">
        {player.team?.abbreviation || player.team?.name || 'Unknown'}
      </td>
      <td className="position-cell">{player.position}</td>
      <td className="status-cell">
        <span className={`status-badge status-${player.status}`}>
          {player.status}
        </span>
      </td>
      <td className="season-cell">{player.season}</td>
      <td className="score-cell" onClick={handleScoreClick}>
        {player.score !== undefined ? (
          <span className="score-value" title="Click for score breakdown">
            {player.score.toFixed(1)}
          </span>
        ) : (
          <span className="no-score">--</span>
        )}
      </td>
    </tr>
  );
};

export default PlayerCard;

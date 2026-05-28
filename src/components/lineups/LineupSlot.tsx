/**
 * LineupSlot Component
 * Presentational component for a single lineup slot
 * Displays player information and allows slot management
 */

import React from 'react';
import { LineupSlot as LineupSlotType } from '../../services/lineupService';

interface LineupSlotProps {
  slot: LineupSlotType;
  onPlayerSelect?: (slotOrder: number) => void;
  onPlayerRemove?: (slotOrder: number) => void;
  showScore?: boolean;
  isEditable?: boolean;
}

export const LineupSlot: React.FC<LineupSlotProps> = ({
  slot,
  onPlayerSelect,
  onPlayerRemove,
  showScore = false,
  isEditable = false,
}) => {
  const { player, slotOrder, locked } = slot;

  const handleSelect = () => {
    if (isEditable && !locked && onPlayerSelect) {
      onPlayerSelect(slotOrder);
    }
  };

  const handleRemove = () => {
    if (isEditable && !locked && onPlayerRemove) {
      onPlayerRemove(slotOrder);
    }
  };

  // Empty slot
  if (!player) {
    return (
      <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-md bg-gray-50">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium text-gray-600">
          {slotOrder}
        </div>
        <div className="flex-1">
          {isEditable && !locked ? (
            <button
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              onClick={handleSelect}
              aria-label={`Select player for slot ${slotOrder}`}
            >
              + Add Player
            </button>
          ) : (
            <span className="text-sm text-gray-500">Empty Slot</span>
          )}
        </div>
      </div>
    );
  }

  // Filled slot
  return (
    <div className={`flex items-center space-x-3 p-3 border rounded-md ${locked ? 'border-gray-400 bg-gray-100' : 'border-gray-300 bg-white'}`}>
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-full text-sm font-medium text-indigo-700">
        {slotOrder}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{player.name}</div>
        <div className="text-xs text-gray-500">
          <span>{player.position}</span>
          {player.team && (
            <>
              <span className="mx-1">•</span>
              <span>{player.team.abbreviation}</span>
            </>
          )}
          {player.jerseyNumber && (
            <>
              <span className="mx-1">•</span>
              <span>#{player.jerseyNumber}</span>
            </>
          )}
        </div>
      </div>
      {showScore && (
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-gray-500">Score</div>
          <div className="text-sm font-semibold text-gray-900">
            {Number(slot.projectedScore).toFixed(2)}
          </div>
        </div>
      )}
      {isEditable && !locked && (
        <div className="flex-shrink-0">
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            onClick={handleRemove}
            aria-label={`Remove ${player.name} from slot ${slotOrder}`}
          >
            ×
          </button>
        </div>
      )}
      {locked && (
        <div className="flex-shrink-0 text-gray-400" aria-label="Slot locked">
          🔒
        </div>
      )}
    </div>
  );
};

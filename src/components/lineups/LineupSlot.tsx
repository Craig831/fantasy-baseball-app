import React from 'react';

export interface LineupSlotData {
  slotPosition: string;
  mlbPlayerId: number | null;
  playerName: string | null;
  isLocked: boolean;
}

interface LineupSlotProps {
  slot: LineupSlotData;
}

export const LineupSlot: React.FC<LineupSlotProps> = ({ slot }) => {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="font-mono text-sm w-8 text-gray-500">{slot.slotPosition}</span>
      <span className={`text-sm ${slot.isLocked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {slot.playerName ?? '—'}
      </span>
      {slot.isLocked && <span className="text-xs text-gray-400">(locked)</span>}
    </div>
  );
};

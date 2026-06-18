import React from 'react';

interface LineupScoreProps {
  totalScore: number;
  label?: string;
}

export const LineupScore: React.FC<LineupScoreProps> = ({ totalScore, label = 'Lineup Score' }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span className="text-lg font-semibold text-gray-900">{totalScore.toFixed(2)}</span>
    </div>
  );
};

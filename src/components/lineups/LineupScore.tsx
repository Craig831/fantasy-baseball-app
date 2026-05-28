/**
 * LineupScore Component
 * Presentational component for displaying lineup scores
 * Shows total score and optionally detailed breakdown
 */

import React from 'react';
import { LineupScoreResult } from '../../services/lineupService';

interface LineupScoreProps {
  scoreResult: LineupScoreResult;
  showBreakdown?: boolean;
}

export const LineupScore: React.FC<LineupScoreProps> = ({
  scoreResult,
  showBreakdown = false,
}) => {
  const { totalScore, scoringConfig, message, rawStats, lineup } = scoreResult;

  // No active scoring config - show raw stats message
  if (rawStats) {
    return (
      <div className="lineup-score lineup-score--raw">
        <div className="lineup-score__header">
          <h3 className="lineup-score__title">Lineup Score</h3>
          <div className="lineup-score__status">
            <span className="lineup-score__icon">ℹ️</span>
            <span className="lineup-score__message">{message}</span>
          </div>
        </div>
        <div className="lineup-score__empty">
          <p>Create a scoring configuration to see calculated scores.</p>
        </div>
      </div>
    );
  }

  // With scoring config - show calculated scores
  return (
    <div className="lineup-score">
      <div className="lineup-score__header">
        <h3 className="lineup-score__title">Lineup Score</h3>
        {scoringConfig && (
          <div className="lineup-score__config">
            <span className="lineup-score__config-label">Config:</span>
            <span className="lineup-score__config-name">{scoringConfig.name}</span>
          </div>
        )}
      </div>

      <div className="lineup-score__total">
        <div className="lineup-score__total-label">Total Score</div>
        <div className="lineup-score__total-value">
          {totalScore !== null ? totalScore.toFixed(2) : '0.00'}
        </div>
      </div>

      {showBreakdown && lineup.slots && (
        <div className="lineup-score__breakdown">
          <h4 className="lineup-score__breakdown-title">Player Breakdown</h4>
          <div className="lineup-score__player-scores">
            {lineup.slots
              .filter((slot) => slot.player)
              .map((slot) => (
                <div key={slot.id} className="lineup-score__player-item">
                  <div className="lineup-score__player-name">
                    {slot.player.name}
                    <span className="lineup-score__player-position">
                      ({slot.player.position})
                    </span>
                  </div>
                  <div className="lineup-score__player-score">
                    {slot.projectedScore.toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="lineup-score__slots-count">
        {lineup.slots.filter((s) => s.player).length} / {lineup.slots.length} slots filled
      </div>
    </div>
  );
};

import React from 'react';
import { ScoreBreakdown } from '../../types/player';
import './ScoreBreakdownModal.css';

interface ScoreBreakdownModalProps {
  breakdown: ScoreBreakdown | null;
  playerName: string;
  onClose: () => void;
}

const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({
  breakdown,
  playerName,
  onClose,
}) => {
  if (!breakdown) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="score-breakdown-modal">
        <div className="modal-header">
          <h3>Score Breakdown: {playerName}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="total-score-section">
            <span className="total-label">Total Score:</span>
            <span className="total-value">{breakdown.totalScore.toFixed(1)}</span>
          </div>

          <div className="stat-type-badge">
            {breakdown.statisticType === 'hitting' ? 'Hitting Stats' : 'Pitching Stats'}
          </div>

          <div className="categories-section">
            <h4>Category Breakdown</h4>
            <div className="categories-table">
              <div className="table-header">
                <span>Category</span>
                <span>Value</span>
                <span>Weight</span>
                <span>Points</span>
              </div>
              {breakdown.categoryScores.map((category, index) => (
                <div key={index} className="table-row">
                  <span className="category-name">{category.categoryName}</span>
                  <span className="stat-value">{category.statValue}</span>
                  <span className="weight-value">×{category.weight.toFixed(1)}</span>
                  <span className="points-value">{category.points.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBreakdownModal;

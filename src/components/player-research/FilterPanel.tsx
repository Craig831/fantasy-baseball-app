import React from 'react';
import type { StatisticType, PlayerStatus } from '../../features/player-research/types/filter-state';
import { usePlayerFilters } from '../../hooks/usePlayerFilters';
import './FilterPanel.css';

interface FilterPanelProps {
  onFiltersApplied?: (filters: any) => void;
}

/**
 * FilterPanel Component - Horizontal 3-line layout
 *
 * Line 1: Statistic type toggle, season, status, date range
 * Line 2: Position checkboxes
 * Line 3: Apply and Clear buttons (right-justified)
 *
 * Implements T020-T026 and accessibility features T038-T045
 */
const FilterPanel: React.FC<FilterPanelProps> = ({ onFiltersApplied }) => {
  const {
    pending,
    buttonState,
    updatePendingFilters,
    applyFilters,
    clearFilters,
  } = usePlayerFilters();

  // Position options based on statistic type
  const BATTING_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'];
  const PITCHING_POSITIONS = ['P'];
  const availablePositions = pending.statisticType === 'hitting' ? BATTING_POSITIONS : PITCHING_POSITIONS;

  // Generate season options (current year and 10 years back)
  const currentYear = new Date().getFullYear();
  const seasonOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

  const handleStatisticTypeChange = (value: StatisticType) => {
    updatePendingFilters({
      statisticType: value,
      positions: [], // Clear positions when switching type
    });
  };

  const handlePositionChange = (position: string, checked: boolean) => {
    const newPositions = checked
      ? [...pending.positions, position]
      : pending.positions.filter((p) => p !== position);
    updatePendingFilters({ positions: newPositions });
  };

  const handleApply = () => {
    const result = applyFilters();
    if (result.success && result.filters && onFiltersApplied) {
      // Transform FilterCriteria to PlayerSearchFilters format
      const transformedFilters = {
        position: result.filters.positions,
        league: 'both' as const, // Default to 'both' for now
        statisticType: result.filters.statisticType,
        dateFrom: result.filters.dateRange.from || undefined,
        dateTo: result.filters.dateRange.to || undefined,
        status: result.filters.status,
        season: result.filters.season,
      };
      onFiltersApplied(transformedFilters);
    }
  };

  const handleClear = () => {
    const result = clearFilters();
    if (result.success && result.filters && onFiltersApplied) {
      // Transform FilterCriteria to PlayerSearchFilters format
      const transformedFilters = {
        position: result.filters.positions,
        league: 'both' as const,
        statisticType: result.filters.statisticType,
        dateFrom: result.filters.dateRange.from || undefined,
        dateTo: result.filters.dateRange.to || undefined,
        status: result.filters.status,
        season: result.filters.season,
      };
      onFiltersApplied(transformedFilters);
    }
  };

  return (
    // T038: Fieldset and legend for grouping
    <fieldset className="filter-panel-horizontal">
      <legend className="sr-only">Player Search Filters</legend>

      {/* T043: Aria-live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {buttonState.applyEnabled && 'Filters modified. Click Apply to search.'}
      </div>

      {/* Line 1: Statistic type, season, status, date range */}
      <div className="filter-line filter-line-1">
        {/* T021 & T039: Statistic Type Toggle (Radio Group) */}
        <div className="statistic-type-toggle" role="radiogroup" aria-label="Statistic Type">
          <label className="filter-label">Statistic Type</label>
          <div className="toggle-buttons">
            <button
              type="button"
              role="radio"
              aria-checked={pending.statisticType === 'hitting'}
              className={`toggle-btn ${pending.statisticType === 'hitting' ? 'active' : ''}`}
              onClick={() => handleStatisticTypeChange('hitting')}
            >
              Hitting
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={pending.statisticType === 'pitching'}
              className={`toggle-btn ${pending.statisticType === 'pitching' ? 'active' : ''}`}
              onClick={() => handleStatisticTypeChange('pitching')}
            >
              Pitching
            </button>
          </div>
        </div>

        {/* T022: Season dropdown */}
        <div className="filter-field">
          <label htmlFor="season" className="filter-label">
            Season
          </label>
          <select
            id="season"
            value={pending.season}
            onChange={(e) => updatePendingFilters({ season: parseInt(e.target.value, 10) })}
            className="filter-select"
            aria-label="Season year"
          >
            {seasonOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* T023: Status dropdown */}
        <div className="filter-field">
          <label htmlFor="status" className="filter-label">
            Status
          </label>
          <select
            id="status"
            value={pending.status}
            onChange={(e) => updatePendingFilters({ status: e.target.value as PlayerStatus })}
            className="filter-select"
            aria-label="Player status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        {/* T024: Date range inputs */}
        <div className="filter-field">
          <label htmlFor="dateFrom" className="filter-label">
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={pending.dateRange.from || ''}
            onChange={(e) =>
              updatePendingFilters({
                dateRange: { ...pending.dateRange, from: e.target.value || null },
              })
            }
            className="filter-input"
            aria-label="Statistics start date"
          />
        </div>

        <div className="filter-field">
          <label htmlFor="dateTo" className="filter-label">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={pending.dateRange.to || ''}
            onChange={(e) =>
              updatePendingFilters({
                dateRange: { ...pending.dateRange, to: e.target.value || null },
              })
            }
            className="filter-input"
            aria-label="Statistics end date"
          />
        </div>
      </div>

      {/* Line 2: Position checkboxes */}
      <div className="filter-line filter-line-2">
        <label className="filter-label">Positions</label>
        <div className="position-checkboxes" role="group" aria-label="Player positions">
          {availablePositions.map((position) => (
            <label key={position} className="position-checkbox">
              <input
                type="checkbox"
                checked={pending.positions.includes(position)}
                onChange={(e) => handlePositionChange(position, e.target.checked)}
                aria-label={`Position ${position}`}
              />
              <span>{position}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Line 3: Apply and Clear buttons (right-justified) */}
      <div className="filter-line filter-line-3">
        <div className="filter-actions">
          <button
            type="button"
            onClick={handleClear}
            className="btn-clear"
            disabled={!buttonState.clearEnabled}
            aria-disabled={!buttonState.clearEnabled}
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="btn-apply"
            disabled={!buttonState.applyEnabled}
            aria-disabled={!buttonState.applyEnabled}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </fieldset>
  );
};

export default FilterPanel;

/**
 * Filter State Types for Player Research Feature
 *
 * Implements pending/applied pattern for explicit Apply/Clear button controls
 * Based on research.md section 3: Filter State Management
 */

export type StatisticType = 'hitting' | 'pitching';

export type PlayerStatus = 'active' | 'inactive' | 'retired';

export interface DateRange {
  from: string | null;
  to: string | null;
}

/**
 * Filter Criteria - represents the actual filter values
 */
export interface FilterCriteria {
  statisticType: StatisticType;
  positions: string[];        // Array of selected positions (empty = all positions)
  season: number;             // Year (e.g., 2024)
  status: PlayerStatus;
  dateRange: DateRange;
}

/**
 * Filter State - manages pending vs applied filters
 *
 * Pending: Current form values (not yet applied)
 * Applied: Last applied filters (drives API query)
 * isDirty: True if pending !== applied
 */
export interface FilterState {
  pending: FilterCriteria;
  applied: FilterCriteria;
  isDirty: boolean;
}

/**
 * Default Filter Values
 */
export const DEFAULT_FILTERS: FilterCriteria = {
  statisticType: 'hitting',
  positions: [],                               // Empty = all positions
  season: new Date().getFullYear(),
  status: 'active',
  dateRange: {
    from: null,                                 // null = season start
    to: null                                    // null = current date
  }
};

/**
 * Button State
 */
export interface ButtonState {
  applyEnabled: boolean;    // Enabled when isDirty && isValid(pending)
  clearEnabled: boolean;    // Enabled when applied !== defaultFilters
}

/**
 * Filter Validation Result
 */
export interface FilterValidation {
  isValid: boolean;
  errors: {
    dateRange?: string;
    season?: string;
    positions?: string;
  };
}

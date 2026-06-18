/**
 * Player Result Types for Player Research Feature
 *
 * Updated schema with totalPoints, pointsPerGame, and teamAbbr
 * Based on contracts/player-research-api.yaml PlayerWithScore schema
 */

/**
 * Player statistics (position-specific, filtered by scoring config)
 */
export interface PlayerStatistics {
  // Common stats
  gp?: number;              // Games Played

  // Batter stats (only included if in scoring config)
  ab?: number;              // At Bats
  h?: number;               // Hits
  '2b'?: number;            // Doubles
  '3b'?: number;            // Triples
  hr?: number;              // Home Runs
  r?: number;               // Runs
  rbi?: number;             // RBIs
  bb?: number;              // Walks (Base on Balls)
  k?: number;               // Strikeouts
  sb?: number;              // Stolen Bases
  cs?: number;              // Caught Stealing

  // Pitcher stats (only included if in scoring config)
  gs?: number;              // Games Started
  w?: number;               // Wins
  l?: number;               // Losses
  s?: number;               // Saves
  h_pitcher?: number;       // Holds
  er?: number;              // Earned Runs

  // Allow additional stats
  [key: string]: number | undefined;
}

/**
 * Player Result - represents a player in search results
 *
 * Updated format per spec requirements:
 * - Player name formatted as "Lastname, Firstname"
 * - Team abbreviation (3-letter code like "NYY", "LAA", "COL")
 * - totalPoints and pointsPerGame instead of single score
 * - Statistics filtered by active scoring configuration
 */
export interface PlayerResult {
  id: string;
  mlbPlayerId: number;
  name: string;                    // Formatted as "Lastname, Firstname"
  position: string;
  teamAbbr: string;                // 3-letter team abbreviation (e.g., "NYY")
  status: 'active' | 'inactive' | 'retired';
  totalPoints: number | null;      // Total calculated points (null if no config)
  pointsPerGame: number | null;    // Points per game average (null if no config or 0 games)
  statistics: PlayerStatistics;    // Position-specific stats (only those in scoring config)
  lastUpdated: string;             // ISO 8601 date-time
}

/**
 * Player Search Response (paginated)
 */
export interface PlayerSearchResponse {
  data: PlayerResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    lastUpdated: string;           // ISO 8601 date-time
    scoringConfigName: string;
  };
}

/**
 * Score Breakdown - detailed scoring calculation
 */
export interface ScoreBreakdown {
  playerId: string;
  playerName: string;
  totalScore: number;
  scoringConfigurationName: string;
  period: {
    dateFrom: string;              // ISO 8601 date
    dateTo: string;                // ISO 8601 date
  };
  breakdown: Array<{
    statistic: string;             // Name of the statistic
    value: number;                 // Player's value for this statistic
    points: number;                // Points per unit for this statistic
    score: number;                 // Calculated score (value × points)
  }>;
}

/**
 * Column Configuration - determines which columns to display
 */
export interface ColumnConfig {
  key: string;
  label: string;
  statKey?: string;                // Maps to PlayerStatistics key
  sortable: boolean;
  sticky?: boolean;                // Sticky column for horizontal scroll
  formatter?: (value: any) => string;
}

/**
 * Core columns always shown regardless of scoring config
 */
const CORE_BASE_COLUMNS: ColumnConfig[] = [
  { key: 'playerName', label: 'Player', sortable: true, sticky: true },
  { key: 'position', label: 'Pos', sortable: true, sticky: true },
  { key: 'teamAbbr', label: 'Team', sortable: true, sticky: true },
];

/**
 * Score columns only shown when scoring config is selected
 */
const SCORE_COLUMNS: ColumnConfig[] = [
  { key: 'totalPoints', label: 'PTS', sortable: true },
  { key: 'pointsPerGame', label: 'PPG', sortable: true }
];

/**
 * Base columns (for backward compatibility)
 */
export const BASE_COLUMNS: ColumnConfig[] = [
  ...CORE_BASE_COLUMNS,
  ...SCORE_COLUMNS
];

/**
 * Batter stat columns (filtered by scoring config)
 */
export const BATTER_STAT_COLUMNS: ColumnConfig[] = [
  { key: 'gp', label: 'GP', statKey: 'gp', sortable: true },
  { key: 'ab', label: 'AB', statKey: 'ab', sortable: true },
  { key: 'h', label: 'H', statKey: 'h', sortable: true },
  { key: '2b', label: '2B', statKey: '2b', sortable: true },
  { key: '3b', label: '3B', statKey: '3b', sortable: true },
  { key: 'hr', label: 'HR', statKey: 'hr', sortable: true },
  { key: 'r', label: 'R', statKey: 'r', sortable: true },
  { key: 'rbi', label: 'RBI', statKey: 'rbi', sortable: true },
  { key: 'bb', label: 'BB', statKey: 'bb', sortable: true },
  { key: 'k', label: 'K', statKey: 'k', sortable: true },
  { key: 'sb', label: 'SB', statKey: 'sb', sortable: true },
  { key: 'cs', label: 'CS', statKey: 'cs', sortable: true }
];

/**
 * Pitcher stat columns (filtered by scoring config)
 */
export const PITCHER_STAT_COLUMNS: ColumnConfig[] = [
  { key: 'gp', label: 'GP', statKey: 'gp', sortable: true },
  { key: 'gs', label: 'GS', statKey: 'gs', sortable: true },
  { key: 'w', label: 'W', statKey: 'w', sortable: true },
  { key: 'l', label: 'L', statKey: 'l', sortable: true },
  { key: 's', label: 'S', statKey: 's', sortable: true },
  { key: 'h', label: 'H', statKey: 'h_pitcher', sortable: true },
  { key: 'er', label: 'ER', statKey: 'er', sortable: true },
  { key: 'bb', label: 'BB', statKey: 'bb', sortable: true },
  { key: 'k', label: 'K', statKey: 'k', sortable: true }
];

/**
 * Scoring Configuration Interface
 * Minimal interface for determining visible columns
 */
export interface ScoringConfig {
  id: string;
  name: string;
  categories: {
    hitting: Record<string, number>;
    pitching: Record<string, number>;
  };
}

/**
 * Get visible columns based on statistic type and scoring configuration
 * Returns base columns + filtered stat columns
 *
 * @param statisticType - 'hitting' or 'pitching'
 * @param scoringConfig - Active scoring configuration (optional)
 * @returns Array of column configurations to display
 */
export function getVisibleColumns(
  statisticType: 'hitting' | 'pitching',
  scoringConfig?: ScoringConfig | null
): ColumnConfig[] {
  // Start with core columns (always shown)
  const columns = [...CORE_BASE_COLUMNS];

  // Add score columns ONLY if scoring config is provided
  if (scoringConfig && scoringConfig.categories) {
    columns.push(...SCORE_COLUMNS);
  }

  // Select stat columns based on statistic type
  const statColumns = statisticType === 'hitting' ? BATTER_STAT_COLUMNS : PITCHER_STAT_COLUMNS;

  // If no scoring config, show all stat columns
  if (!scoringConfig || !scoringConfig.categories) {
    return [...columns, ...statColumns];
  }

  // Get the relevant scoring categories for this statistic type
  const scoringCategories = statisticType === 'hitting'
    ? scoringConfig.categories.hitting
    : scoringConfig.categories.pitching;

  // Filter stat columns to only show those in the scoring configuration
  const scoredStatKeys = new Set(
    Object.keys(scoringCategories).map(key => key.toLowerCase())
  );

  const filteredStatColumns = statColumns.filter(col => {
    if (!col.statKey) return false;
    return scoredStatKeys.has(col.statKey.toLowerCase());
  });

  return [...columns, ...filteredStatColumns];
}

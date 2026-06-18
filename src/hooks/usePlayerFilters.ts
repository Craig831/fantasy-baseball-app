import { useState, useCallback, useMemo } from 'react';
import isEqual from 'lodash.isequal';
import {
  FilterCriteria,
  FilterState,
  DEFAULT_FILTERS,
  ButtonState,
  FilterValidation,
} from '../features/player-research/types/filter-state';

/**
 * usePlayerFilters Hook
 *
 * Manages filter state with pending/applied pattern for explicit Apply/Clear button controls.
 * Implements T027-T033 requirements:
 * - Pending vs applied state
 * - isDirty calculation
 * - Button enabling logic
 * - Filter validation
 * - Clear and Apply behaviors
 */
export function usePlayerFilters(initialFilters?: FilterCriteria) {
  // T027 & T033: Initialize state with default filters
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const initial = initialFilters || DEFAULT_FILTERS;
    return {
      pending: initial,
      applied: initial,
      isDirty: false,
    };
  });

  // T028: Calculate isDirty using lodash.isEqual
  const isDirty = useMemo(() => {
    return !isEqual(filterState.pending, filterState.applied);
  }, [filterState.pending, filterState.applied]);

  // T030: Validate filters
  const validateFilters = useCallback((filters: FilterCriteria): FilterValidation => {
    const errors: FilterValidation['errors'] = {};
    let isValid = true;

    // Validate date range
    if (filters.dateRange.from && filters.dateRange.to) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);

      if (fromDate > toDate) {
        errors.dateRange = 'Start date must be before end date';
        isValid = false;
      }
    }

    // Validate season
    const currentYear = new Date().getFullYear();
    if (filters.season < 1900 || filters.season > currentYear + 1) {
      errors.season = `Season must be between 1900 and ${currentYear + 1}`;
      isValid = false;
    }

    return { isValid, errors };
  }, []);

  // T029: Button enabling logic
  const buttonState: ButtonState = useMemo(() => {
    const validation = validateFilters(filterState.pending);
    const isNotDefault = !isEqual(filterState.applied, DEFAULT_FILTERS);

    return {
      applyEnabled: isDirty && validation.isValid,
      clearEnabled: isNotDefault,
    };
  }, [filterState.pending, filterState.applied, isDirty, validateFilters]);

  // Update pending filters
  const updatePendingFilters = useCallback((updates: Partial<FilterCriteria>) => {
    setFilterState((prev) => {
      const newPending = { ...prev.pending, ...updates };
      return {
        ...prev,
        pending: newPending,
        isDirty: !isEqual(newPending, prev.applied),
      };
    });
  }, []);

  // T032: Apply button behavior - copy pending to applied and trigger search
  const applyFilters = useCallback(() => {
    const validation = validateFilters(filterState.pending);

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    setFilterState((prev) => ({
      pending: prev.pending,
      applied: prev.pending,
      isDirty: false,
    }));

    return { success: true, filters: filterState.pending };
  }, [filterState.pending, validateFilters]);

  // T031: Clear button behavior - reset to defaults
  const clearFilters = useCallback(() => {
    setFilterState({
      pending: DEFAULT_FILTERS,
      applied: DEFAULT_FILTERS,
      isDirty: false,
    });

    return { success: true, filters: DEFAULT_FILTERS };
  }, []);

  // Reset to specific filters (useful for saved searches)
  const resetToFilters = useCallback((filters: FilterCriteria) => {
    setFilterState({
      pending: filters,
      applied: filters,
      isDirty: false,
    });
  }, []);

  return {
    // State
    pending: filterState.pending,
    applied: filterState.applied,
    isDirty,
    buttonState,

    // Actions
    updatePendingFilters,
    applyFilters,
    clearFilters,
    resetToFilters,
    validateFilters,
  };
}

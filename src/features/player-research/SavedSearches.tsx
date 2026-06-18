import React, { useState } from 'react';
import { useSavedSearchesQuery, useCreateSavedSearchMutation } from '../../hooks/useSavedSearches';
import { parseSavedSearchFilters, stringifySavedSearchFilters } from '../../api/jsonBlobs';
import type { SavedSearchFilters } from '../../api/jsonBlobs';
import type { PlayerSearchParams } from '../../api/types';

interface SavedSearchesProps {
  currentParams: PlayerSearchParams;
  onApply: (filters: Omit<SavedSearchFilters, 'filterVersion'>) => void;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({ currentParams, onApply }) => {
  const { data: searches, isLoading } = useSavedSearchesQuery();
  const createMutation = useCreateSavedSearchMutation();
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleSave = () => {
    setSaveError('');
    if (!saveName.trim()) {
      setSaveError('Name is required');
      return;
    }

    const filters: Omit<SavedSearchFilters, 'filterVersion'> = {
      nameQuery: currentParams.nameQuery ?? null,
      positionId: currentParams.positionId ?? null,
      mlbTeamId: currentParams.mlbTeamId ?? null,
      statusCode: currentParams.statusCode ?? null,
      availability: currentParams.availability ?? null,
    };

    createMutation.mutate(
      { name: saveName.trim(), filtersJson: stringifySavedSearchFilters(filters) },
      {
        onSuccess: () => {
          setSaveName('');
          setShowSaveForm(false);
        },
        onError: () => {
          setSaveError('Failed to save search');
        },
      },
    );
  };

  return (
    <div className="saved-searches">
      <div className="saved-searches-header">
        <h3 className="text-sm font-medium text-gray-700">Saved Searches</h3>
        <button
          type="button"
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          {showSaveForm ? 'Cancel' : 'Save current'}
        </button>
      </div>

      {showSaveForm && (
        <div className="saved-searches-form mt-2 flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Search name"
            className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
      {saveError && <p className="text-xs text-red-600 mt-1">{saveError}</p>}

      {isLoading ? (
        <p className="text-xs text-gray-500 mt-2">Loading...</p>
      ) : (
        <ul className="saved-searches-list mt-2 space-y-1">
          {(searches ?? []).map((search) => {
            let filters: Omit<SavedSearchFilters, 'filterVersion'> | null = null;
            try {
              filters = parseSavedSearchFilters(search.filtersJson);
            } catch {
              // Skip searches with invalid filterVersion
            }

            return (
              <li key={search.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">{search.name}</span>
                <button
                  type="button"
                  disabled={!filters}
                  onClick={() => filters && onApply(filters)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 ml-2 flex-shrink-0 disabled:text-gray-400"
                >
                  Apply
                </button>
              </li>
            );
          })}
          {(searches ?? []).length === 0 && (
            <li className="text-xs text-gray-400">No saved searches yet</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SavedSearches;

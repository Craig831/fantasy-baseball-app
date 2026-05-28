/**
 * LineupList Component
 * Container component for displaying all lineups
 * Uses TanStack Query for data fetching and caching
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLineups, deleteLineup, duplicateLineup } from '../../services/lineupService';
import { useNavigate } from 'react-router-dom';

export const LineupList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all lineups
  const {
    data: lineups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lineups'],
    queryFn: getLineups,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLineup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineups'] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      duplicateLineup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineups'] });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = async (id: string, originalName: string) => {
    const newName = prompt(`Enter name for duplicated lineup:`, `${originalName} (Copy)`);
    if (newName) {
      duplicateMutation.mutate({ id, name: newName });
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/lineups/${id}/edit`);
  };

  const handleView = (id: string) => {
    navigate(`/lineups/${id}`);
  };

  const handleCreateNew = () => {
    navigate('/lineups/new');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading lineups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          Error loading lineups: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!lineups || lineups.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="text-center py-12 px-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Lineups Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first lineup to get started.
          </p>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={handleCreateNew}
          >
            Create Lineup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Lineups</h2>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleCreateNew}
        >
          + New Lineup
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {lineups.map((lineup) => (
          <div key={lineup.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{lineup.name}</h3>
                {lineup.gameDate && (
                  <div className="text-sm text-gray-500 ml-2">
                    {new Date(lineup.gameDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Players</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {lineup.slots.filter((s) => s.player).length} / {lineup.slots.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Score</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {Number(lineup.projectedScore).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => handleView(lineup.id)}
                  aria-label={`View ${lineup.name}`}
                >
                  View
                </button>
                <button
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => handleEdit(lineup.id)}
                  aria-label={`Edit ${lineup.name}`}
                >
                  Edit
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  onClick={() => handleDuplicate(lineup.id, lineup.name)}
                  aria-label={`Duplicate ${lineup.name}`}
                  disabled={duplicateMutation.isPending}
                >
                  Duplicate
                </button>
                <button
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  onClick={() => handleDelete(lineup.id, lineup.name)}
                  aria-label={`Delete ${lineup.name}`}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Created {new Date(lineup.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

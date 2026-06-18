import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScoringConfigsQuery } from '../../hooks/useScoringConfigs';
import { parseJsonBlob } from '../../api/jsonBlobs';
import type { StatCategoryWeight } from '../../api/jsonBlobs';

const ScoringConfigsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: configs, isLoading, isError, error } = useScoringConfigsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const errorMessage =
    isError && error instanceof Error ? error.message : isError ? 'Failed to load configurations' : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Scoring Configurations</h2>
          <button
            onClick={() => navigate('/scoring-configs/new')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Create New Configuration
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        {!configs || configs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have any scoring configurations yet.</p>
            <button
              onClick={() => navigate('/scoring-configs/new')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
            >
              Create Your First Configuration
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {configs.map((config) => {
              const categories = parseJsonBlob<StatCategoryWeight[]>(config.categoriesJson) ?? [];
              return (
                <div key={config.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Created: {new Date(config.createdAt).toLocaleDateString()}
                      </p>

                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Categories</h4>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4">
                          {categories.slice(0, 5).map((cat) => (
                            <span key={cat.statKey}>
                              {cat.statKey}: {cat.pointValue} pts
                            </span>
                          ))}
                          {categories.length > 5 && (
                            <span className="text-gray-400">+{categories.length - 5} more</span>
                          )}
                          {categories.length === 0 && (
                            <span className="text-gray-400">No categories defined</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => navigate(`/scoring-configs/new`)}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoringConfigsListPage;

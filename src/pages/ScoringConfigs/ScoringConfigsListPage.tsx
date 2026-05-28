import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface ScoringConfig {
  id: string;
  name: string;
  categories: {
    hitting: Record<string, number>;
    pitching: Record<string, number>;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ScoringConfigsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ScoringConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/scoring-configs');
      setConfigs(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configurations');
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.patch(`/scoring-configs/${id}/activate`);
      fetchConfigs(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate configuration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await api.delete(`/scoring-configs/${id}`);
      fetchConfigs(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete configuration');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {configs.length === 0 ? (
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
            {configs.map((config) => (
              <div
                key={config.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  config.isActive ? 'ring-2 ring-indigo-600' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                      {config.isActive && (
                        <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Created: {new Date(config.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Hitting Stats</h4>
                        <div className="text-sm text-gray-600">
                          {Object.entries(config.categories.hitting).slice(0, 3).map(([stat, points]) => (
                            <div key={stat}>
                              {stat}: {points} pts
                            </div>
                          ))}
                          {Object.keys(config.categories.hitting).length > 3 && (
                            <div className="text-gray-400">
                              +{Object.keys(config.categories.hitting).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Pitching Stats</h4>
                        <div className="text-sm text-gray-600">
                          {Object.entries(config.categories.pitching).slice(0, 3).map(([stat, points]) => (
                            <div key={stat}>
                              {stat}: {points} pts
                            </div>
                          ))}
                          {Object.keys(config.categories.pitching).length > 3 && (
                            <div className="text-gray-400">
                              +{Object.keys(config.categories.pitching).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => navigate(`/scoring-configs/${config.id}/edit`)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    {!config.isActive && (
                      <button
                        onClick={() => handleActivate(config.id)}
                        className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoringConfigsListPage;

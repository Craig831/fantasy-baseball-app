import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateScoringConfigMutation } from '../../hooks/useScoringConfigs';
import { isApiError } from '../../api/errors';
import { stringifyJsonBlob } from '../../api/jsonBlobs';
import type { StatCategoryWeight } from '../../api/jsonBlobs';

interface StatEntry {
  statKey: string;
  pointValue: number;
}

// statKey values must match PlayerGameDto property names on the JellyBaseballV2 API.
// See JellyBaseballV2/docs/web-client/JSON-BLOBS.md and WORKFLOWS.md for the full list.
const DEFAULT_STATS: StatEntry[] = [
  { statKey: 'HomeRuns',    pointValue: 4  },
  { statKey: 'Rbi',         pointValue: 1  },
  { statKey: 'Runs',        pointValue: 1  },
  { statKey: 'StolenBases', pointValue: 2  },
  { statKey: 'Singles',     pointValue: 1  },
  { statKey: 'Wins',        pointValue: 5  },
  { statKey: 'Saves',       pointValue: 3  },
  { statKey: 'StrikeOuts',  pointValue: 1  },
  { statKey: 'EarnedRuns',  pointValue: -1 },
];

const ScoringConfigFormPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateScoringConfigMutation();

  const [name, setName] = useState('');
  const [stats, setStats] = useState<StatEntry[]>(DEFAULT_STATS);
  const [formError, setFormError] = useState('');

  const addStat = () => {
    setStats([...stats, { statKey: '', pointValue: 0 }]);
  };

  const removeStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const updateStat = (index: number, field: keyof StatEntry, value: string | number) => {
    const next = [...stats];
    next[index] = { ...next[index], [field]: value };
    setStats(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Configuration name is required');
      return;
    }

    const validStats = stats.filter((s) => s.statKey.trim());
    if (validStats.length === 0) {
      setFormError('At least one stat category is required');
      return;
    }

    const categories: StatCategoryWeight[] = validStats.map((s) => ({
      statKey: s.statKey.trim(),
      pointValue: s.pointValue,
    }));

    createMutation.mutate(
      { name: name.trim(), categoriesJson: stringifyJsonBlob(categories) },
      {
        onSuccess: () => navigate('/scoring-configs'),
        onError: (err) => {
          setFormError(
            isApiError(err) ? err.detail ?? err.title : 'Failed to save configuration',
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Scoring Configuration</h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Configuration Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., My League 2025"
              required
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Stat Categories</h3>
              <button
                type="button"
                onClick={addStat}
                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200"
              >
                Add Stat
              </button>
            </div>

            <div className="space-y-2">
              {stats.map((stat, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={stat.statKey}
                    onChange={(e) => updateStat(index, 'statKey', e.target.value)}
                    placeholder="e.g., HomeRuns"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={stat.pointValue}
                    onChange={(e) => updateStat(index, 'pointValue', parseFloat(e.target.value))}
                    placeholder="Points"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/scoring-configs')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScoringConfigFormPage;

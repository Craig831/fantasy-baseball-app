import React, { useState, useEffect } from 'react';
import './ScoringConfigSelector.css';

interface ScoringConfig {
  id: string;
  name: string;
  isActive: boolean;
}

interface ScoringConfigSelectorProps {
  selectedConfigId: string | null;
  onConfigChange: (configId: string | null) => void;
}

const ScoringConfigSelector: React.FC<ScoringConfigSelectorProps> = ({
  selectedConfigId,
  onConfigChange,
}) => {
  const [configs, setConfigs] = useState<ScoringConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/scoring-configs`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load scoring configurations');
      }

      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load scoring configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onConfigChange(value === '' ? null : value);
  };

  return (
    <div className="scoring-config-selector">
      <label htmlFor="scoring-config-select">
        Scoring Configuration:
      </label>
      {loading ? (
        <div className="loading">Loading configurations...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <select
          id="scoring-config-select"
          value={selectedConfigId || ''}
          onChange={handleChange}
          className="config-select"
        >
          <option value="">No scoring (show raw stats)</option>
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.name} {config.isActive ? '(Active)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default ScoringConfigSelector;

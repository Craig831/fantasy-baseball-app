import React from 'react';
import { useScoringConfigsQuery } from '../../hooks/useScoringConfigs';
import './ScoringConfigSelector.css';

interface ScoringConfigSelectorProps {
  selectedConfigId: string | null;
  onConfigChange: (configId: string | null) => void;
}

const ScoringConfigSelector: React.FC<ScoringConfigSelectorProps> = ({
  selectedConfigId,
  onConfigChange,
}) => {
  const { data: configs, isLoading, isError } = useScoringConfigsQuery();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onConfigChange(value === '' ? null : value);
  };

  return (
    <div className="scoring-config-selector">
      <label htmlFor="scoring-config-select">Scoring Configuration:</label>
      {isLoading ? (
        <div className="loading">Loading configurations...</div>
      ) : isError ? (
        <div className="error">Failed to load scoring configurations</div>
      ) : (
        <select
          id="scoring-config-select"
          value={selectedConfigId || ''}
          onChange={handleChange}
          className="config-select"
        >
          <option value="">No scoring (show raw stats)</option>
          {(configs ?? []).map((config) => (
            <option key={config.id} value={config.id}>
              {config.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default ScoringConfigSelector;

import React from 'react';

export const LineupList: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="text-center py-12 px-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lineups Are League-Based</h3>
        <p className="text-gray-600 mb-6">
          Lineup management is scoped to a league. Join or create a league from the Leagues page
          to view and set your weekly lineup.
        </p>
      </div>
    </div>
  );
};

/**
 * LineupsPage
 * Main page for viewing all lineups
 * Displays LineupList component with page layout
 */

import React from 'react';
import { LineupList } from '../../components/lineups/LineupList';

export const LineupsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <header className="px-4 sm:px-0 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Lineups</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage your fantasy baseball lineups.
            Scores are calculated using your active scoring configuration.
          </p>
        </header>

        <main className="px-4 sm:px-0">
          <LineupList />
        </main>
      </div>
    </div>
  );
};

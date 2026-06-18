/**
 * LineupEditorPage
 * Page for creating or editing a lineup
 * Wraps LineupEditor component with page layout
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { LineupEditor } from '../../components/lineups/LineupEditor';

export const LineupEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <header className="px-4 sm:px-0 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Lineup' : 'Create New Lineup'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEditMode
              ? 'Update your lineup name and player selections'
              : 'Build your dream team by selecting up to 25 players'}
          </p>
        </header>

        <main className="px-4 sm:px-0">
          <LineupEditor lineupId={isEditMode ? id : undefined} />
        </main>
      </div>
    </div>
  );
};

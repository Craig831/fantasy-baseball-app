import React from 'react';

interface LineupEditorProps {
  lineupId?: string;
}

export const LineupEditor: React.FC<LineupEditorProps> = () => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="text-center py-12 px-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lineup Editor Coming Soon</h3>
        <p className="text-gray-600">
          Lineup editing is handled within your league. Navigate to your league to manage your
          weekly lineup and roster.
        </p>
      </div>
    </div>
  );
};

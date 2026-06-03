import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const AccountSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{currentUser?.email ?? '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900">
                {[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-sm text-gray-500">Full account management coming in a future update.</p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;

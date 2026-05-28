import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const HomePage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Fantasy Baseball Scorer
              </h2>
              <p className="text-gray-600 mb-6">
                You're successfully logged in! This is the home page of your fantasy baseball application.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button
                  onClick={() => navigate('/scoring-configs')}
                  className="bg-indigo-50 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-indigo-900">Scoring Configs</h3>
                    <p className="mt-2 text-sm text-indigo-700">
                      Create custom scoring configurations for your leagues
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/player-research')}
                  className="bg-green-50 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-green-900">Player Research</h3>
                    <p className="mt-2 text-sm text-green-700">
                      Search and analyze MLB players with your scoring settings
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/lineups')}
                  className="bg-purple-50 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-purple-900">Lineups</h3>
                    <p className="mt-2 text-sm text-purple-700">
                      Build and manage your fantasy lineups - up to 25 players
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

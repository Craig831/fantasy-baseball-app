/**
 * Lineup Service
 * API client for lineup management
 * Lineups are NOT tied to scoring configurations
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ====================
// Types
// ====================

export interface LineupSlot {
  id: string;
  lineupId: string;
  slotOrder: number;
  playerId: string | null;
  player?: any; // Player with team and statistics
  projectedScore: number;
  actualScore: number | null;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lineup {
  id: string;
  userId: string;
  name: string;
  scoringConfigId: string | null; // Always NULL per architecture
  projectedScore: number;
  actualScore: number | null;
  gameDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  slots: LineupSlot[];
}

export interface CreateLineupDto {
  name: string;
  gameDate?: string;
}

export interface UpdateLineupDto {
  name?: string;
  slots?: Array<{
    slotOrder: number;
    playerId: string | null;
  }>;
}

export interface LineupScoreResult {
  lineup: Lineup;
  totalScore: number | null;
  scoringConfig?: {
    id: string;
    name: string;
  };
  message?: string;
  rawStats?: boolean;
}

// ====================
// API Methods
// ====================

/**
 * Create a new lineup
 */
export const createLineup = async (dto: CreateLineupDto): Promise<Lineup> => {
  const response = await api.post('/lineups', dto);
  return response.data.data;
};

/**
 * Get all lineups for current user
 */
export const getLineups = async (): Promise<Lineup[]> => {
  const response = await api.get('/lineups');
  return response.data.data;
};

/**
 * Get a single lineup by ID
 */
export const getLineup = async (id: string): Promise<Lineup> => {
  const response = await api.get(`/lineups/${id}`);
  return response.data.data;
};

/**
 * Update a lineup
 */
export const updateLineup = async (
  id: string,
  dto: UpdateLineupDto
): Promise<Lineup> => {
  const response = await api.patch(`/lineups/${id}`, dto);
  return response.data.data;
};

/**
 * Delete a lineup (soft delete)
 */
export const deleteLineup = async (id: string): Promise<void> => {
  await api.delete(`/lineups/${id}`);
};

/**
 * Duplicate a lineup
 */
export const duplicateLineup = async (
  id: string,
  name: string
): Promise<Lineup> => {
  const response = await api.post(`/lineups/${id}/duplicate`, { name });
  return response.data.data;
};

/**
 * Calculate lineup score
 * Uses active scoring config or returns raw stats if no config
 */
export const calculateLineupScore = async (
  id: string
): Promise<LineupScoreResult> => {
  const response = await api.get(`/lineups/${id}/score`);
  return response.data.data;
};

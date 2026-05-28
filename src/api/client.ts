/**
 * Axios instance for the JellyBaseballV2 API.
 *
 * - Base URL: VITE_API_BASE_URL (defaults to http://localhost:5000).
 * - Request interceptor: attaches Bearer access token from `tokens.ts`.
 * - Response interceptor: maps RFC 7807 errors to ApiError, performs
 *   single-flight refresh on 401, retries the original request once, and
 *   triggers an out-of-band session-cleared signal if the refresh fails.
 *
 * Routing on cleared session is handled by the auth layer — this module
 * exposes `onSessionCleared` so React (router) can subscribe; it does not
 * call `window.location.href` directly.
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { makeApiError, ApiError, isApiError } from './errors';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens';

const DEFAULT_BASE_URL = 'http://localhost:5000';

const REFRESH_PATH = '/api/auth/refresh';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type SessionClearedListener = () => void;

const sessionClearedListeners = new Set<SessionClearedListener>();

export function onSessionCleared(listener: SessionClearedListener): () => void {
  sessionClearedListeners.add(listener);
  return () => {
    sessionClearedListeners.delete(listener);
  };
}

function emitSessionCleared(): void {
  for (const listener of sessionClearedListeners) {
    listener();
  }
}

let inFlightRefresh: Promise<RefreshResponse> | null = null;

async function performRefresh(client: AxiosInstance): Promise<RefreshResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const response = await client.post<RefreshResponse>(
    REFRESH_PATH,
    { refreshToken },
    { _skipAuth: true } as AxiosRequestConfig,
  );
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

function getOrStartRefresh(client: AxiosInstance): Promise<RefreshResponse> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = performRefresh(client).finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

function toApiError(error: AxiosError): ApiError {
  if (isApiError(error)) return error;
  const response = error.response;
  if (response && response.data && typeof response.data === 'object') {
    const data = response.data as Record<string, unknown>;
    return makeApiError({
      title: typeof data.title === 'string' ? data.title : null,
      detail: typeof data.detail === 'string' ? data.detail : null,
      status: typeof data.status === 'number' ? data.status : response.status,
      type: typeof data.type === 'string' ? data.type : null,
      instance: typeof data.instance === 'string' ? data.instance : null,
    });
  }
  if (response) {
    return makeApiError({
      title: response.statusText || 'Request failed',
      detail: error.message,
      status: response.status,
    });
  }
  return makeApiError({
    title: 'Network Error',
    detail: error.message || 'Request did not complete',
    status: 0,
  });
}

export function createApiClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL: baseURL ?? import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const skipAuth = (config as AxiosRequestConfig & { _skipAuth?: boolean })._skipAuth;
    if (!skipAuth) {
      const accessToken = getAccessToken();
      if (accessToken) {
        if (!config.headers) {
          config.headers = new AxiosHeaders();
        }
        if (config.headers instanceof AxiosHeaders) {
          config.headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
          (config.headers as Record<string, string>).Authorization =
            `Bearer ${accessToken}`;
        }
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableRequestConfig | undefined;
      const status = error.response?.status;
      const isRefreshCall = original?.url === REFRESH_PATH;

      if (status === 401 && original && !original._retry && !isRefreshCall) {
        original._retry = true;
        try {
          const refreshed = await getOrStartRefresh(client);
          if (!original.headers) {
            original.headers = new AxiosHeaders();
          }
          if (original.headers instanceof AxiosHeaders) {
            original.headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
          } else {
            (original.headers as Record<string, string>).Authorization =
              `Bearer ${refreshed.accessToken}`;
          }
          return client(original);
        } catch (refreshError) {
          clearTokens();
          emitSessionCleared();
          return Promise.reject(toApiError(error));
        }
      }

      return Promise.reject(toApiError(error));
    },
  );

  return client;
}

export const apiClient: AxiosInstance = createApiClient();

/**
 * Auth endpoint wrappers for the JellyBaseballV2 API.
 *
 * Source of truth: contracts/auth.md.
 *
 * Token persistence is handled here: every endpoint that returns an
 * AuthResponse calls setTokens() before resolving so the caller never has to
 * remember. logout() always calls clearTokens(), even if the server rejects.
 */

import { apiClient } from './client';
import { clearTokens, getRefreshToken, setTokens } from './tokens';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfileDto,
} from './types';

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', payload);
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', payload);
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

export async function refresh(refreshToken?: string): Promise<AuthResponse> {
  const tokenToUse = refreshToken ?? getRefreshToken();
  if (!tokenToUse) {
    throw new Error('No refresh token available');
  }
  const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
    refreshToken: tokenToUse,
  });
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  return response.data;
}

/**
 * Revoke the refresh token server-side. The API requires the refresh token in
 * the request body — header-only logout will not revoke server-side per
 * AUTH.md. We always clear local tokens, even if the server returns an error,
 * so the UI never gets stuck "signed in" after the user asked to leave.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiClient.post('/api/auth/logout', { refreshToken });
    }
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<UserProfileDto> {
  const response = await apiClient.get<UserProfileDto>('/api/users/me');
  return response.data;
}

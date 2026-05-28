/**
 * Auth context — owns the current user object, the in-memory access token's
 * lifecycle, and the high-level signIn/signOut/register operations.
 *
 * Boot flow: if a refresh token is in localStorage, call `refresh()` to
 * exchange it for a fresh access token, then load the user profile. If
 * refresh fails, tokens are cleared and the user is treated as signed out.
 *
 * Cross-tab + interceptor signals: subscribes to both `onSessionCleared`
 * (interceptor exhausted refresh) and `onRefreshTokenChange` (another tab
 * rotated or cleared the refresh token).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getCurrentUser as fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  register as apiRegister,
} from '../api/auth';
import { onSessionCleared } from '../api/client';
import { getRefreshToken, onRefreshTokenChange } from '../api/tokens';
import type {
  LoginRequest,
  RegisterRequest,
  UserProfileDto,
} from '../api/types';

interface AuthContextValue {
  currentUser: UserProfileDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hydrate = useCallback(async () => {
    setIsLoading(true);
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      if (mountedRef.current) {
        setCurrentUser(null);
        setIsLoading(false);
      }
      return;
    }
    try {
      await apiRefresh(refreshToken);
      const profile = await fetchCurrentUser();
      if (mountedRef.current) setCurrentUser(profile);
    } catch {
      if (mountedRef.current) setCurrentUser(null);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribe = onSessionCleared(() => {
      if (mountedRef.current) setCurrentUser(null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onRefreshTokenChange((newToken) => {
      if (newToken === null) {
        if (mountedRef.current) setCurrentUser(null);
        return;
      }
      void hydrate();
    });
    return unsubscribe;
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiLogin({ email, password });
    const profile = await fetchCurrentUser();
    if (mountedRef.current) setCurrentUser(profile);
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    await apiRegister(payload);
    const profile = await fetchCurrentUser();
    if (mountedRef.current) setCurrentUser(profile);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    if (mountedRef.current) setCurrentUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      isAuthenticated: currentUser !== null,
      signIn,
      register,
      signOut,
    }),
    [currentUser, isLoading, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

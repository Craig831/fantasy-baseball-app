/**
 * Auth token store for the JellyBaseballV2 client.
 *
 * - Access token (short-lived JWT): module-scoped memory only. Cleared on
 *   tab close, full reload, or logout. Re-hydrated on boot by calling the
 *   refresh endpoint with the persisted refresh token.
 * - Refresh token (opaque, 30-day): localStorage under `REFRESH_TOKEN_KEY`.
 *   Survives reload; rotated on every refresh.
 *
 * Cross-tab sync: a `storage`-event listener on `REFRESH_TOKEN_KEY` keeps the
 * in-memory access token in sync when another tab rotates the refresh token.
 */

export const REFRESH_TOKEN_KEY = 'jb2:refreshToken';

type RefreshTokenChangeListener = (newRefreshToken: string | null) => void;

let accessToken: string | null = null;
let storageListenerAttached = false;
const refreshTokenChangeListeners = new Set<RefreshTokenChangeListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  accessToken = tokens.accessToken;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearTokens(): void {
  accessToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Subscribe to cross-tab refresh-token changes. The callback fires when another
 * tab writes (or clears) REFRESH_TOKEN_KEY in localStorage. The current tab's
 * in-memory access token is invalidated automatically before the callback
 * runs — subscribers typically respond by triggering a local refresh.
 *
 * Returns an unsubscribe function.
 */
export function onRefreshTokenChange(listener: RefreshTokenChangeListener): () => void {
  refreshTokenChangeListeners.add(listener);
  ensureStorageListener();
  return () => {
    refreshTokenChangeListeners.delete(listener);
  };
}

function ensureStorageListener(): void {
  if (storageListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('storage', handleStorageEvent);
  storageListenerAttached = true;
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.storageArea !== window.localStorage) return;
  if (event.key !== REFRESH_TOKEN_KEY && event.key !== null) return;
  accessToken = null;
  const newRefreshToken = event.key === null ? null : event.newValue;
  for (const listener of refreshTokenChangeListeners) {
    listener(newRefreshToken);
  }
}

export function __resetTokensForTests(): void {
  accessToken = null;
  refreshTokenChangeListeners.clear();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (storageListenerAttached) {
      window.removeEventListener('storage', handleStorageEvent);
      storageListenerAttached = false;
    }
  }
}

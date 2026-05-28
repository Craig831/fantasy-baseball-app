import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REFRESH_TOKEN_KEY,
  __resetTokensForTests,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onRefreshTokenChange,
  setTokens,
} from './tokens';

beforeEach(() => {
  __resetTokensForTests();
});

afterEach(() => {
  __resetTokensForTests();
});

describe('tokens', () => {
  it('starts with no access or refresh token', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('setTokens stores access token in memory and refresh token in localStorage', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
  });

  it('clearTokens wipes both tokens', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('refresh token survives a fresh module read via localStorage', () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'persisted');
    expect(getRefreshToken()).toBe('persisted');
  });

  it('storage event from another tab invalidates the in-memory access token and notifies subscribers', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const listener = vi.fn();
    onRefreshTokenChange(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: REFRESH_TOKEN_KEY,
        oldValue: 'refresh-1',
        newValue: 'refresh-2',
        storageArea: window.localStorage,
      }),
    );

    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledWith('refresh-2');
  });

  it('storage event with a different key is ignored', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const listener = vi.fn();
    onRefreshTokenChange(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'unrelated:key',
        oldValue: 'a',
        newValue: 'b',
        storageArea: window.localStorage,
      }),
    );

    expect(getAccessToken()).toBe('access-1');
    expect(listener).not.toHaveBeenCalled();
  });

  it('localStorage.clear() (key=null) clears the access token and emits null', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const listener = vi.fn();
    onRefreshTokenChange(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: null,
        oldValue: null,
        newValue: null,
        storageArea: window.localStorage,
      }),
    );

    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('unsubscribe stops listener from firing', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const listener = vi.fn();
    const unsubscribe = onRefreshTokenChange(listener);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: REFRESH_TOKEN_KEY,
        oldValue: 'refresh-1',
        newValue: 'refresh-2',
        storageArea: window.localStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });
});

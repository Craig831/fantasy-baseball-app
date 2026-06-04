import React, { useEffect, useState } from 'react';

import { isApiError, splitValidationDetail } from '../../api/errors';
import { subscribeToQueryErrors } from '../../api/queryErrors';

interface Toast {
  id: number;
  message: string;
}

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const NETWORK_ERROR = 'Network error. Please check your connection.';
const AUTO_DISMISS_MS = 5_000;

let nextId = 0;

function toastMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 400) {
      const parts = splitValidationDetail(error);
      return parts.length > 0 ? parts.join(' ') : error.detail || GENERIC_ERROR;
    }
    // 5xx and all other HTTP errors: never expose server detail (FR-014)
    return GENERIC_ERROR;
  }
  // No response received — network-level failure
  return NETWORK_ERROR;
}

export function ApiErrorNotifier(): React.ReactElement | null {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToQueryErrors((error) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message: toastMessage(error) }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="flex items-start gap-3 rounded-md bg-red-600 px-4 py-3 text-white shadow-lg max-w-sm pointer-events-auto"
        >
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="shrink-0 text-white/80 hover:text-white leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

type ErrorListener = (error: unknown) => void;

const listeners = new Set<ErrorListener>();

export function subscribeToQueryErrors(fn: ErrorListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitQueryError(error: unknown): void {
  listeners.forEach((fn) => fn(error));
}

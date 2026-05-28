/**
 * RFC 7807 (application/problem+json) error mapping for the JellyBaseballV2 API.
 *
 * The API returns errors in the shape:
 *   { type: string; title: string; status: number; detail: string; instance?: string }
 *
 * Validation errors (status 400, title "Validation Error") deliver multiple
 * field errors as a single semicolon-delimited `detail` string per ERRORS.md.
 */

export interface ApiError {
  title: string;
  detail: string;
  status: number;
  type?: string;
  instance?: string;
}

const API_ERROR_BRAND: unique symbol = Symbol('ApiError');

interface BrandedApiError extends ApiError {
  readonly [API_ERROR_BRAND]: true;
}

export function makeApiError(input: {
  title?: string | null;
  detail?: string | null;
  status: number;
  type?: string | null;
  instance?: string | null;
}): ApiError {
  const branded: BrandedApiError = {
    title: input.title ?? 'Error',
    detail: input.detail ?? '',
    status: input.status,
    type: input.type ?? undefined,
    instance: input.instance ?? undefined,
    [API_ERROR_BRAND]: true,
  };
  return branded;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[API_ERROR_BRAND] === true
  );
}

/**
 * Split a Validation Error `detail` string into individual messages.
 * Per ERRORS.md, the API joins per-field validation errors with '; '.
 * Returns the trimmed parts; empty/whitespace-only segments are dropped.
 */
export function splitValidationDetail(err: ApiError | string): string[] {
  const detail = typeof err === 'string' ? err : err.detail;
  if (!detail) return [];
  return detail
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

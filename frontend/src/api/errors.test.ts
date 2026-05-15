import { describe, expect, it } from 'vitest';

import { isApiError, makeApiError, splitValidationDetail } from './errors';

describe('errors', () => {
  describe('isApiError', () => {
    it('returns true for an error created by makeApiError', () => {
      const err = makeApiError({ title: 'X', detail: 'y', status: 400 });
      expect(isApiError(err)).toBe(true);
    });

    it('returns false for a plain object that looks like ApiError', () => {
      const lookalike = { title: 'X', detail: 'y', status: 400 };
      expect(isApiError(lookalike)).toBe(false);
    });

    it('returns false for null, undefined, primitives, and Error', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError('oops')).toBe(false);
      expect(isApiError(new Error('oops'))).toBe(false);
    });
  });

  describe('makeApiError', () => {
    it('defaults title and detail when missing', () => {
      const err = makeApiError({ status: 500 });
      expect(err.title).toBe('Error');
      expect(err.detail).toBe('');
      expect(err.status).toBe(500);
    });
  });

  describe('splitValidationDetail', () => {
    it('splits a semicolon-delimited detail into trimmed parts', () => {
      const err = makeApiError({
        title: 'Validation Error',
        status: 400,
        detail: 'Email is required; Password must be at least 8 characters; Password must contain a digit',
      });
      expect(splitValidationDetail(err)).toEqual([
        'Email is required',
        'Password must be at least 8 characters',
        'Password must contain a digit',
      ]);
    });

    it('returns a single-element array for a non-delimited detail', () => {
      const err = makeApiError({
        title: 'Validation Error',
        status: 400,
        detail: 'Email is required',
      });
      expect(splitValidationDetail(err)).toEqual(['Email is required']);
    });

    it('drops empty segments produced by stray separators', () => {
      const err = makeApiError({ status: 400, detail: 'a;;b; ;c' });
      expect(splitValidationDetail(err)).toEqual(['a', 'b', 'c']);
    });

    it('accepts a raw string', () => {
      expect(splitValidationDetail('a; b')).toEqual(['a', 'b']);
    });

    it('returns [] for an empty or missing detail', () => {
      expect(splitValidationDetail(makeApiError({ status: 400, detail: '' }))).toEqual([]);
      expect(splitValidationDetail('')).toEqual([]);
    });
  });
});

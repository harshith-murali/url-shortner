/**
 * apiErrors.test.js — Tests for the shared API error utilities.
 */

import { describe, it, expect } from 'vitest';
import { isDuplicateKeyError } from '../apiErrors.js';

describe('isDuplicateKeyError', () => {
  it('detects MongoDB E11000 error by code', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it('detects MongoServerError with code 11000', () => {
    expect(isDuplicateKeyError({ name: 'MongoServerError', code: 11000 })).toBe(true);
  });

  it('returns false for non-duplicate errors', () => {
    expect(isDuplicateKeyError({ code: 500 })).toBe(false);
    expect(isDuplicateKeyError(new Error('something else'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDuplicateKeyError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDuplicateKeyError(undefined)).toBe(false);
  });
});

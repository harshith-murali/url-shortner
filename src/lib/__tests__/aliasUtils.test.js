/**
 * aliasUtils.test.js — Tests for the alias normalization and validation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeAlias,
  validateAlias,
  isReservedAlias,
  MAX_ALIAS_LENGTH,
  RESERVED_ALIASES,
} from '../aliasUtils.js';

/* ── normalizeAlias ─────────────────────────────────────────── */

describe('normalizeAlias', () => {
  it('converts to lowercase', () => {
    expect(normalizeAlias('MyLink')).toBe('mylink');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeAlias('  test  ')).toBe('test');
  });

  it('replaces single space with hyphen', () => {
    expect(normalizeAlias('My Link')).toBe('my-link');
  });

  it('replaces multiple spaces with a single hyphen', () => {
    expect(normalizeAlias('My   Link')).toBe('my-link');
  });

  it('trims AND replaces spaces — "  Test URL  " → "test-url"', () => {
    expect(normalizeAlias('  Test URL  ')).toBe('test-url');
  });

  it('preserves underscores — "hello_world" → "hello_world"', () => {
    expect(normalizeAlias('hello_world')).toBe('hello_world');
  });

  it('preserves hyphens', () => {
    expect(normalizeAlias('my-link')).toBe('my-link');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeAlias('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(normalizeAlias(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeAlias(undefined)).toBe('');
  });
});

/* ── validateAlias ──────────────────────────────────────────── */

describe('validateAlias', () => {
  it('accepts valid lowercase slug', () => {
    expect(validateAlias('my-link').valid).toBe(true);
  });

  it('accepts slug with underscores', () => {
    expect(validateAlias('hello_world').valid).toBe(true);
  });

  it('accepts alphanumeric slug', () => {
    expect(validateAlias('abc123').valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateAlias('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects alias with @ character — "invalid@slug" → rejected', () => {
    const result = validateAlias('invalid@slug');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/lowercase letters/i);
  });

  it('rejects alias with special characters', () => {
    expect(validateAlias('hello world').valid).toBe(false);
    expect(validateAlias('foo/bar').valid).toBe(false);
    expect(validateAlias('test!').valid).toBe(false);
  });

  it('rejects alias exceeding MAX_ALIAS_LENGTH', () => {
    const long = 'a'.repeat(MAX_ALIAS_LENGTH + 1);
    const result = validateAlias(long);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/characters or fewer/i);
  });

  it('accepts alias exactly at MAX_ALIAS_LENGTH', () => {
    const exact = 'a'.repeat(MAX_ALIAS_LENGTH);
    expect(validateAlias(exact).valid).toBe(true);
  });
});

/* ── isReservedAlias ────────────────────────────────────────── */

describe('isReservedAlias', () => {
  const reservedCases = ['api', 'dashboard', 'analytics', 'sign-in', 'sign-up', 'not-found', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml'];

  reservedCases.forEach((alias) => {
    it(`blocks reserved alias "${alias}"`, () => {
      expect(isReservedAlias(alias)).toBe(true);
    });
  });

  it('allows non-reserved aliases', () => {
    expect(isReservedAlias('my-link')).toBe(false);
    expect(isReservedAlias('hello')).toBe(false);
    expect(isReservedAlias('test123')).toBe(false);
  });

  it('is case-sensitive (reserved list is lowercase; input should be normalized first)', () => {
    // Reserved list uses lowercase — callers must normalize before checking
    expect(isReservedAlias('API')).toBe(false); // caller must normalizeAlias first
    expect(isReservedAlias('api')).toBe(true);
  });

  it('RESERVED_ALIASES is a Set for O(1) lookups', () => {
    expect(RESERVED_ALIASES).toBeInstanceOf(Set);
  });
});

/* ── Integration: normalize → validate → isReserved ── */

describe('full alias pipeline', () => {
  const pipeline = (raw) => {
    const alias = normalizeAlias(raw);
    const validation = validateAlias(alias);
    if (!validation.valid) return { ok: false, error: validation.error };
    if (isReservedAlias(alias)) return { ok: false, error: 'reserved' };
    return { ok: true, alias };
  };

  it('"My Link" → "my-link" (valid)', () => {
    const r = pipeline('My Link');
    expect(r.ok).toBe(true);
    expect(r.alias).toBe('my-link');
  });

  it('"  Test URL  " → "test-url" (valid)', () => {
    const r = pipeline('  Test URL  ');
    expect(r.ok).toBe(true);
    expect(r.alias).toBe('test-url');
  });

  it('"hello_world" → "hello_world" (valid)', () => {
    const r = pipeline('hello_world');
    expect(r.ok).toBe(true);
    expect(r.alias).toBe('hello_world');
  });

  it('"invalid@slug" → rejected', () => {
    const r = pipeline('invalid@slug');
    expect(r.ok).toBe(false);
  });

  it('"api" → rejected (reserved)', () => {
    const r = pipeline('api');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('reserved');
  });

  it('"  Dashboard  " → rejected (reserved after normalize)', () => {
    const r = pipeline('  Dashboard  ');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('reserved');
  });

  it('empty string → rejected', () => {
    const r = pipeline('');
    expect(r.ok).toBe(false);
  });
});

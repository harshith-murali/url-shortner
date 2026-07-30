/**
 * urlValidator.test.js — Tests for URL validation.
 */

import { describe, it, expect } from 'vitest';
import { validateUrl, MAX_URL_LENGTH } from '../urlValidator.js';

describe('validateUrl', () => {
  /* ── Valid URLs ── */

  it('accepts a valid https URL', () => {
    const r = validateUrl('https://example.com');
    expect(r.valid).toBe(true);
    expect(r.trimmedUrl).toBe('https://example.com');
  });

  it('accepts a valid http URL', () => {
    const r = validateUrl('http://example.com/path?q=1');
    expect(r.valid).toBe(true);
  });

  it('trims whitespace from a valid URL', () => {
    const r = validateUrl('  https://example.com  ');
    expect(r.valid).toBe(true);
    expect(r.trimmedUrl).toBe('https://example.com');
  });

  it('accepts URLs with paths and query strings', () => {
    expect(validateUrl('https://example.com/path/to/page?foo=bar&baz=1').valid).toBe(true);
  });

  it('returns the parsed URL object on success', () => {
    const r = validateUrl('https://example.com');
    expect(r.url).toBeInstanceOf(URL);
  });

  /* ── Protocol rejections ── */

  it('rejects ftp:// URLs', () => {
    expect(validateUrl('ftp://example.com').valid).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(validateUrl('data:text/html,<h1>hi</h1>').valid).toBe(false);
  });

  /* ── Format rejections ── */

  it('rejects empty string', () => {
    expect(validateUrl('').valid).toBe(false);
  });

  it('rejects null', () => {
    expect(validateUrl(null).valid).toBe(false);
  });

  it('rejects a plain word without protocol', () => {
    expect(validateUrl('notaurl').valid).toBe(false);
  });

  it('rejects a URL that is too long', () => {
    const long = 'https://example.com/' + 'a'.repeat(MAX_URL_LENGTH);
    expect(validateUrl(long).valid).toBe(false);
    expect(validateUrl(long).error).toMatch(/characters or fewer/i);
  });

  it('accepts a URL at exactly MAX_URL_LENGTH characters', () => {
    // Build a URL that is exactly MAX_URL_LENGTH chars
    const base = 'https://e.co/';
    const path = 'a'.repeat(MAX_URL_LENGTH - base.length);
    const url  = base + path;
    expect(url.length).toBe(MAX_URL_LENGTH);
    expect(validateUrl(url).valid).toBe(true);
  });

  /* ── Credential rejection ── */

  it('rejects URLs with embedded credentials', () => {
    const r = validateUrl('https://user:pass@example.com');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/credentials/i);
  });

  it('rejects URLs with only a username', () => {
    expect(validateUrl('https://user@example.com').valid).toBe(false);
  });

  /* ── Private network blocking (production only) ── */

  it('allows localhost in development (NODE_ENV=test)', () => {
    // NODE_ENV is "test" in vitest — private IP blocking is only in production
    expect(validateUrl('http://localhost:3000').valid).toBe(true);
  });
});

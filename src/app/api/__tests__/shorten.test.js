/**
 * shorten.test.js — Unit tests for POST /api/shorten
 *
 * All external dependencies (Clerk auth, MongoDB, nanoid) are mocked
 * so tests run without real credentials.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Shared mocks ───────────────────────────────────────────── */

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock DB connection
vi.mock('@/db/dbConfig', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc123'),
}));

// Mock rate limiter — always allow
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, headers: {} }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock Url model
const mockUrlCreate  = vi.fn();
const mockUrlFindOne = vi.fn();

vi.mock('@/models/UrlModel', () => ({
  Url: {
    create:  (...args) => mockUrlCreate(...args),
    findOne: (...args) => mockUrlFindOne(...args),
  },
}));

import { POST } from '../shorten/route.js';
import { auth } from '@clerk/nextjs/server';

/* ── Helpers ────────────────────────────────────────────────── */

function makeRequest(body) {
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

/**
 * slugExists() in the route calls findOne().lean() — our mock must return
 * an object with a .lean() method that resolves to the final value.
 */
function mockFindOneLean(result) {
  mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(result) });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ userId: null });
  mockFindOneLean(null); // no collision by default
  mockUrlCreate.mockImplementation(async (data) => ({
    ...data,
    _id: 'mock-id',
    createdAt: new Date(),
    expiresAt: data.expiresAt || null,
    customAlias: data.customAlias || undefined,
  }));
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
});

/* ── Tests ──────────────────────────────────────────────────── */

describe('POST /api/shorten', () => {
  /* ── Valid request ── */

  it('returns 201 with a short URL for a valid input', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.shortUrl).toContain('http://localhost:3000/');
  });

  /* ── URL validation ── */

  it('rejects missing URL with 400', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects invalid URL (no protocol) with 400', async () => {
    const res = await POST(makeRequest({ originalUrl: 'notaurl' }));
    expect(res.status).toBe(400);
  });

  it('rejects ftp:// URLs with 400', async () => {
    const res = await POST(makeRequest({ originalUrl: 'ftp://example.com' }));
    expect(res.status).toBe(400);
  });

  it('rejects URLs with embedded credentials with 400', async () => {
    const res = await POST(makeRequest({ originalUrl: 'https://user:pass@example.com' }));
    expect(res.status).toBe(400);
  });

  /* ── Custom alias ── */

  it('normalizes alias — stores "my-link" when given "My Link"', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com', customAlias: 'My Link' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.customAlias).toBe('my-link');
  });

  it('rejects alias with special characters with 400', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com', customAlias: 'invalid@slug' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/letters, numbers, hyphens/i);
  });

  it('rejects reserved alias "api" with 400', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com', customAlias: 'api' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/reserved/i);
  });

  it('rejects reserved alias "dashboard" with 400', async () => {
    const res = await POST(makeRequest({ originalUrl: 'https://example.com', customAlias: 'dashboard' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when alias is already taken', async () => {
    mockFindOneLean({ shortCode: 'taken', customAlias: 'my-link' });
    const req = makeRequest({ originalUrl: 'https://example.com', customAlias: 'my-link' });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('returns 409 on E11000 duplicate key for alias', async () => {
    mockFindOneLean(null); // no pre-check collision
    mockUrlCreate.mockRejectedValue({ code: 11000, keyPattern: { customAlias: 1 }, keyValue: { customAlias: 'my-link' } });
    const req = makeRequest({ originalUrl: 'https://example.com', customAlias: 'my-link' });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  /* ── Expiry ── */

  it('accepts valid expiresIn value', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com', expiresIn: '7' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    // Verify expiresAt was passed to create
    expect(mockUrlCreate.mock.calls[0][0].expiresAt).toBeInstanceOf(Date);
  });

  it('rejects invalid expiresIn value', async () => {
    const req = makeRequest({ originalUrl: 'https://example.com', expiresIn: '0' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  /* ── Short code generation ── */

  it('retries if initial shortCode is taken', async () => {
    const { nanoid } = await import('nanoid');
    let callCount = 0;
    nanoid.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 'taken1' : 'fresh1';
    });
    // First call returns taken, subsequent calls return null
    mockUrlFindOne
      .mockReturnValueOnce({ lean: () => Promise.resolve({ shortCode: 'taken1' }) })  // first candidate taken
      .mockReturnValue({ lean: () => Promise.resolve(null) }); // second candidate free

    const res = await POST(makeRequest({ originalUrl: 'https://example.com' }));
    expect(res.status).toBe(201);
    expect(callCount).toBe(2); // first attempt failed, second succeeded
  });
});

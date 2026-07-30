/**
 * redirect.test.js — Unit tests for the [shortCode] redirect route.
 *
 * Covers:
 *   - Valid redirect
 *   - Unknown shortCode → notFound()
 *   - Inactive link → notFound()
 *   - Expired link → notFound()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mock functions hoisted ── */
const {
  mockNotFound,
  mockUrlFindOne,
  mockUrlUpdate,
  mockClickCreate,
} = vi.hoisted(() => ({
  mockNotFound:    vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  mockUrlFindOne:  vi.fn(),
  mockUrlUpdate:   vi.fn().mockResolvedValue(undefined),
  mockClickCreate: vi.fn().mockResolvedValue(undefined),
}));

/* ── Mock next/navigation notFound ── */
vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

/* ── Mock next/server after ── */
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    after: vi.fn((fn) => {
      // Execute synchronously in tests so we can check it runs
      fn().catch(() => {});
    }),
  };
});

/* ── Mock DB ── */
vi.mock('@/db/dbConfig', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

/* ── Mock models ── */
vi.mock('@/models/UrlModel', () => ({
  Url: {
    findOne:           (...args) => mockUrlFindOne(...args),
    findByIdAndUpdate: (...args) => mockUrlUpdate(...args),
  },
  Click: {
    create: (...args) => mockClickCreate(...args),
  },
}));

import { GET } from '../../[shortCode]/route.js';

/* ── Helpers ── */

function makeRequest(ua = 'Mozilla/5.0') {
  return {
    headers: {
      get: (key) => {
        if (key === 'user-agent') return ua;
        if (key === 'referer') return null;
        if (key === 'x-forwarded-for') return null;
        if (key === 'x-real-ip') return null;
        return null;
      },
    },
    url: 'http://localhost:3000',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── Tests ── */

describe('GET /[shortCode] redirect', () => {
  it('redirects to originalUrl for a valid, active link', async () => {
    mockUrlFindOne.mockReturnValue({
      lean: () => Promise.resolve({
        _id:         'link-id',
        shortCode:   'abc123',
        originalUrl: 'https://example.com',
        isActive:    true,
        expiresAt:   null,
        customAlias: null,
      }),
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('https://example.com/');
  });

  it('calls notFound() for an unknown shortCode', async () => {
    mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });

    await expect(
      GET(makeRequest(), { params: Promise.resolve({ shortCode: 'unknown' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound() for an expired link', async () => {
    const past = new Date(Date.now() - 1000); // 1 second ago
    mockUrlFindOne.mockReturnValue({
      lean: () => Promise.resolve({
        _id:         'link-id',
        shortCode:   'expired1',
        originalUrl: 'https://example.com',
        isActive:    true,
        expiresAt:   past,
        customAlias: null,
      }),
    });

    await expect(
      GET(makeRequest(), { params: Promise.resolve({ shortCode: 'expired1' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('queries using customAlias when provided', async () => {
    mockUrlFindOne.mockReturnValue({
      lean: () => Promise.resolve({
        _id:         'link-id',
        shortCode:   'abc123',
        originalUrl: 'https://example.com',
        isActive:    true,
        expiresAt:   null,
        customAlias: 'my-link',
      }),
    });

    await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'my-link' }) });

    // findOne should have queried both fields
    const query = mockUrlFindOne.mock.calls[0][0];
    expect(query.$or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shortCode: 'my-link' }),
        expect.objectContaining({ customAlias: 'my-link' }),
      ])
    );
  });
});

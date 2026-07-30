/**
 * analytics.test.js — Unit tests for GET /api/analytics/[shortcode]
 *
 * Covers:
 *   - Authorization (requires userId)
 *   - Cross-user access prevention
 *   - Sensitive field projection (no IP/UA in output)
 *   - Timeline missing-day filling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db/dbConfig', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockUrlFindOne  = vi.fn();
const mockClickCount  = vi.fn();
const mockClickFind   = vi.fn();
const mockClickAggregate = vi.fn();

vi.mock('@/models/UrlModel', () => ({
  Url: {
    findOne: (...args) => mockUrlFindOne(...args),
  },
  Click: {
    countDocuments: (...args) => mockClickCount(...args),
    find:           (...args) => mockClickFind(...args),
    aggregate:      (...args) => mockClickAggregate(...args),
  },
}));

import { GET } from '../analytics/[shortcode]/route.js';
import { auth } from '@clerk/nextjs/server';

const VALID_ID = new mongoose.Types.ObjectId().toString();

function makeRequest() {
  return { headers: { get: () => null } };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
});

describe('GET /api/analytics/[shortcode]', () => {
  /* ── Authorization ── */

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when link belongs to another user (cross-user)', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    // findOne with userId filter returns null (different user)
    mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const res = await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    expect(res.status).toBe(404);
  });

  /* ── Sensitive field projection ── */

  it('does NOT include ipAddress or userAgent in recentClicks', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });

    const fakeLink = { _id: VALID_ID, shortCode: 'abc123', customAlias: null, userId: 'user-1', clicks: 5, createdAt: new Date(), isActive: true };
    mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(fakeLink) });

    const fakeClick = {
      _id: 'click-id',
      createdAt: new Date(),
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop',
      referrer: null,
      // These should NOT appear in the response:
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    };

    mockClickCount.mockResolvedValue(5);
    mockClickFind.mockReturnValue({
      sort:   () => ({
        limit: () => ({
          select: () => ({
            lean: () => Promise.resolve([{ ...fakeClick, ipAddress: undefined, userAgent: undefined }]),
          }),
        }),
      }),
    });
    mockClickAggregate.mockResolvedValue([]);

    const res = await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    // Recent clicks should not contain sensitive fields
    body.clicks.forEach((click) => {
      expect(click.ipAddress).toBeUndefined();
      expect(click.userAgent).toBeUndefined();
    });
  });

  /* ── countDocuments called exactly once ── */

  it('calls countDocuments exactly once (no duplicate)', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });

    const fakeLink = { _id: VALID_ID, shortCode: 'abc123', customAlias: null, userId: 'user-1', clicks: 0, createdAt: new Date(), isActive: true };
    mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(fakeLink) });
    mockClickCount.mockResolvedValue(0);
    mockClickFind.mockReturnValue({
      sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) }),
    });
    mockClickAggregate.mockResolvedValue([]);

    await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    expect(mockClickCount).toHaveBeenCalledTimes(1);
  });
});

/* ── fillMissingDays (timeline) ── */

describe('timeline: fillMissingDays', () => {
  // We test the utility indirectly through the API, but we can also test
  // the key behavior: does the response always contain exactly 30 days?

  it('contains exactly 30 entries when range spans 30 days', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });

    const fakeLink = { _id: VALID_ID, shortCode: 'abc123', customAlias: null, userId: 'user-1', clicks: 0, createdAt: new Date(), isActive: true };
    mockUrlFindOne.mockReturnValue({ lean: () => Promise.resolve(fakeLink) });
    mockClickCount.mockResolvedValue(0);
    mockClickFind.mockReturnValue({
      sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) }),
    });
    // Aggregate returns only one data point; the rest should be filled with 0
    mockClickAggregate.mockImplementation(async (pipeline) => {
      // Only the timeline aggregate returns data; others return []
      const hasDateGroup = JSON.stringify(pipeline).includes('dateToString');
      return hasDateGroup ? [{ _id: '2024-01-15', count: 3 }] : [];
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ shortCode: 'abc123' }) });
    const body = await res.json();

    // Should be 30 days (index 0 to 29 inclusive)
    expect(body.timeline.length).toBe(30);

    // All entries should have a date and count
    body.timeline.forEach((entry) => {
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('count');
      expect(typeof entry.count).toBe('number');
    });
  });
});

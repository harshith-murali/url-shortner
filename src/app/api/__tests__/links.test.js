/**
 * links.test.js — Unit tests for the links API routes.
 *
 * Covers:
 *   - GET /api/links (unauthorized, authorized)
 *   - DELETE /api/links/[id] (unauthorized, invalid ID, cross-user, success)
 *   - PATCH /api/links/[id] (editing)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

/* ── Mocks ── */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db/dbConfig', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOne  = vi.fn();
const mockFind     = vi.fn();
const mockFindById = vi.fn();
vi.mock('@/models/UrlModel', () => ({
  Url: {
    find:              (...args) => mockFind(...args),
    findOne:           (...args) => mockFindOne(...args),
    findByIdAndUpdate: (...args) => mockFindById(...args),
  },
}));

import { GET }    from '../links/route.js';
import { DELETE, PATCH } from '../links/[id]/route.js';
import { auth }   from '@clerk/nextjs/server';

/* ── Helpers ── */

function makeParams(id) {
  return { params: { then: () => {}, id } };
}

async function resolveParams(id) {
  return { params: Promise.resolve({ id }) };
}

// Real valid ObjectId for testing
const VALID_ID    = new mongoose.Types.ObjectId().toString();
const INVALID_ID  = 'not-a-valid-objectid';
const OTHER_ID    = new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
});

/* ── GET /api/links ── */

describe('GET /api/links', () => {
  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns links only for the authenticated user', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    const fakeLink = { _id: VALID_ID, shortCode: 'abc123', originalUrl: 'https://example.com', userId: 'user-1', clicks: 0, customAlias: null, createdAt: new Date() };
    mockFind.mockReturnValue({
      sort:  () => ({ lean: () => Promise.resolve([fakeLink]) }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.links).toHaveLength(1);
    expect(body.links[0].userId).toBe('user-1');
  });
});

/* ── DELETE /api/links/[id] ── */

describe('DELETE /api/links/[id]', () => {
  const makeDeleteReq = () => ({ headers: { get: () => null } });

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid MongoDB ObjectId', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: INVALID_ID }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid link id/i);
  });

  it('returns 404 when link belongs to another user (cross-user attempt)', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    // findOne returns null because userId doesn't match
    mockFindOne.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 and soft-deletes on success', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    const link = {
      _id: VALID_ID,
      userId: 'user-1',
      isActive: true,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockResolvedValue(link);

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    expect(link.isActive).toBe(false);
    expect(link.save).toHaveBeenCalled();
  });
});

/* ── PATCH /api/links/[id] ── */

describe('PATCH /api/links/[id]', () => {
  const makePatchReq = (body) => ({
    json: async () => body,
    headers: { get: () => null },
  });

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await PATCH(makePatchReq({}), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid ObjectId', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    const res = await PATCH(makePatchReq({}), { params: Promise.resolve({ id: INVALID_ID }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 if link not found for user', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    mockFindOne.mockResolvedValue(null);
    const res = await PATCH(makePatchReq({ customAlias: 'new-alias' }), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(404);
  });

  it('rejects reserved alias in patch', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    mockFindOne.mockResolvedValue({ _id: VALID_ID, userId: 'user-1' });
    const res = await PATCH(makePatchReq({ customAlias: 'api' }), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/reserved/i);
  });

  it('returns 409 if new alias is already taken', async () => {
    auth.mockResolvedValue({ userId: 'user-1' });
    // First findOne: ownership check (returns the link being edited)
    // Second findOne: collision check (returns a conflicting link)
    mockFindOne
      .mockReturnValueOnce({ lean: () => Promise.resolve({ _id: VALID_ID, userId: 'user-1' }) })
      .mockReturnValueOnce({ lean: () => Promise.resolve({ _id: OTHER_ID, shortCode: 'taken' }) });

    const res = await PATCH(makePatchReq({ customAlias: 'taken' }), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(409);
  });
});

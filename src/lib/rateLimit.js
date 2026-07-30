/**
 * rateLimit.js
 *
 * Production rate limiter for the shorten API.
 *
 * Strategy:
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set:
 *       Use @upstash/ratelimit (sliding window, serverless-safe).
 *   - Otherwise (local dev / missing credentials):
 *       Use an in-memory Map fallback. This is NOT suitable for production
 *       because it is per-process and does not survive restarts or scale across
 *       multiple instances.
 *
 * Rate limits (configurable via environment variables):
 *   Anonymous  — RATE_LIMIT_ANON   requests per minute (default: 10)
 *   Authed     — RATE_LIMIT_AUTHED requests per minute (default: 30)
 */

const ANON_LIMIT   = parseInt(process.env.RATE_LIMIT_ANON   || '10',  10);
const AUTHED_LIMIT = parseInt(process.env.RATE_LIMIT_AUTHED || '30',  10);
const WINDOW_MS    = 60_000; // 1 minute

/* ─── Upstash (production) ───────────────────────────────────── */

let upstashLimiter = null;

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const { Ratelimit }   = await import('@upstash/ratelimit');
    const { Redis }       = await import('@upstash/redis');

    const redis = new Redis({ url, token });

    upstashLimiter = {
      anon: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(ANON_LIMIT, '1 m'),
        prefix:  'sniply:rl:anon',
      }),
      authed: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(AUTHED_LIMIT, '1 m'),
        prefix:  'sniply:rl:authed',
      }),
    };

    return upstashLimiter;
  } catch (err) {
    console.error('[rateLimit] Failed to initialise Upstash limiter:', err.message);
    return null;
  }
}

/* ─── In-memory fallback (development only) ─────────────────── */

/** @type {Map<string, { count: number; windowStart: number }>} */
const memStore = new Map();

function memCheck(key, limit) {
  const now    = Date.now();
  const entry  = memStore.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    memStore.set(key, { count: 1, windowStart: now });
    return { success: true, remaining: limit - 1, reset: now + WINDOW_MS };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return {
    success:   entry.count <= limit,
    remaining,
    reset:     entry.windowStart + WINDOW_MS,
  };
}

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Check rate limit for a request.
 *
 * @param {string}  identifier — userId for authed, IP for anon
 * @param {boolean} isAuthed   — true if Clerk userId is present
 * @returns {Promise<{ success: boolean; remaining: number; reset: number; headers: Record<string,string> }>}
 */
export async function checkRateLimit(identifier, isAuthed = false) {
  const limit = isAuthed ? AUTHED_LIMIT : ANON_LIMIT;
  const key   = `${isAuthed ? 'u' : 'a'}:${identifier}`;

  let result;

  const limiter = await getUpstashLimiter();

  if (limiter) {
    // Upstash path
    const { success, remaining, reset } = await (isAuthed
      ? limiter.authed.limit(key)
      : limiter.anon.limit(key));

    result = { success, remaining: remaining ?? 0, reset: reset ?? Date.now() + WINDOW_MS };
  } else {
    // In-memory fallback — warn once per cold start
    if (!global._rlWarnIssued) {
      console.warn(
        '[rateLimit] WARNING: Running with in-memory rate limiter. ' +
        'This is NOT suitable for production. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable persistent limiting.'
      );
      global._rlWarnIssued = true;
    }
    result = memCheck(key, limit);
  }

  return {
    ...result,
    headers: {
      'X-RateLimit-Limit':     String(limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset':     String(Math.ceil(result.reset / 1000)),
      ...(result.success ? {} : { 'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)) }),
    },
  };
}

/**
 * Extract a trustworthy client IP from Next.js request headers.
 * In production (Vercel/Cloudflare), x-forwarded-for is set by the proxy.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {string}
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

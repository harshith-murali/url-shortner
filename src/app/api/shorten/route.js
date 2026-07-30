import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/db/dbConfig';
import { Url } from '@/models/UrlModel';
import { nanoid } from 'nanoid';
import { normalizeAlias, validateAlias, isReservedAlias } from '@/lib/aliasUtils';
import { validateUrl } from '@/lib/urlValidator';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { Errors, isDuplicateKeyError } from '@/lib/apiErrors';

/** Maximum number of shortCode generation retries before giving up. */
const MAX_RETRIES = 10;

/**
 * Check that a candidate slug does not collide with any existing record.
 * Queries BOTH shortCode and customAlias fields because they share the
 * same public URL namespace (/[slug]).
 *
 * @param {string} slug
 * @returns {Promise<boolean>} true if the slug is already taken
 */
async function slugExists(slug) {
  const doc = await Url.findOne({
    $or: [{ shortCode: slug }, { customAlias: slug }],
  }).lean();
  return !!doc;
}

export async function POST(request) {
  try {
    /* ── 1. Rate limiting ── */
    const { userId } = await auth();
    const ip          = getClientIp(request);
    const identifier  = userId || ip;

    const rateResult = await checkRateLimit(identifier, !!userId);
    if (!rateResult.success) {
      return Errors.tooManyRequests(rateResult.headers);
    }

    /* ── 2. Parse and validate request body ── */
    let body;
    try {
      body = await request.json();
    } catch {
      return Errors.badRequest('Invalid JSON body.');
    }

    const { originalUrl, customAlias: rawAlias, expiresIn } = body;

    // URL validation (protocol, length, credentials, private IPs)
    const urlCheck = validateUrl(originalUrl);
    if (!urlCheck.valid) {
      return Errors.badRequest(urlCheck.error);
    }
    const trimmedUrl = urlCheck.trimmedUrl;

    /* ── 3. Validate expiry ── */
    let expiresAt = null;
    if (expiresIn !== undefined && expiresIn !== null && expiresIn !== 'never') {
      const days = parseInt(expiresIn, 10);
      if (isNaN(days) || days <= 0 || days > 365) {
        return Errors.badRequest('expiresIn must be a positive integer (1–365 days).');
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    /* ── 4. Custom alias handling ── */
    await connectDB();

    let customAlias;
    if (rawAlias) {
      // Normalize first, then use the normalized value everywhere
      const alias = normalizeAlias(rawAlias);

      // Reject empty alias after normalization
      const aliasCheck = validateAlias(alias);
      if (!aliasCheck.valid) {
        return Errors.badRequest(aliasCheck.error);
      }

      // Block reserved application routes
      if (isReservedAlias(alias)) {
        return Errors.badRequest(
          `"${alias}" is a reserved path and cannot be used as an alias.`
        );
      }

      // Collision check across BOTH slug fields before insert
      // (The unique indexes on the DB are the final safety net for races.)
      if (await slugExists(alias)) {
        return Errors.conflict('That alias is already taken. Please try another.');
      }

      customAlias = alias; // store the normalized value
    }

    /* ── 5. Generate unique shortCode ── */
    let shortCode;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const candidate = nanoid(6);
      // A generated shortCode must not collide with existing codes OR aliases
      if (!(await slugExists(candidate))) {
        shortCode = candidate;
        break;
      }
    }

    if (!shortCode) {
      console.error('[POST /api/shorten] Could not generate unique shortCode after', MAX_RETRIES, 'attempts');
      return Errors.internal('Could not generate a unique code. Please try again.');
    }

    /* ── 6. Persist ── */
    let urlDoc;
    try {
      urlDoc = await Url.create({
        originalUrl: trimmedUrl,
        shortCode,
        customAlias: customAlias || undefined,
        userId:      userId || null,
        expiresAt:   expiresAt || null,
      });
    } catch (err) {
      // Handle race-condition duplicate key errors (E11000)
      if (isDuplicateKeyError(err)) {
        // Determine if alias or shortCode conflicted
        const isAlias = err.keyPattern?.customAlias || err.keyValue?.customAlias;
        if (isAlias) {
          return Errors.conflict('That alias is already taken. Please try another.');
        }
        // shortCode collision on race — very unlikely but safe to surface
        return Errors.conflict('Could not generate a unique short code. Please try again.');
      }
      throw err;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const slug    = urlDoc.customAlias || urlDoc.shortCode;

    return NextResponse.json(
      {
        shortCode:   urlDoc.shortCode,
        customAlias: urlDoc.customAlias,
        shortUrl:    `${baseUrl}/${slug}`,
        originalUrl: urlDoc.originalUrl,
        expiresAt:   urlDoc.expiresAt,
        createdAt:   urlDoc.createdAt,
      },
      {
        status:  201,
        headers: rateResult.headers,
      }
    );
  } catch (err) {
    console.error('[POST /api/shorten]', err);
    return Errors.internal();
  }
}
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/db/dbConfig';
import { Url } from '@/models/UrlModel';
import mongoose from 'mongoose';
import { normalizeAlias, validateAlias, isReservedAlias } from '@/lib/aliasUtils';
import { validateUrl } from '@/lib/urlValidator';
import { Errors, isDuplicateKeyError } from '@/lib/apiErrors';

/**
 * Validate that `id` is a syntactically valid MongoDB ObjectId.
 * Prevents Mongoose CastErrors from propagating as 500 responses.
 */
function isValidObjectId(id) {
  return mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/* ────────────────────────────────────────────────────────── DELETE */

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const { id } = await params;

    // Validate ObjectId before hitting the database
    if (!isValidObjectId(id)) {
      return Errors.badRequest('Invalid link ID.');
    }

    await connectDB();

    // Ownership enforced — only the owning user can delete their links
    const link = await Url.findOne({ _id: id, userId });
    if (!link) {
      return Errors.notFound('Link not found.');
    }

    // Soft delete — preserves click history for analytics
    link.isActive = false;
    await link.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/links/[id]]', err);
    return Errors.internal();
  }
}

/* ────────────────────────────────────────────────────────── PATCH */

export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return Errors.badRequest('Invalid link ID.');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Errors.badRequest('Invalid JSON body.');
    }

    const { originalUrl, customAlias: rawAlias, expiresIn, isActive } = body;

    await connectDB();

    // Ownership check
    const link = await Url.findOne({ _id: id, userId });
    if (!link) {
      return Errors.notFound('Link not found.');
    }

    const updates = {};

    // ── Update URL
    if (originalUrl !== undefined) {
      const urlCheck = validateUrl(originalUrl);
      if (!urlCheck.valid) return Errors.badRequest(urlCheck.error);
      updates.originalUrl = urlCheck.trimmedUrl;
    }

    // ── Update alias
    if (rawAlias !== undefined) {
      if (rawAlias === '' || rawAlias === null) {
        // Remove alias
        updates.customAlias = undefined;
        updates.$unset = { customAlias: '' };
      } else {
        const alias = normalizeAlias(rawAlias);
        const aliasCheck = validateAlias(alias);
        if (!aliasCheck.valid) return Errors.badRequest(aliasCheck.error);
        if (isReservedAlias(alias)) {
          return Errors.badRequest(`"${alias}" is a reserved path and cannot be used as an alias.`);
        }

        // Collision check — exclude self
        const existing = await Url.findOne({
          _id: { $ne: link._id },
          $or: [{ shortCode: alias }, { customAlias: alias }],
        }).lean();
        if (existing) {
          return Errors.conflict('That alias is already taken. Please try another.');
        }

        updates.customAlias = alias;
      }
    }

    // ── Update expiry
    if (expiresIn !== undefined) {
      if (expiresIn === null || expiresIn === 'never') {
        updates.expiresAt = null;
      } else {
        const days = parseInt(expiresIn, 10);
        if (isNaN(days) || days <= 0 || days > 365) {
          return Errors.badRequest('expiresIn must be a positive integer (1–365 days).');
        }
        updates.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    // ── Update active status
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    try {
      // Apply updates (handle $unset separately)
      const updateOp = updates.$unset
        ? { $set: { ...updates, $unset: undefined }, $unset: updates.$unset }
        : { $set: updates };
      const updated = await Url.findByIdAndUpdate(link._id, updateOp, { new: true }).lean();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.json({
        ...updated,
        shortUrl: `${baseUrl}/${updated.customAlias || updated.shortCode}`,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return Errors.conflict('That alias is already taken. Please try another.');
      }
      throw err;
    }
  } catch (err) {
    console.error('[PATCH /api/links/[id]]', err);
    return Errors.internal();
  }
}
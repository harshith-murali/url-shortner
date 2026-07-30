import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/db/dbConfig';
import { Url, Click } from '@/models/UrlModel';
import { Errors } from '@/lib/apiErrors';

/**
 * GET /api/analytics/[shortcode]/export
 *
 * Export click analytics for a link as CSV.
 *
 * Security:
 *   - Requires authentication and ownership of the link.
 *   - Exports only non-sensitive fields (no IP addresses or raw user-agents).
 */
export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const { shortcode } = await params;
    await connectDB();

    // Ownership check
    const link = await Url.findOne({
      userId,
      $or: [{ shortCode: shortcode }, { customAlias: shortcode }],
    }).lean();

    if (!link) return Errors.notFound('Link not found.');

    // Fetch all clicks for this link — only safe fields
    const clicks = await Click.find({ urlId: link._id })
      .sort({ createdAt: -1 })
      .select('createdAt browser os device referrer')
      .lean();

    // Build CSV
    const header = 'Timestamp,Browser,OS,Device,Referrer';
    const rows = clicks.map((c) => {
      const ts       = new Date(c.createdAt).toISOString();
      const browser  = escapeCsv(c.browser  || '');
      const os       = escapeCsv(c.os       || '');
      const device   = escapeCsv(c.device   || '');
      const referrer = escapeCsv(c.referrer || 'Direct');
      return `${ts},${browser},${os},${device},${referrer}`;
    });

    const csv  = [header, ...rows].join('\n');
    const slug = link.customAlias || link.shortCode;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sniply-${slug}-analytics.csv"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/analytics/[shortcode]/export]', err);
    return Errors.internal();
  }
}

/** Escape a value for safe inclusion in a CSV cell. */
function escapeCsv(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

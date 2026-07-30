import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/db/dbConfig';
import { Url, Click } from '@/models/UrlModel';
import mongoose from 'mongoose';
import { Errors } from '@/lib/apiErrors';

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Errors.unauthorized();
    }

    const { shortCode } = await params;
    await connectDB();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Ownership check — user must own this link
    const link = await Url.findOne({
      userId,
      $or: [{ shortCode }, { customAlias: shortCode }],
    }).lean();

    if (!link) {
      return Errors.notFound('Link not found.');
    }

    const urlId = new mongoose.Types.ObjectId(link._id);

    /**
     * Timeline range — normalized to UTC midnight boundaries.
     *
     * UTC is used throughout so that MongoDB $dateToString grouping
     * and the JavaScript fillMissingDays loop use the same day boundaries.
     * Without normalization the first/last buckets can be fractional days.
     */
    const now = new Date();
    // End: end of today UTC
    const endOfToday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      23, 59, 59, 999
    ));
    // Start: beginning of the day 30 days ago UTC (inclusive)
    const thirtyDaysAgo = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29,
      0, 0, 0, 0
    ));

    // Run all aggregations concurrently.
    // totalClicks is derived once from countDocuments (no duplicate call).
    const [
      totalClicks,
      recentClicks,
      timelineRaw,
      browserBreakdown,
      deviceBreakdown,
      osBreakdown,
      referrerBreakdown,
    ] = await Promise.all([
      // 1. Total click count (single authoritative call)
      Click.countDocuments({ urlId }),

      // 2. Recent clicks — project out sensitive fields before sending to browser
      Click.find({ urlId })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('-ipAddress -userAgent')  // never expose raw IP or UA to the client
        .lean(),

      // 3. 30-day click timeline (UTC grouping)
      Click.aggregate([
        { $match: { urlId, createdAt: { $gte: thirtyDaysAgo, $lte: endOfToday } } },
        {
          $group: {
            _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 4. Browser breakdown
      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // 5. Device breakdown
      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 6. OS breakdown
      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // 7. Referrer breakdown
      Click.aggregate([
        { $match: { urlId } },
        {
          $group: {
            _id:   { $cond: [{ $ifNull: ['$referrer', false] }, '$referrer', 'Direct'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    // Fill missing days with zero counts — uses same UTC range as aggregation
    const timeline = fillMissingDays(timelineRaw, thirtyDaysAgo, endOfToday);

    return NextResponse.json({
      link: {
        ...link,
        clicks:   totalClicks,
        shortUrl: `${baseUrl}/${link.customAlias || link.shortCode}`,
      },
      clicks: recentClicks,
      timeline,
      browserBreakdown,
      deviceBreakdown,
      osBreakdown,
      referrerBreakdown,
    });
  } catch (err) {
    console.error('[GET /api/analytics/[shortCode]]', err);
    return Errors.internal();
  }
}

/**
 * Fill missing calendar days in the timeline with count = 0.
 *
 * @param {Array<{_id: string, count: number}>} data  — MongoDB aggregation output
 * @param {Date} from  — UTC start (inclusive)
 * @param {Date} to    — UTC end (inclusive)
 * @returns {Array<{date: string, count: number}>}
 */
function fillMissingDays(data, from, to) {
  const map = Object.fromEntries(data.map((d) => [d._id, d.count]));
  const result = [];

  // Iterate day by day from start to end using UTC date components
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end    = new Date(Date.UTC(to.getUTCFullYear(),   to.getUTCMonth(),   to.getUTCDate()));

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
    result.push({ date: key, count: map[key] || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

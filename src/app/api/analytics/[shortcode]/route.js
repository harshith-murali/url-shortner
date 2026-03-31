import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/db/dbConfig";
import { Url, Click } from "@/models/UrlModel";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shortCode } = await params;
    await connectDB();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const link = await Url.findOne({
      userId,
      $or: [{ shortCode }, { customAlias: shortCode }],
    }).lean();

    if (!link) {
      return NextResponse.json({ error: "Link not found." }, { status: 404 });
    }

    const urlId = new mongoose.Types.ObjectId(link._id);
    const count = await Click.countDocuments({ urlId });
    console.log("DEBUG urlId:", urlId, "type:", typeof urlId, "count:", count);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalClicks,
      recentClicks,
      timelineRaw,
      browserBreakdown,
      deviceBreakdown,
      osBreakdown,
      referrerBreakdown,
    ] = await Promise.all([
      Click.countDocuments({ urlId }),

      Click.find({ urlId }).sort({ createdAt: -1 }).limit(50).lean(),

      Click.aggregate([
        { $match: { urlId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: "$browser", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: "$device", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Click.aggregate([
        { $match: { urlId } },
        { $group: { _id: "$os", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      Click.aggregate([
        { $match: { urlId } },
        {
          $group: {
            _id: {
              $cond: [{ $ifNull: ["$referrer", false] }, "$referrer", "Direct"],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const timeline = fillMissingDays(timelineRaw, thirtyDaysAgo);

    return NextResponse.json({
      link: {
        ...link,
        clicks: totalClicks,
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
    console.error("[GET /api/analytics/[shortCode]]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

function fillMissingDays(data, from) {
  const map = Object.fromEntries(data.map((d) => [d._id, d.count]));
  const result = [];
  const cursor = new Date(from);
  const today = new Date();

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

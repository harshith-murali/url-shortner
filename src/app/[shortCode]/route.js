import { NextResponse } from "next/server";
import { connectDB } from "@/db/dbConfig.js";
import { Url, Click } from "@/models/UrlModel.js";

function parseUserAgent(ua = "") {
  const s = ua.toLowerCase();

  let browser = "Unknown";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("chrome")) browser = "Chrome";
  else if (s.includes("safari")) browser = "Safari";
  else if (s.includes("firefox")) browser = "Firefox";

  let os = "Unknown";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad")) os = "iOS";
  else if (s.includes("mac")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";

  let device = "Desktop";
  if (s.includes("mobile") || s.includes("iphone")) device = "Mobile";
  else if (s.includes("tablet") || s.includes("ipad")) device = "Tablet";

  return { browser, os, device };
}

function getIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request, { params }) {
  try {
    const { shortCode } = await params;
    await connectDB();

    const link = await Url.findOne({
      $or: [{ shortCode }, { customAlias: shortCode }],
      isActive: true,
    });

    if (!link) {
      return NextResponse.redirect(new URL("/not-found", request.url));
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.redirect(new URL("/not-found", request.url));
    }

    const ua = request.headers.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(ua);
    const referrer = request.headers.get("referer") || null;
    const ipAddress = getIp(request);

    let referrerHost = null;
    try {
      if (referrer) referrerHost = new URL(referrer).hostname;
    } catch {}

    // Non-blocking — don't await so redirect is instant
    Promise.all([
      Url.findByIdAndUpdate(link._id, { $inc: { clicks: 1 } }),
      Click.create({
        urlId: link._id,          // ObjectId — matches schema type exactly
        shortCode: link.shortCode, // always canonical shortCode, never alias
        ipAddress,
        userAgent: ua,
        browser,
        os,
        device,
        referrer: referrerHost,
      }),
    ]).catch((err) => console.error("Click save error:", err));

    return NextResponse.redirect(link.originalUrl, { status: 307 });
  } catch (err) {
    console.error("[GET /[shortCode]]", err);
    return NextResponse.redirect(new URL("/not-found", request.url));
  }
}
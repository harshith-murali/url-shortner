import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { connectDB } from '@/db/dbConfig.js';
import { Url, Click } from '@/models/UrlModel.js';

/**
 * Parse a User-Agent string into browser / OS / device categories.
 * String matching is intentionally simple — accuracy vs. no extra dependency.
 *
 * @param {string} ua
 * @returns {{ browser: string, os: string, device: string }}
 */
function parseUserAgent(ua = '') {
  const s = ua.toLowerCase();

  let browser = 'Unknown';
  if (s.includes('edg/'))                        browser = 'Edge';
  else if (s.includes('opr/') || s.includes('opera')) browser = 'Opera';
  else if (s.includes('chrome'))                 browser = 'Chrome';
  else if (s.includes('safari'))                 browser = 'Safari';
  else if (s.includes('firefox'))                browser = 'Firefox';

  let os = 'Unknown';
  if (s.includes('windows'))                     os = 'Windows';
  else if (s.includes('android'))                os = 'Android';
  else if (s.includes('iphone') || s.includes('ipad')) os = 'iOS';
  else if (s.includes('mac'))                    os = 'macOS';
  else if (s.includes('linux'))                  os = 'Linux';

  let device = 'Desktop';
  if (s.includes('mobile') || s.includes('iphone'))  device = 'Mobile';
  else if (s.includes('tablet') || s.includes('ipad')) device = 'Tablet';

  return { browser, os, device };
}

/**
 * Extract the most trustworthy client IP from request headers.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {string}
 */
function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(request, { params }) {
  try {
    const { shortCode } = await params;
    await connectDB();

    const link = await Url.findOne({
      $or: [{ shortCode }, { customAlias: shortCode }],
      isActive: true,
    }).lean();

    // Unknown link — render the Next.js not-found boundary (app/not-found.jsx)
    // Using notFound() avoids redirecting to /not-found which could be another
    // short code and could cause redirect loops.
    if (!link) {
      notFound();
    }

    // Expired link
    if (link.expiresAt && new Date() > link.expiresAt) {
      notFound();
    }

    const ua           = request.headers.get('user-agent') || '';
    const { browser, os, device } = parseUserAgent(ua);
    const referrer     = request.headers.get('referer') || null;
    const ipAddress    = getIp(request);

    let referrerHost = null;
    try {
      if (referrer) referrerHost = new URL(referrer).hostname;
    } catch {
      // Malformed referrer — safe to ignore
    }

    /**
     * Post-response analytics write using Next.js `after()`.
     *
     * `after()` schedules work to run after the response has been sent,
     * keeping redirect latency minimal while giving the write time to complete.
     * This is the recommended pattern for serverless environments where the
     * process can be terminated once the response is flushed.
     *
     * Click consistency model:
     *   - The Click collection is the source of truth for analytics.
     *   - Url.clicks is a denormalized counter used only for the dashboard
     *     quick-view. If a write fails, the Click document is the authoritative
     *     record; the counter may drift and can be reconciled if needed.
     *   - We catch errors here so analytics failures never affect redirects.
     */
    after(async () => {
      try {
        await Promise.all([
          Url.findByIdAndUpdate(link._id, { $inc: { clicks: 1 } }),
          Click.create({
            urlId:     link._id,      // ObjectId — matches schema type exactly
            shortCode: link.shortCode, // always canonical shortCode, never alias
            ipAddress,
            userAgent: ua,
            browser,
            os,
            device,
            referrer:  referrerHost,
          }),
        ]);
      } catch (err) {
        // Log but never let analytics failures propagate
        console.error('[analytics] Click write failed:', {
          urlId:     String(link._id),
          shortCode: link.shortCode,
          error:     err?.message || err,
        });
      }
    });

    return NextResponse.redirect(link.originalUrl, { status: 307 });
  } catch (err) {
    console.error('[GET /[shortCode]]', err);
    notFound();
  }
}
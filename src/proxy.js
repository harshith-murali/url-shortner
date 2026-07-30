import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes — accessible without authentication.
 *
 * The short-link redirect uses a specific negative-lookahead pattern to
 * ensure that known application routes (/dashboard, /analytics, /api, etc.)
 * are NOT accidentally treated as short codes and bypass authentication.
 *
 * Pattern breakdown:
 *   /sign-in(.*)     — Clerk sign-in flow
 *   /sign-up(.*)     — Clerk sign-up flow
 *   /api/shorten     — anonymous link creation
 *   /(shortcode)     — the redirect itself, excludes all known app segments
 */
const isPublicRoute = createRouteMatcher([
  '/',                          // home / shortener form
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/shorten',               // allow anonymous shortening
  // Short-link redirects — exclude all known application and Next.js paths
  '/((?!api|dashboard|analytics|sign-in|sign-up|not-found|_next|_vercel|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Protects: /dashboard, /analytics/*, /api/links/*, /api/analytics/*
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Match all paths except static Next.js build assets and common file extensions
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
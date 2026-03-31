import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// These routes are accessible without authentication
const isPublicRoute = createRouteMatcher([
  '/',                  // home / shortener form
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/shorten',       // allow anonymous shortening (optional — remove if you want auth-only)
  '/:shortCode',        // ✅ THE REDIRECT — must be public so anyone can follow a short link
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Protects: /dashboard, /analytics/*, /api/links, /api/analytics/*
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
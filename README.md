# 🔗 Sniply — Smart URL Shortener

Sniply is a full-stack URL shortener built with Next.js, MongoDB, and Clerk. Shorten any link, track every click, and understand your audience with detailed analytics — all in under a second.

**Live demo:** [url-shortner-silk-nine.vercel.app](https://url-shortner-silk-nine.vercel.app)

---

## Features

- **Instant link shortening** — paste any URL and get a short link immediately
- **Custom aliases** — choose your own slug instead of a random code
- **Click analytics** — total clicks, 30-day timeline, browser, OS, device, and referrer breakdowns
- **Anonymous shortening** — no account required to shorten a link
- **Protected dashboard** — signed-in users see all their links in one place
- **Soft delete** — deleted links preserve their click history
- **Dark mode** — full dark/light theme with system preference detection
- **Clerk authentication** — Google OAuth and email/password sign-in

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | MongoDB + Mongoose |
| Auth | Clerk |
| Deployment | Vercel |
| Styling | CSS variables (no framework) |
| ID generation | nanoid |

---

## Project Structure

```
src/
├── app/
│   ├── [shortCode]/
│   │   └── route.js          # Redirect handler — core of the app
│   ├── api/
│   │   ├── shorten/
│   │   │   └── route.js      # POST — create a short link
│   │   ├── links/
│   │   │   ├── route.js      # GET — fetch all links for a user
│   │   │   └── [id]/
│   │   │       └── route.js  # DELETE — soft-delete a link
│   │   └── analytics/
│   │       └── [shortCode]/
│   │           └── route.js  # GET — analytics aggregations
│   ├── dashboard/
│   │   └── page.jsx          # Protected dashboard
│   ├── analytics/
│   │   └── [shortCode]/
│   │       └── page.jsx      # Analytics page
│   └── layout.jsx            # Root layout with ClerkProvider + ThemeProvider
├── components/
│   ├── ClerkThemeWrapper.jsx # Syncs Clerk modal theme with app dark mode
│   ├── ThemeProvider.jsx     # Dark/light theme context + toggle
│   └── Navbar.jsx
├── models/
│   └── UrlModel.js           # Url, Click, UserSettings schemas
└── db/
    └── dbConfig.js           # Mongoose connection with global caching
```

---

## Data Models

**Url**
```
shortCode      String   unique, 6-char nanoid
customAlias    String   optional, user-defined slug
originalUrl    String   the destination URL
userId         String   Clerk user ID (null for anonymous)
clicks         Number   denormalized counter
isActive       Boolean  false = soft-deleted
expiresAt      Date     optional expiry
```

**Click**
```
urlId          ObjectId ref to Url
shortCode      String   canonical short code (never alias)
browser        String
os             String
device         String   Desktop | Mobile | Tablet | Unknown
referrer       String   hostname of referring page
ipAddress      String
userAgent      String
createdAt      Date     used for timeline aggregations
```

---

## How It Works

1. **Shorten** — `POST /api/shorten` validates the URL, generates a unique `nanoid(6)` slug, saves a `Url` document, and returns the short URL.

2. **Redirect** — `GET /[shortCode]` looks up the link by `shortCode` or `customAlias`, fires a `307` redirect immediately, then saves a `Click` document and increments the counter in a non-blocking `Promise.all`.

3. **Analytics** — `GET /api/analytics/[shortCode]` casts `link._id` to `ObjectId` and runs parallel MongoDB aggregations for the timeline and all breakdowns in a single `Promise.all`.

4. **Auth** — Clerk wraps the app. `/dashboard` and `/api/links/*` require a valid session. Anonymous users can shorten but not manage links.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Clerk account

### Installation

```bash
git clone https://github.com/your-username/sniply.git
cd sniply
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/sniply

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is deployed on Vercel. To deploy your own:

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all environment variables from above in **Settings → Environment Variables**
4. Set `NEXT_PUBLIC_BASE_URL` to your Vercel URL
5. Deploy

---

## Known Limitations

- UA parsing is done manually with string matching — a library like `ua-parser-js` would be more accurate
- No rate limiting on the shorten endpoint
- Anonymous links are not claimable after signing in
- No link editing after creation

---

## License

MIT
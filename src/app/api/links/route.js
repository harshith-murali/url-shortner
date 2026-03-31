import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectDB } from '@/db/dbConfig'
import { Url } from '@/models/UrlModel'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const links = await Url.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    // Attach virtual shortUrl since .lean() skips virtuals
    const formatted = links.map(link => ({
      ...link,
      shortUrl: `${baseUrl}/${link.customAlias || link.shortCode}`,
    }))

    return NextResponse.json({ links: formatted })
  } catch (err) {
    console.error('[GET /api/links]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
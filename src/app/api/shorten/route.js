import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectDB } from '@/db/dbConfig'
import { Url } from '@/models/UrlModel'
import { nanoid } from 'nanoid'

function isValidUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { originalUrl, customAlias } = body

    if (!originalUrl || typeof originalUrl !== 'string') {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
    }

    const trimmed = originalUrl.trim()
    if (!isValidUrl(trimmed)) {
      return NextResponse.json(
        { error: 'Please enter a valid URL starting with http:// or https://' },
        { status: 400 }
      )
    }

    const { userId } = await auth()

    await connectDB()
    if (customAlias) {
      const alias = customAlias.trim().toLowerCase().replace(/\s+/g, '-')

      // Check alias is URL-safe
      if (!/^[a-z0-9-_]+$/.test(alias)) {
        return NextResponse.json(
          { error: 'Custom alias may only contain letters, numbers, hyphens, and underscores.' },
          { status: 400 }
        )
      }

      const existing = await Url.findOne({ $or: [{ shortCode: alias }, { customAlias: alias }] })
      if (existing) {
        return NextResponse.json({ error: 'That alias is already taken. Try another.' }, { status: 409 })
      }
    }

    let shortCode
    let attempts = 0
    do {
      shortCode = nanoid(6) 
      attempts++
      if (attempts > 10) {
        return NextResponse.json({ error: 'Could not generate a unique code. Try again.' }, { status: 500 })
      }
    } while (await Url.findOne({ shortCode }))

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const urlDoc = await Url.create({
      originalUrl: trimmed,
      shortCode,
      customAlias: customAlias ? customAlias.trim().toLowerCase() : undefined,
      userId: userId || null,
    })

    const slug = urlDoc.customAlias || urlDoc.shortCode

    return NextResponse.json(
      {
        shortCode: urlDoc.shortCode,
        customAlias: urlDoc.customAlias,
        shortUrl: `${baseUrl}/${slug}`,
        originalUrl: urlDoc.originalUrl,
        createdAt: urlDoc.createdAt,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/shorten]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
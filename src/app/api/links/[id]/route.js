import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectDB } from '@/db/dbConfig'
import { Url } from '@/models/UrlModel'

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await connectDB()

    // Only delete if the link belongs to this user
    const link = await Url.findOne({ _id: id, userId })

    if (!link) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 })
    }

    // Soft delete — keeps click history intact
    link.isActive = false
    await link.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/links/[id]]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
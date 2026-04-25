import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Returns a signed Cloudinary upload payload so the browser can POST
 * the (possibly large) raw file straight to Cloudinary, bypassing the
 * Vercel/Next 4.5 MB body limit that was causing 413 on /api/pdf-extract.
 *
 * Admin-email gated like other admin routes.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (
    session?.user?.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL?.toLowerCase()
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let folder = 'pdfs'
  try {
    const body = await req.json().catch(() => null)
    if (body && typeof body.folder === 'string') {
      // Whitelist a tiny set so a malicious admin token can't write to
      // arbitrary Cloudinary folders.
      const allowed = new Set(['pdfs', 'buyerchat/projects'])
      if (allowed.has(body.folder)) folder = body.folder
    }
  } catch {
    /* ignore — defaults are fine */
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 500 },
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret,
  )

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  })
}

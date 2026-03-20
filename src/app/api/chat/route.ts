import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'

  if (!rateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

  // AI implementation comes on Day 13
  return NextResponse.json({ message: 'Chat endpoint ready' })
}
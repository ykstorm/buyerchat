import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
try {
  const localities = await prisma.locality.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(localities)
}catch (err) {
  console.error('Localities fetch error:', err)
  return NextResponse.json({ error: 'Failed to fetch localities' }, { status: 500 })
}}
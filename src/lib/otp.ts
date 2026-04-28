// Stage B OTP utility (Agent G) — feature-flagged dark by default.
//
// Generation, hashing, throttle, verify. SHA-256 + per-row salt is enough
// for a 4-digit code with 5-attempt cap and 5-min TTL — bcrypt would burn
// edge CPU for no gain at this entropy band.
//
// Mama 2026-04-28 lock: STAGE_B_ENABLED defaults to 'false'; when off,
// callers (/api/otp/*) 404 without invoking these functions. So this lib
// only runs when an operator has flipped the flag.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSmsProvider } from '@/lib/sms-provider'

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5
const SEND_LIMIT = 3
const SEND_WINDOW_MS = 10 * 60 * 1000

function hashCode(code: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex')
}

function generate4Digit(): string {
  const buf = randomBytes(2)
  const n = (buf[0] * 256 + buf[1]) % 10000
  return n.toString().padStart(4, '0')
}

export async function sendOtp(
  phone: string,
  sessionId?: string
): Promise<
  | { ok: true; expiresAt: Date }
  | { ok: false; error: string; retryAfterSec?: number }
> {
  const windowStart = new Date(Date.now() - SEND_WINDOW_MS)
  const recent = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: windowStart } },
  })
  if (recent >= SEND_LIMIT) {
    const oldest = await prisma.otpCode.findFirst({
      where: { phone, createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    const retryAfterSec = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + SEND_WINDOW_MS - Date.now()) / 1000))
      : 600
    return { ok: false, error: 'Too many requests', retryAfterSec }
  }

  const code = generate4Digit()
  const salt = randomBytes(8).toString('hex')
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  await prisma.otpCode.create({
    data: {
      phone,
      code: `${salt}:${hashCode(code, salt)}`,
      sessionId: sessionId ?? null,
      expiresAt,
      maxAttempts: MAX_ATTEMPTS,
    },
  })

  const provider = getSmsProvider()
  const sent = await provider.sendOtp(phone, code)
  if (!sent.ok) {
    return { ok: false, error: sent.error }
  }
  return { ok: true, expiresAt }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await prisma.otpCode.findFirst({
    where: {
      phone,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return { ok: false, error: 'No active code' }

  if (row.attempts >= row.maxAttempts) {
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { expiresAt: new Date() },
    })
    return { ok: false, error: 'Too many attempts' }
  }

  const [salt, expectedHash] = row.code.split(':')
  const submittedHash = hashCode(code, salt ?? '')

  if (submittedHash !== expectedHash) {
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    })
    return { ok: false, error: 'Invalid code' }
  }

  await prisma.otpCode.update({
    where: { id: row.id },
    data: { verifiedAt: new Date() },
  })
  return { ok: true }
}

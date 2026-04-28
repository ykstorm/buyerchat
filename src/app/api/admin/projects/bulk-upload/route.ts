import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parse } from 'csv-parse/sync'
import * as Sentry from '@sentry/nextjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { auditWrite } from '@/lib/audit-write'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BODY_BYTES = 1_048_576
const CHUNK_SIZE = 25
const RATE_LIMIT_PER_MIN = 2
const RATE_LIMIT_WINDOW_MS = 60_000

// Block E4: every reraNumber written by an admin surface must match this
// shape. Bulk path is the riskiest write site (one row pollutes many);
// any failure rejects the entire batch even in dry-run mode.
const RERA_REGEX = /^[A-Z0-9\-/]+$/i

const reqStr = (max = 200) => z.string().min(1).max(max)
const optStr = (max = 1000) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => (s === undefined || s === '' ? undefined : s))

const reqNum = z.string().min(1, 'required').transform((s, ctx) => {
  const n = Number(s)
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be a finite number' })
    return z.NEVER
  }
  return n
})

const optNum = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s === '') return undefined
    const n = Number(s)
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be a finite number' })
      return z.NEVER
    }
    return n
  })

const optInt = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s === '') return undefined
    const n = Number(s)
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be an integer' })
      return z.NEVER
    }
    return n
  })

const RowSchema = z.object({
  name: reqStr(200),
  builder: reqStr(200),
  zone: reqStr(200),
  rera_number: reqStr(100).regex(RERA_REGEX, 'reraNumber must match /^[A-Z0-9\\-/]+$/i'),
  rera_status: reqStr(100),
  min_price_lakh: reqNum,
  max_price_lakh: reqNum,
  possession_date: reqStr(60),
  latitude: reqNum.refine((n) => n >= -90 && n <= 90, 'latitude out of range'),
  longitude: reqNum.refine((n) => n >= -180 && n <= 180, 'longitude out of range'),
  units: optInt,
  bsp_sqft: optNum,
  possession_flag: optStr(50),
  decision_tag: optStr(100),
  honest_concern: optStr(2000),
  analyst_note: optStr(2000),
  configurations: optStr(500),
  bank_approvals: optStr(500),
  carpet_sqft: optInt,
  sba_sqft: optInt,
  price_note: optStr(500),
})

type Row = z.infer<typeof RowSchema>

function normalizeRow(raw: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) {
      out[k] = undefined
      continue
    }
    const s = String(v).trim()
    out[k] = s === '' ? undefined : s
  }
  return out
}

// Mirrors import-projects.mjs:55-80. Returns null if unparseable so the
// caller can record a row-level error rather than silently fall back to a
// fixed default.
function parsePossessionDate(raw: string): Date | null {
  const clean = raw.split('(')[0].trim()
  const ddmmyyyy = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (ddmmyyyy) {
    const d = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`)
    return isNaN(d.getTime()) ? null : d
  }
  const monthYear = clean.match(/^(\w+)\s+(\d{4})$/)
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`)
    return isNaN(d.getTime()) ? null : d
  }
  const isoDate = clean.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoDate) {
    const d = new Date(clean)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

interface PreviewCreate {
  projectName: string
  reraNumber: string
  builderName: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const email = session?.user?.email?.toLowerCase()
    if (!email || email !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const ok = await rateLimit(`bulk-upload:${email}:${ip}`, RATE_LIMIT_PER_MIN, RATE_LIMIT_WINDOW_MS)
    if (!ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const contentLengthHeader = req.headers.get('content-length')
    if (contentLengthHeader) {
      const cl = parseInt(contentLengthHeader, 10)
      if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
        return NextResponse.json(
          { error: 'Payload too large (max 1 MB)' },
          { status: 413 },
        )
      }
    }

    const formData = await req.formData()
    const fileField = formData.get('file')
    if (!fileField || typeof fileField === 'string') {
      return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 })
    }
    const file = fileField as File
    if (file.size > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large (max 1 MB)' },
        { status: 413 },
      )
    }

    const csvText = await file.text()

    let rawRows: Record<string, unknown>[]
    try {
      rawRows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, unknown>[]
    } catch (e) {
      return NextResponse.json(
        { error: 'CSV parse failed', reason: (e as Error).message },
        { status: 400 },
      )
    }

    const errors: Array<{ row: number; reason: string }> = []
    const validated: Array<{ csvLine: number; data: Row; possession: Date }> = []

    rawRows.forEach((raw, idx) => {
      // CSV line number = data row index + 2 (1 for header, 1 for 1-indexed).
      const csvLine = idx + 2
      const normalized = normalizeRow(raw)
      const parsed = RowSchema.safeParse(normalized)
      if (!parsed.success) {
        const reason = parsed.error.issues
          .map((i) => `${i.path.join('.') || '(row)'}: ${i.message}`)
          .join('; ')
        errors.push({ row: csvLine, reason })
        return
      }
      const possession = parsePossessionDate(parsed.data.possession_date)
      if (!possession) {
        errors.push({
          row: csvLine,
          reason: `possession_date unparseable: "${parsed.data.possession_date}"`,
        })
        return
      }
      validated.push({ csvLine, data: parsed.data, possession })
    })

    // All-or-nothing: ANY validation failure (including the regex) blocks
    // the entire batch. ZERO writes happen — even in dry-run mode the
    // response is 400 to keep the UX honest about what would fail.
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', creates: [], duplicates: [], errors },
        { status: 400 },
      )
    }

    const reraNumbers = validated.map((v) => v.data.rera_number)
    const existing = reraNumbers.length
      ? await prisma.project.findMany({
          where: { reraNumber: { in: reraNumbers } },
          select: { reraNumber: true },
        })
      : []
    const existingSet = new Set(existing.map((p) => p.reraNumber))

    const duplicates: string[] = []
    const creates: typeof validated = []
    for (const v of validated) {
      if (existingSet.has(v.data.rera_number)) duplicates.push(v.data.rera_number)
      else creates.push(v)
    }

    const url = new URL(req.url)
    const commit = url.searchParams.get('commit') === 'true'

    if (!commit) {
      const previews: PreviewCreate[] = creates.map((c) => ({
        projectName: c.data.name,
        reraNumber: c.data.rera_number,
        builderName: c.data.builder,
      }))
      return NextResponse.json({
        creates: previews,
        duplicates,
        errors: [],
        committed: false,
      })
    }

    let auditCount = 0
    const created: Array<{ id: string; reraNumber: string }> = []
    const commitErrors: Array<{ row: number; reason: string }> = []

    for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
      const chunk = creates.slice(i, i + CHUNK_SIZE)
      for (const row of chunk) {
        try {
          const project = await prisma.project.create({
            data: {
              projectName: row.data.name,
              builderName: row.data.builder,
              microMarket: row.data.zone,
              constructionStatus: row.data.rera_status,
              availableUnits: row.data.units ?? 0,
              possessionDate: row.possession,
              possessionFlag: row.data.possession_flag ?? null,
              reraNumber: row.data.rera_number,
              latitude: row.data.latitude,
              longitude: row.data.longitude,
              minPrice: row.data.min_price_lakh * 100_000,
              maxPrice: row.data.max_price_lakh * 100_000,
              pricePerSqft: row.data.bsp_sqft ?? 0,
              decisionTag: row.data.decision_tag ?? null,
              honestConcern: row.data.honest_concern ?? null,
              analystNote: row.data.analyst_note ?? null,
              configurations: row.data.configurations ?? null,
              bankApprovals: row.data.bank_approvals ?? null,
              carpetSqftMin: row.data.carpet_sqft ?? null,
              sbaSqftMin: row.data.sba_sqft ?? null,
              priceNote: row.data.price_note ?? null,
              unitTypes: [],
              amenities: [],
              createdBy: email,
              updatedBy: email,
            },
            select: { id: true, reraNumber: true },
          })
          try {
            await auditWrite({
              entity: 'Project',
              entityId: project.id,
              action: 'bulk_import',
              after: {
                ...row.data,
                possessionDate: row.possession.toISOString(),
              },
              actor: email,
            })
            auditCount++
          } catch (auditErr) {
            // Project row exists; the audit miss is a logged warning, not a 500.
            Sentry.captureException(auditErr, {
              tags: { module: 'bulk-upload', stage: 'audit-after-create' },
              extra: { projectId: project.id, reraNumber: row.data.rera_number },
            })
          }
          created.push(project)
        } catch (createErr) {
          // FK miss (P2003 — builder doesn't exist) etc. Report as a row error
          // rather than 500ing the whole batch. Operator re-runs after fixing.
          Sentry.captureException(createErr, {
            tags: { module: 'bulk-upload', stage: 'project-create' },
            extra: { row: row.csvLine, reraNumber: row.data.rera_number },
          })
          commitErrors.push({
            row: row.csvLine,
            reason: `create failed: ${(createErr as Error).message}`,
          })
        }
      }
    }

    return NextResponse.json({
      creates: created,
      duplicates,
      errors: commitErrors,
      auditCount,
      committed: true,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { module: 'bulk-upload', stage: 'top-level' } })
    return NextResponse.json(
      { error: 'Internal error', reason: (err as Error).message },
      { status: 500 },
    )
  }
}

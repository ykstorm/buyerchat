/**
 * Visit follow-up scheduler — Agent 8.
 *
 * Source of truth: docs/source-of-truth/visit-followup-playbook.txt
 * (PARTS B, D, F). Templates here are copied verbatim from that file.
 * If you tweak wording, update the playbook in the same PR — the doc
 * wins on conflict.
 *
 * Flow:
 *   1. /api/cron/visit-followups runs every 15 min on Vercel cron.
 *   2. computeFollowupsDue(now) returns rows that are inside a window
 *      AND whose corresponding *Sent timestamp is still NULL.
 *   3. sendFollowup(visit, kind) writes the verbatim message text to
 *      a CRMEvent row, marks the *Sent column on SiteVisit, and (for
 *      now) returns a wa.me click-to-chat link as the "delivery
 *      channel". When DLT WhatsApp lands the call site does not change.
 */

import type { SiteVisit } from '@prisma/client'
import { prisma } from './prisma'

export type FollowupKind =
  | 'followup_t24'
  | 'followup_t3'
  | 'followup_t1'
  | 'post_visit_t1'
  | 'post_visit_t24'
  | 'post_visit_t48'
  | 'post_visit_t72_close'

export interface FollowupDue {
  visit: SiteVisit & { project?: { projectName: string } | null }
  kind: FollowupKind
  payload: { projectName: string; slot: Date; token: string }
}

const HOUR_MS = 60 * 60 * 1000

// ---------------------------------------------------------------
// Window definitions — values are offsets from `slot` in milliseconds.
// `min` is inclusive, `max` is exclusive. A nullable check on the
// corresponding *Sent column is what makes this idempotent.
// ---------------------------------------------------------------
interface WindowDef {
  kind: FollowupKind
  /** offset (ms) at start of window relative to `slot`. negative = before slot. */
  minOffsetMs: number
  /** offset (ms) at end of window relative to `slot`. */
  maxOffsetMs: number
  sentField: keyof SiteVisit
}

const WINDOWS: ReadonlyArray<WindowDef> = [
  // T-24: now ∈ [slot - 25h, slot - 23h]
  { kind: 'followup_t24', minOffsetMs: -25 * HOUR_MS, maxOffsetMs: -23 * HOUR_MS, sentField: 'followupT24Sent' },
  // T-3:  now ∈ [slot - 3.5h, slot - 2.5h]
  { kind: 'followup_t3',  minOffsetMs: -3.5 * HOUR_MS, maxOffsetMs: -2.5 * HOUR_MS, sentField: 'followupT3Sent' },
  // T-1:  now ∈ [slot - 1.5h, slot - 0.5h]
  { kind: 'followup_t1',  minOffsetMs: -1.5 * HOUR_MS, maxOffsetMs: -0.5 * HOUR_MS, sentField: 'followupT1Sent' },
  // T+1:  now ∈ [slot + 0.5h, slot + 1.5h]
  { kind: 'post_visit_t1',  minOffsetMs: 0.5 * HOUR_MS, maxOffsetMs: 1.5 * HOUR_MS, sentField: 'postVisitT1Sent' },
  // T+24: now ∈ [slot + 23h, slot + 25h]
  { kind: 'post_visit_t24', minOffsetMs: 23 * HOUR_MS, maxOffsetMs: 25 * HOUR_MS, sentField: 'postVisitT24Sent' },
  // T+48: now ∈ [slot + 47h, slot + 49h]
  { kind: 'post_visit_t48', minOffsetMs: 47 * HOUR_MS, maxOffsetMs: 49 * HOUR_MS, sentField: 'postVisitT48Sent' },
] as const

/**
 * Pure decision function — given a single visit row + `now`, returns the
 * follow-up kinds that are currently due. Exposed for unit tests.
 *
 * `pre_post_windows` returns kinds inside the ±25hr / ±49hr windows.
 * `t72_close` is treated separately because its window is unbounded
 * on the right (any visit older than 72h whose close flag is unset).
 */
export function followupsDueForVisit(
  visit: SiteVisit & { project?: { projectName: string } | null },
  now: Date
): FollowupKind[] {
  const due: FollowupKind[] = []
  const slotMs = visit.visitScheduledDate.getTime()
  const deltaMs = now.getTime() - slotMs

  for (const win of WINDOWS) {
    if (deltaMs < win.minOffsetMs || deltaMs >= win.maxOffsetMs) continue
    if ((visit as unknown as Record<string, unknown>)[win.sentField] != null) continue
    due.push(win.kind)
  }

  // T+72 close: now > slot + 72h AND not yet closed.
  if (deltaMs > 72 * HOUR_MS && !visit.postVisit72Closed) {
    due.push('post_visit_t72_close')
  }
  return due
}

/**
 * Returns every (visit, kind) pair that is currently inside its
 * follow-up window AND has not yet been sent. Idempotent — once a
 * timestamp is set on the row, the same row stops appearing for that
 * kind.
 *
 * Performance: a single SiteVisit query bracketed by ±72hr around `now`
 * covers all six pre/post windows. The 72hr-close exit is handled
 * separately because its window is unbounded on the right.
 */
export async function computeFollowupsDue(now: Date): Promise<FollowupDue[]> {
  const lo = new Date(now.getTime() - 72 * HOUR_MS)
  const hi = new Date(now.getTime() + 25 * HOUR_MS)

  // Fetch confirmed (otp-verified) visits in the active window.
  // We rely on otpVerified as the "confirmed" signal — that is the
  // existing semantic in /api/visit-requests.
  const visits = await prisma.siteVisit.findMany({
    where: {
      otpVerified: true,
      visitScheduledDate: { gte: lo, lte: hi },
    },
    include: { project: { select: { projectName: true } } },
  })

  const due: FollowupDue[] = []
  for (const visit of visits) {
    for (const kind of followupsDueForVisit(visit, now)) {
      if (kind === 'post_visit_t72_close') continue // handled below
      due.push({
        visit,
        kind,
        payload: {
          projectName: visit.project?.projectName ?? 'your shortlisted project',
          slot: visit.visitScheduledDate,
          token: visit.visitToken,
        },
      })
    }
  }

  // T+72 graceful-exit window: now > slot + 72h AND postVisit72Closed is false.
  // No upper bound on the right — bracket the SQL by visitScheduledDate
  // > now - 30d so we don't sweep ancient visits forever.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * HOUR_MS)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * HOUR_MS)
  const closeCandidates = await prisma.siteVisit.findMany({
    where: {
      otpVerified: true,
      postVisit72Closed: false,
      visitScheduledDate: { gte: thirtyDaysAgo, lt: seventyTwoHoursAgo },
    },
    include: { project: { select: { projectName: true } } },
  })
  for (const visit of closeCandidates) {
    due.push({
      visit,
      kind: 'post_visit_t72_close',
      payload: {
        projectName: visit.project?.projectName ?? 'your shortlist',
        slot: visit.visitScheduledDate,
        token: visit.visitToken,
      },
    })
  }

  return due
}

// ---------------------------------------------------------------
// Verbatim message templates (playbook PART B, D, F).
// These are USER-FACING copy. Do not paraphrase.
// ---------------------------------------------------------------

function formatDay(slot: Date): string {
  // dd MMM (e.g. "26 Apr") — short form fits Hinglish copy without locale flicker.
  return slot.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function formatTime(slot: Date): string {
  return slot.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function buildFollowupMessage(kind: FollowupKind, payload: { projectName: string; slot: Date; token: string }): string {
  const project = payload.projectName
  const day = formatDay(payload.slot)
  const time = formatTime(payload.slot)

  switch (kind) {
    case 'followup_t24':
      return `Kal aapka ${project} ka visit hai — ${day} ${time}.
2 cheeze especially dekhna:
1. Bedroom ka actual size — comfortable lagta hai ya nahi
2. Light aur ventilation — sirf sample flat pe depend mat karna
Baaki jo bhi confusion aaye — wapas yahin discuss kar lenge.`

    case 'followup_t3':
      return `${project} visit aaj — ${time} pe.
Quick tip: Builder jo bhi price ya special offer bole — uska exact breakdown ya screenshot le lena.
Yahin check karenge ki real value kya hai.`

    case 'followup_t1':
      return `Site ke paas honge ab.
Simple approach rakho:
1. Pehle pura dekho — bina commit kiye
2. Jo pasand nahi aaya — note karo
3. Final decision baad mein calmly lete hain
Yahin wapas aake sab compare karenge.`

    case 'post_visit_t1':
      return `Visit kaisa raha?
Seedha batao — kya achha laga aur kya doubt aaya?`

    case 'post_visit_t24':
      return `Kal ka visit kaafi useful raha hoga.
Usually iss stage pe 2 cheeze hoti hain — ya project pasand aata hai, ya doubt clear nahi hota. Aapka case konsa hai?`

    case 'post_visit_t48':
      return `Aapka ${project} visit pending decision mein hai.
Agar doubt hai toh clear kar lete hain — galat decision lene se better hai 5 min discuss karna.`

    case 'post_visit_t72_close':
      return `Aapka shortlist active hai.
Jab ready ho — yahin se continue kar sakte hain.`
  }
}

// ---------------------------------------------------------------
// sendFollowup — fire-and-record. Currently writes a CRMEvent row
// and a wa.me click-to-chat link instead of a programmatic WhatsApp
// send. When DLT WhatsApp lands, this function flips to template
// dispatch without changing call sites.
// ---------------------------------------------------------------
export async function sendFollowup(
  visit: SiteVisit & { project?: { projectName: string } | null },
  kind: FollowupKind
): Promise<{ ok: boolean; channel: 'whatsapp' | 'in_app' }> {
  const payload = {
    projectName: visit.project?.projectName ?? 'your shortlist',
    slot: visit.visitScheduledDate,
    token: visit.visitToken,
  }
  const messageText = buildFollowupMessage(kind, payload)
  const waLink = visit.buyerPhone
    ? `https://wa.me/${visit.buyerPhone}?text=${encodeURIComponent(messageText)}`
    : null

  // Mark Sent timestamp / close flag and audit-log atomically.
  // Atomicity matters: if CRMEvent insert fails, we must not mark
  // the column sent (otherwise we silently skip the next sweep).
  await prisma.$transaction([
    prisma.cRMEvent.create({
      data: {
        visitId: visit.id,
        buyerId: visit.userId,
        kind,
        channel: 'in_app',
        payload: {
          messageText,
          waLink,
          token: visit.visitToken,
          projectName: payload.projectName,
        },
      },
    }),
    prisma.siteVisit.update({
      where: { id: visit.id },
      data: kind === 'post_visit_t72_close'
        ? { postVisit72Closed: true }
        : ({ [kindToSentField(kind)]: new Date() } as Record<string, Date>),
    }),
  ])

  return { ok: true, channel: 'in_app' }
}

function kindToSentField(kind: FollowupKind): string {
  switch (kind) {
    case 'followup_t24':       return 'followupT24Sent'
    case 'followup_t3':        return 'followupT3Sent'
    case 'followup_t1':        return 'followupT1Sent'
    case 'post_visit_t1':      return 'postVisitT1Sent'
    case 'post_visit_t24':     return 'postVisitT24Sent'
    case 'post_visit_t48':     return 'postVisitT48Sent'
    case 'post_visit_t72_close': return 'postVisit72Closed'
  }
}

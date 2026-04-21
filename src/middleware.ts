// Do not instrument middleware with Sentry — edge size limit
// RBAC LIMITATION: Currently single-admin (ADMIN_EMAIL env var).
// If multi-admin is needed, add a Role field to the User model and check
// token.role instead of comparing email. All /api/admin/* routes also
// duplicate the email check — those must be updated in tandem.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

  if (isAdminRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token'
    })

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Case-insensitive comparison — must match the check used in all
    // /api/admin/* route handlers. Email is case-insensitive per RFC 5321
    // local-part conventions; mismatched casing here would let a visitor
    // past middleware and get 401 at the route (or vice versa).
    const tokenEmail = typeof token.email === 'string' ? token.email.toLowerCase() : ''
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? ''
    if (!tokenEmail || !adminEmail || tokenEmail !== adminEmail) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // CSRF origin check on admin mutation routes — Origin MUST be present
    const method = request.method.toUpperCase()
    if (pathname.startsWith('/api/admin') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin')
      if (!origin) {
        return NextResponse.json({ error: 'Missing Origin header on mutation' }, { status: 403 })
      }
      const allowedOrigins = [
        new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').origin,
        'https://homesty.ai',
        'https://www.homesty.ai',
        'https://buyerchat-ten.vercel.app',
      ]
      if (!allowedOrigins.includes(origin)) {
        return NextResponse.json({ error: 'CSRF origin mismatch' }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}

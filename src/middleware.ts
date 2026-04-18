// Do not instrument middleware with Sentry — edge size limit
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

    if (token.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // CSRF origin check on admin mutation routes
    const method = request.method.toUpperCase()
    if (pathname.startsWith('/api/admin') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin')
      const allowedOrigins = [
        new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').origin,
        'https://homesty.ai',
        'https://www.homesty.ai',
        'https://buyerchat-ten.vercel.app',
      ]
      if (origin && !allowedOrigins.includes(origin)) {
        return NextResponse.json({ error: 'CSRF origin mismatch' }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}

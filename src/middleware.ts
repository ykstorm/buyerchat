import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isApiAdminRoute = req.nextUrl.pathname.startsWith('/api/admin')

  if (isAdminRoute || isApiAdminRoute) {
    const session = req.auth
    const adminEmail = process.env.ADMIN_EMAIL

    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    if (session.user?.email !== adminEmail) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
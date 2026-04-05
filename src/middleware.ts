import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

  if (isAdminRoute) {
    const session = req.auth
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    if (session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}

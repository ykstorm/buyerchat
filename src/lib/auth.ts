import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

// Warn (don't throw) if AUTH_SECRET is weak — throwing kills the entire auth system
// Auth.js v5 uses AUTH_SECRET; older versions use NEXTAUTH_SECRET
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
  console.error('WARNING: AUTH_SECRET is weak or missing in production — auth may fail')
  // Don't throw — NextAuth will use whatever secret is available
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: { name: user.name, image: user.image },
            create: { email: user.email, name: user.name, image: user.image },
          })
        } catch (err) {
          console.error('User upsert error:', err)
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true }
        })
        if (dbUser) token.dbId = dbUser.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.dbId as string) ?? token.sub ?? ''
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})
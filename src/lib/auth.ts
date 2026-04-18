import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

// Fail fast if AUTH_SECRET is missing or too short in production
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters in production')
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
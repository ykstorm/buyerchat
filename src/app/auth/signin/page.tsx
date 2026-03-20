'use client'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Sign in to BuyerChat</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        style={{ marginTop: '20px', padding: '12px 24px', cursor: 'pointer' }}
      >
        Sign in with Google
      </button>
    </div>
  )
}
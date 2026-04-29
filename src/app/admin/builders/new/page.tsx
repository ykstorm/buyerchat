import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BuilderWizard from './builder-wizard'

export const dynamic = 'force-dynamic'

export default async function NewBuilderPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email || email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    redirect('/admin')
  }
  return <BuilderWizard adminEmail={email} />
}

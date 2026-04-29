import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BulkUploadForm from './bulk-upload-form'

export const dynamic = 'force-dynamic'

export default async function BulkUploadPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email || email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    redirect('/admin')
  }
  return <BulkUploadForm adminEmail={email} />
}

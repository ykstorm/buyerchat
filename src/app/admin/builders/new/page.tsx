import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BuilderForm from './BuilderForm'

export default async function NewBuilderPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/')

  return (
    <div className="min-h-screen bg-[#EFEFED] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <a href="/admin/builders" className="inline-flex items-center gap-1.5 text-[12px] text-[#52525B] hover:text-[#1B3A6B] mb-6 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Builders
        </a>
        <h1 className="text-[18px] font-semibold text-[#1B3A6B] mb-6">Add New Builder</h1>
        <BuilderForm />
      </div>
    </div>
  )
}

import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ChatClient from './chat-client'

export default async function ChatPage() {
  const session = await auth()
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: {
      id: true, projectName: true, builderName: true,
      pricePerSqft: true, minPrice: true, maxPrice: true,
      possessionDate: true, constructionStatus: true, microMarket: true
    }
  })
  return (
    <>
      <style>{`body { background: #FAFAF8 !important; }`}</style>
      <div className="fixed inset-0 z-50 bg-[#FAFAF8]">
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
            <div className="w-5 h-5 border-2 border-[#E7E5E4] border-t-[#1C1917] rounded-full animate-spin" />
          </div>
        }>
          <ChatClient projects={projects} userId={session?.user?.id ?? null} userName={session?.user?.name ?? null} userImage={session?.user?.image ?? null} />
        </Suspense>
      </div>
    </>
  )
}

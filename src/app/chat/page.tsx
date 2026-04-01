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
        <ChatClient projects={projects} userId={session?.user?.id ?? null} />
      </div>
    </>
  )
}

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
  return <ChatClient projects={projects} userId={session?.user?.id ?? null} />
}

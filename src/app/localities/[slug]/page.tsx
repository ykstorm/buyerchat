import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// /projects/page.tsx defines ProjectCard inline as a 'use client' component
// — not currently exportable. Until ProjectCard is hoisted to its own file
// the locality cards use a simpler server-rendered Link card. The honest
// concern + decision tag are surfaced so brand voice still comes through.
//
// Locality SEO pages: only ship slugs where the DB has ≥3 verified
// projects. Below that bar, the page produces thin/soft-404 content.
// Snapshot 2026-04-28: Shela 14 ✓, South Bopal 1 (deferred), Bopal 0
// (deferred), Daskroi 1 (deferred — also not in brand territory claim).
// To add a slug: ensure microMarket value matches DB exactly (case +
// spacing) and update sitemap.ts localitySlugs in the same commit.
const SLUGS = {
  'shela': { name: 'Shela', microMarket: 'Shela' },
} as const

export function generateStaticParams() {
  return Object.keys(SLUGS).map(slug => ({ slug }))
}

// Reject unknown slugs at the routing layer — without this, a dev request
// for /localities/anything renders the not-found UI but returns HTTP 200,
// which would let crawlers index a soft-404.
export const dynamicParams = false

export default async function LocalityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = SLUGS[slug as keyof typeof SLUGS]
  if (!meta) notFound()

  const projects = await prisma.project.findMany({
    where: { microMarket: meta.microMarket, isActive: true },
    orderBy: { builder: { totalTrustScore: 'desc' } },
    select: {
      id: true, projectName: true, builderName: true,
      microMarket: true, minPrice: true, decisionTag: true,
      honestConcern: true, unitTypes: true,
    },
  })

  return (
    <main className="container mx-auto px-6 py-16 max-w-6xl">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#C49B50] mb-4">
          Verified by Homesty AI
        </p>
        <h1
          className="text-4xl md:text-5xl leading-tight"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
        >
          3BHK & 4BHK Apartments in {meta.name}, Ahmedabad — RERA-verified
        </h1>
        <p className="mt-4 text-lg text-[var(--text-secondary)]">
          {projects.length} verified projects · Builder Trust Scores · Honest concerns disclosed
        </p>
      </header>

      {/* TODO: Mama to fill 2-3 paragraph "About {meta.name}" copy here.
          Pull from LocationData if it has copy for this microMarket;
          otherwise leave placeholder marker. */}
      <section className="mb-12 max-w-3xl text-[var(--text-secondary)] leading-relaxed">
        <p>
          {meta.name} is one of the verified micro-markets Homesty AI covers in
          west Ahmedabad. {/* placeholder — Mama to expand */}
        </p>
      </section>

      <section className="grid gap-4">
        {projects.map(p => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block rounded-xl border border-[var(--border)] p-6 hover:border-[#C49B50]/40 transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h3
                className="text-xl"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
              >
                {p.projectName}
              </h3>
              {p.decisionTag && (
                <span className="text-[10px] uppercase tracking-wider text-[#C49B50]">
                  {p.decisionTag}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {p.builderName} · {p.unitTypes.join(', ')}
            </p>
            {p.honestConcern && (
              <p className="text-sm italic text-[var(--text-secondary)] mt-3 border-l-2 border-[#C49B50]/30 pl-3">
                {p.honestConcern}
              </p>
            )}
          </Link>
        ))}
      </section>

      <div className="mt-16 text-center">
        <Link
          href={`/chat?prefill=${encodeURIComponent(`Show me 3BHK options in ${meta.name}`)}`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#C49B50] text-[#1C1917] rounded-md font-medium hover:bg-[#B68A45] transition-colors"
        >
          Begin your HomeSearch →
        </Link>
      </div>
    </main>
  )
}

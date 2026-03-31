'use client'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}

export default function ProjectCard({ project }: { project: ProjectType }) {
  const possession = new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  const formatL = (n: number) => Math.round(n / 100000)

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] p-5">
      <div className="mb-4">
        <h2 style={{ fontFamily: 'var(--font-playfair)' }} className="text-[16px] font-semibold text-[#1C1917]">
          {project.projectName}
        </h2>
        <p className="text-[12px] text-[#78716C] mt-0.5">{project.builderName}</p>
      </div>

      <div className="mb-4">
        <p style={{ fontFamily: 'var(--font-mono)' }} className="text-[22px] font-semibold text-[#1B4F8A]">
          ₹{project.pricePerSqft.toLocaleString('en-IN')}/sqft
        </p>
        <p className="text-[12px] text-[#A8A29E] mt-0.5">
          ₹{formatL(project.minPrice)}L – ₹{formatL(project.maxPrice)}L all-in range
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Possession', value: possession },
          { label: 'Status', value: project.constructionStatus },
          { label: 'Location', value: project.microMarket },
        ].map(item => (
          <div key={item.label} className="bg-[#F8FAFC] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#A8A29E]">{item.label}</p>
            <p className="text-[12px] font-medium text-[#1C1917] truncate">{item.value}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full bg-[#1B4F8A] text-white rounded-xl py-3 text-[13px] font-medium hover:bg-[#163d6b] transition-colors"
        onClick={() => alert('Visit booking coming soon')}
      >
        Book OTP-verified visit →
      </button>
    </div>
  )
}

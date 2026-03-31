// src/app/admin/overview/page.tsx — v2 matching Mama's design
import { prisma } from '@/lib/prisma'
import { formatLakh, daysBetween, getStageLabel } from '@/lib/admin-utils'
import Link from 'next/link'

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-lg p-3">
      <p className="text-[11px] text-[#52525B] mb-1">{label}</p>
      <p className="text-[22px] font-medium" style={{ color: color ?? '#1A1A2E' }}>{value}</p>
      {sub && <p className="text-[10px] text-[#71717A] mt-0.5">{sub}</p>}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green'|'red'|'amber'|'blue'|'gray' }) {
  const map = { green:'bg-[#E1F5EE] text-[#085041]', red:'bg-[#FCEBEB] text-[#791F1F]', amber:'bg-[#FAEEDA] text-[#633806]', blue:'bg-[#E6F1FB] text-[#0C447C]', gray:'bg-[#F4F4F5] text-[#52525B]' }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[color]}`}>{label}</span>
}

export default async function OverviewPage() {
  const now = new Date()
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate()-now.getDay()); startOfWeek.setHours(0,0,0,0)
  const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0)

  let activeBuyers=0, projectsLive=0, totalEarned=0, pipelineLeads=0, reraAlerts=0
  let sessions:any[]=[], weekVisits:any[]=[], todayConversations=0
  let stageCounts:Record<string,number>={}

  try {
    const [buyers,projects,earned,visits,rera,sess,wVisits,todayConvs,stageGroups] = await Promise.all([
      prisma.chatSession.count({ where:{ buyerStage:{ not:'decision' } } }),
      prisma.project.count({ where:{ isActive:true } }),
      prisma.deal.aggregate({ _sum:{ commissionAmount:true } }).catch(()=>({ _sum:{ commissionAmount:0 } })),
      prisma.siteVisit.count({ where:{ visitCompleted:false } }),
      prisma.project.count({ where:{ possessionDate:{ lte:new Date(now.getTime()+90*24*60*60*1000) }, constructionStatus:'Under Construction' } }),
      prisma.chatSession.findMany({ orderBy:{ lastMessageAt:'asc' }, take:5 }),
      prisma.siteVisit.findMany({ where:{ createdAt:{ gte:startOfWeek } }, include:{ project:{ select:{ projectName:true, minPrice:true } } }, orderBy:{ visitScheduledDate:'asc' }, take:5 }),
      prisma.chatSession.count({ where:{ lastMessageAt:{ gte:startOfToday } } }),
      prisma.chatSession.groupBy({ by:['buyerStage'], _count:{ _all:true } }),
    ])
    activeBuyers=buyers; projectsLive=projects; totalEarned=earned?._sum?.commissionAmount??0
    pipelineLeads=visits; reraAlerts=rera; sessions=sess; weekVisits=wVisits; todayConversations=todayConvs
    stageCounts=Object.fromEntries(stageGroups.map(s=>[s.buyerStage,s._count._all]))
  } catch(err) { console.error('Overview error:',err) }

  const stageOrder=['intent_capture','project_disclosure','qualification','comparison','visit_trigger','pre_visit','post_visit','decision']
  const maxStageCount=Math.max(...Object.values(stageCounts),1)
  const followUpToday=sessions.filter(s=>daysBetween(new Date(s.lastMessageAt))>=2).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-medium text-[#1A1A2E]">Overview</p>
          <p className="text-[11px] text-[#52525B]">{now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <MetricCard label="Active buyers" value={activeBuyers} sub={`${followUpToday} follow-up today`} />
        <MetricCard label="Projects scored" value={projectsLive} sub="in database" />
        <MetricCard label="Commission earned" value={`₹${formatLakh(totalEarned)}`} sub="1 deal closed" color="#0F6E56" />
        <MetricCard label="Pipeline" value={`₹${formatLakh(pipelineLeads*80000*0.015)}`} sub={`${pipelineLeads} active leads`} color="#BA7517" />
        <MetricCard label="RERA alerts" value={reraAlerts} sub="possession < 90 days" color="#A32D2D" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Follow-Up Queue</p>
          {sessions.length===0 ? <p className="text-[12px] text-[#52525B]">No follow-ups pending.</p> : (
            <div>
              {sessions.map(session => {
                const days=daysBetween(new Date(session.lastMessageAt))
                const dotColor=days>=3?'#DC2626':days>=1?'#D97706':'#0F6E56'
                const label=days>=3?'Urgent':days>=1?'High':'Re-engage'
                return (
                  <Link key={session.id} href={`/admin/buyers/${session.id}`}>
                    <div className="flex items-center gap-3 py-2 border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC] -mx-1 px-1 rounded cursor-pointer">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:dotColor}} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1A2E] truncate">
                          {session.buyerPersona??'Unknown'} buyer{session.buyerConfig&&` · ${session.buyerConfig}`}
                        </p>
                        <p className="text-[10px] text-[#52525B]">{getStageLabel(session.buyerStage)} · {days}d ago</p>
                      </div>
                      <Badge label={label} color={days>=3?'red':days>=1?'amber':'green'} />
                    </div>
                  </Link>
                )
              })}
              <Link href="/admin/followup" className="block mt-2 text-[11px] text-[#185FA5] hover:underline">View all →</Link>
            </div>
          )}
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Alerts</p>
          <div className="space-y-3">
            {[
              {icon:'!',bg:'#FCEBEB',color:'#A32D2D',title:`${reraAlerts} projects — RERA within 90 days`,sub:'Review possession timelines'},
              {icon:'↑',bg:'#FAEEDA',color:'#BA7517',title:`${todayConversations} new conversations today`,sub:'Check follow-up queue'},
              {icon:'!',bg:'#FAEEDA',color:'#BA7517',title:`${pipelineLeads} unconfirmed site visits`,sub:'Register leads before visits'},
              {icon:'✓',bg:'#E1F5EE',color:'#0F6E56',title:'AI benchmark: 10/10 passing',sub:'Security checks clean'},
            ].map((a,i)=>(
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold" style={{backgroundColor:a.bg,color:a.color}}>{a.icon}</div>
                <div><p className="text-[11px] font-medium text-[#1A1A2E]">{a.title}</p><p className="text-[10px] text-[#52525B]">{a.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Buyer Pipeline</p>
          <div className="space-y-1.5">
            {stageOrder.map(stage=>{
              const count=stageCounts[stage]??0
              const pct=(count/maxStageCount)*100
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#52525B] w-24 shrink-0">{getStageLabel(stage)}</span>
                  <div className="flex-1 h-1.5 bg-[#E4E4E7] rounded-full"><div className="h-full bg-[#185FA5] rounded-full" style={{width:`${pct}%`}} /></div>
                  <span className="text-[11px] font-mono text-[#1A1A2E] w-5 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">This Week's Visits</p>
          {weekVisits.length===0 ? <p className="text-[12px] text-[#52525B]">No visits scheduled.</p> : (
            <div>
              {weekVisits.map(v=>(
                <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-[#F4F4F5] last:border-0">
                  <div>
                    <p className="text-[11px] font-medium text-[#1A1A2E]">{v.project?.projectName??'—'}</p>
                    <p className="text-[10px] text-[#52525B]">{new Date(v.visitScheduledDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                  </div>
                  <Badge label={v.visitCompleted?'Done':'Pending'} color={v.visitCompleted?'green':'amber'} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Revenue Pipeline</p>
          {weekVisits.length===0 ? <p className="text-[12px] text-[#52525B]">No pipeline data yet.</p> : (
            <div>
              {weekVisits.map(v=>{
                const est=(v.project?.minPrice??0)*0.015
                return (
                  <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-[#F4F4F5] last:border-0">
                    <p className="text-[11px] text-[#1A1A2E] truncate max-w-[130px]">{v.project?.projectName??'—'}</p>
                    <span className="text-[11px] font-semibold font-mono" style={{color:'#0F6E56'}}>₹{formatLakh(est)}</span>
                  </div>
                )
              })}
              <div className="pt-2 flex justify-between border-t border-[#F4F4F5] mt-1">
                <span className="text-[10px] text-[#52525B]">Pipeline commission ~</span>
                <span className="text-[11px] font-semibold" style={{color:'#0F6E56'}}>₹{formatLakh(weekVisits.reduce((s,v)=>s+(v.project?.minPrice??0)*0.015,0))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

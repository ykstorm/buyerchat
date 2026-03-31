// src/lib/admin-utils.ts

export function formatLakh(rupees: number | null | undefined): string {
  if (!rupees) return '—'
  if (rupees >= 10000000) return (rupees / 10000000).toFixed(1) + 'Cr'
  if (rupees >= 100000) return Math.round(rupees / 100000) + 'L'
  return rupees.toLocaleString('en-IN')
}

export function daysBetween(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function generateDealNumber(): string {
  const n = Math.floor(Math.random() * 9000) + 1000
  return `AG-INV-${n}`
}

export function getUrgency(lastContact: Date): { label: string; color: 'red' | 'amber' | 'green' } {
  const days = daysBetween(lastContact)
  if (days >= 4) return { label: 'Urgent', color: 'red' }
  if (days >= 2) return { label: 'High', color: 'amber' }
  return { label: 'Re-engage', color: 'green' }
}

export function getGradeColors(grade: string): { bg: string; text: string } {
  switch (grade) {
    case 'A': return { bg: '#E1F5EE', text: '#085041' }
    case 'B': return { bg: '#E6F1FB', text: '#0C447C' }
    case 'C': return { bg: '#FAEEDA', text: '#633806' }
    default:  return { bg: '#FCEBEB', text: '#791F1F' }
  }
}

export function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#0F6E56'
  if (score >= 60) return '#BA7517'
  return '#A32D2D'
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTimeAgo(date: Date | string | null): string {
  if (!date) return '—'
  const days = daysBetween(new Date(date))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function getPersonaLabel(persona: string | null): string {
  if (!persona) return 'Unknown'
  return persona.charAt(0).toUpperCase() + persona.slice(1)
}

export function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    intent_capture: 'Intent',
    project_disclosure: 'Exploring',
    qualification: 'Qualifying',
    comparison: 'Comparing',
    visit_trigger: 'Visit Ready',
    pre_visit: 'Pre-Visit',
    post_visit: 'Post-Visit',
    decision: 'Decision',
  }
  return map[stage] ?? stage
}

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CreatePreview {
  projectName: string
  reraNumber: string
  builderName: string
}
interface CreateResult {
  id: string
  reraNumber: string
}
interface BulkResult {
  creates: Array<CreatePreview | CreateResult>
  duplicates: string[]
  errors: Array<{ row: number; reason: string }>
  auditCount?: number
  committed?: boolean
}

interface Props {
  adminEmail: string
}

const MAX_BYTES = 1_048_576

export default function BulkUploadForm({ adminEmail }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'idle' | 'dry' | 'commit'>('idle')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [topError, setTopError] = useState<string | null>(null)

  const tooLarge = !!file && file.size > MAX_BYTES
  const dryRunClean =
    !!result && !result.committed && result.errors.length === 0 && result.creates.length > 0

  const submit = async (commit: boolean) => {
    if (!file || tooLarge) return
    if (commit && !confirm(`Write ${result?.creates.length ?? 0} new projects to the database? This cannot be undone except by manual rollback.`)) return
    setBusy(commit ? 'commit' : 'dry')
    setTopError(null)
    if (!commit) setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = `/api/admin/projects/bulk-upload${commit ? '?commit=true' : ''}`
      const res = await fetch(url, { method: 'POST', body: fd })
      const json = (await res.json().catch(() => ({}))) as Partial<BulkResult> & { error?: string }
      if (!res.ok) {
        setTopError(json.error ?? `HTTP ${res.status}`)
        if (json.errors || json.creates || json.duplicates) {
          setResult({
            creates: json.creates ?? [],
            duplicates: json.duplicates ?? [],
            errors: json.errors ?? [],
            committed: false,
          })
        }
        return
      }
      setResult({
        creates: json.creates ?? [],
        duplicates: json.duplicates ?? [],
        errors: json.errors ?? [],
        auditCount: json.auditCount,
        committed: json.committed,
      })
    } catch (e) {
      setTopError(String((e as Error).message))
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-[#1A1A2E]">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-[22px] font-semibold">Bulk upload projects</h1>
        <Link href="/admin/projects" className="text-[12px] text-[#185FA5] hover:underline">
          ← Back to projects
        </Link>
      </div>
      <p className="text-[13px] text-[#52525B] mb-6">
        Upload a CSV in the same shape as <code className="text-[12px] bg-black/[0.04] px-1.5 py-0.5 rounded">import-projects.mjs</code>.
        Dry-run is the default and previews creates / duplicates / row errors. Commit
        writes via auditWrite, one log row per project. Signed in as{' '}
        <span className="font-medium">{adminEmail}</span>.
      </p>

      <div className="border border-black/[0.08] rounded-xl p-5 bg-white">
        <label className="block text-[12px] font-medium text-[#1A1A2E] mb-2">
          CSV file (max 1 MB)
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            setResult(null)
            setTopError(null)
          }}
          className="block w-full text-[13px] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-black/10 file:bg-[#F8FAFC] file:text-[12px] file:text-[#1A1A2E]"
        />
        {tooLarge && (
          <div className="mt-3 text-[12px] text-[#BA7517] bg-[#FEF7E5] border border-[#F0DCAA] rounded-lg px-3 py-2">
            File is {(file!.size / 1024 / 1024).toFixed(2)} MB — over the 1 MB cap. Trim and retry.
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!file || tooLarge || busy !== 'idle'}
            className="px-4 py-2 text-[12px] font-medium bg-[#185FA5] text-white rounded-lg disabled:opacity-50"
          >
            {busy === 'dry' ? 'Running…' : 'Dry run'}
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!dryRunClean || busy !== 'idle'}
            className="px-4 py-2 text-[12px] font-medium border border-[#B91C1C] text-[#B91C1C] bg-[#FEF2F2] rounded-lg disabled:opacity-40"
            title={dryRunClean ? 'Write to DB' : 'Run a clean dry-run first'}
          >
            {busy === 'commit' ? 'Writing…' : 'Commit'}
          </button>
        </div>
      </div>

      {topError && (
        <div className="mt-4 text-[13px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-4 py-3">
          {topError}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-2">
          {result.committed && (
            <div className="text-[13px] text-[#0F4C2E] bg-[#ECFDF3] border border-[#86EFAC] rounded-lg px-4 py-3">
              Committed. Wrote <strong>{result.auditCount ?? 0}</strong> audit log{result.auditCount === 1 ? '' : 's'} for{' '}
              <strong>{result.creates.length}</strong> new project{result.creates.length === 1 ? '' : 's'}.
            </div>
          )}

          <details className="border border-black/[0.08] rounded-lg bg-white" open={result.errors.length > 0}>
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
              {result.committed ? 'Created' : 'Will create'} ({result.creates.length})
            </summary>
            <div className="px-4 pb-3 text-[12px] text-[#52525B]">
              {result.creates.length === 0 ? (
                <p>No new projects.</p>
              ) : (
                <ul className="space-y-1">
                  {result.creates.map((c, i) => (
                    <li key={i} className="font-mono">
                      {'projectName' in c
                        ? `${c.projectName} — ${c.builderName} — ${c.reraNumber}`
                        : `${c.id} — ${c.reraNumber}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <details className="border border-black/[0.08] rounded-lg bg-white">
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
              Already exist ({result.duplicates.length})
            </summary>
            <div className="px-4 pb-3 text-[12px] text-[#52525B]">
              {result.duplicates.length === 0 ? (
                <p>None matched by reraNumber.</p>
              ) : (
                <ul className="space-y-1 font-mono">
                  {result.duplicates.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <details
            className="border border-black/[0.08] rounded-lg bg-white"
            open={result.errors.length > 0}
          >
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
              Errors ({result.errors.length})
            </summary>
            <div className="px-4 pb-3 text-[12px] text-[#B91C1C]">
              {result.errors.length === 0 ? (
                <p className="text-[#52525B]">No row errors.</p>
              ) : (
                <ul className="space-y-1 font-mono">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

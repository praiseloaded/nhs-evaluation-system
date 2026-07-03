'use client'

import { useState }  from 'react'
import Link          from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, Loader2, CheckCircle2, Lock } from 'lucide-react'

interface Props {
  analysis: {
    id:        string
    jobTitle:  string
    createdAt: string
    band:      string | null
    location:  string | null
  }
  result: any
  isPro:  boolean
}

export function SummaryClient({ analysis, result, isPro }: Props) {
  const router = useRouter()
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const jobTitle  = analysis.jobTitle
  const createdAt = new Date(analysis.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const overall = result?.scoredBreakdown?.overall ?? result?.overallScore ?? 0
  const verdict = result?.verdict ?? 'N/A'

  const scoreColor = overall >= 70 ? '#065f46' : overall >= 50 ? '#92400e' : '#991b1b'
  const scoreBg    = overall >= 70 ? '#d1fae5' : overall >= 50 ? '#fef9c3' : '#fee2e2'

  async function handleDownload() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/analysis/${analysis.id}/report`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `OmniJobReady-${jobTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.docx`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Download failed')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 100%)', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '44px 40px', maxWidth: 500, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={30} color="#1e40af" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f2d5e', marginBottom: 6 }}>
            Application Analysis Report
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 0 }}>Analysed {createdAt}</p>
        </div>

        {/* Score preview */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: scoreBg, border: `1.5px solid ${scoreColor}22`, textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: scoreColor, margin: 0, lineHeight: 1 }}>{overall}</p>
            <p style={{ fontSize: 11, color: scoreColor, fontWeight: 600, marginTop: 4 }}>Overall score</p>
          </div>
          <div style={{ flex: 2, padding: '14px 16px', borderRadius: 14, background: '#f8fafc', border: '1.5px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Report includes:</p>
            {[
              '5-dimension score breakdown',
              'Essential criteria assessment',
              'Band Match DNA™ table',
              isPro ? 'Strengths, weaknesses & recommendations' : 'Strengths overview',
              isPro ? 'Rejection risk & evidence gaps' : '— Upgrade for full insights',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: i === 4 && !isPro ? '#9ca3af' : '#059669' }}>{i === 4 && !isPro ? '🔒' : '✓'}</span>
                <span style={{ fontSize: 11.5, color: i === 4 && !isPro ? '#9ca3af' : '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade banner for free users */}
        {!isPro && (
          <div style={{ background: 'linear-gradient(135deg,#4c1d95,#1e40af)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Unlock the full report</p>
              <p style={{ fontSize: 11, color: '#c4b5fd', margin: 0 }}>Recommendations, weaknesses, rejection risk & more</p>
            </div>
            <button onClick={() => router.push('/upgrade')}
              style={{ padding: '8px 14px', background: '#fff', color: '#4c1d95', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              <Lock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Upgrade
            </button>
          </div>
        )}

        {/* Download button */}
        {status === 'idle' && (
          <button onClick={handleDownload}
            style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}>
            <Download size={18} /> Download Report (.docx)
          </button>
        )}

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <Loader2 size={36} color="#1e40af" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Building your Word report…</p>
          </div>
        )}

        {status === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <CheckCircle2 size={40} color="#059669" />
            <p style={{ fontSize: 14, color: '#059669', fontWeight: 700, margin: 0 }}>Downloaded successfully!</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Check your Downloads folder for the .docx file</p>
            <button onClick={handleDownload}
              style={{ marginTop: 4, padding: '10px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Download again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={handleDownload}
              style={{ padding: '10px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Try again
            </button>
          </div>
        )}

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <Link href={`/dashboard/analysis/${analysis.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to analysis
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
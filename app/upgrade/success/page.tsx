'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { CheckCircle2, Zap }   from 'lucide-react'

export default function UpgradeSuccessPage() {
  const router            = useRouter()
  const [count, setCount] = useState(5)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (count <= 0) router.push('/dashboard')
  }, [count, router])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0fdf4', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid #bbf7d0', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={36} color="#15803d" />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          Welcome to Pro!
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
          Your account has been upgraded. You now have access to full analysis reports, EvidenceVault™, the NHS Recruiter Simulator, and unlimited analyses.
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#dbeafe', padding: '6px 16px', borderRadius: 20, marginBottom: 28 }}>
          <Zap size={14} color="#1e40af" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Pro features are now active</span>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '100%', padding: '13px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Go to Dashboard
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Redirecting automatically in {count}s…
        </p>
      </div>
    </div>
  )
}
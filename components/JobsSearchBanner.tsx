// components/JobsSearchBanner.tsx
//
// Drop this into your homepage (app/page.tsx) — a prominent banner
// linking to /jobs. Place it below your hero section.
//
// Usage:
//   import { JobsSearchBanner } from '@/components/JobsSearchBanner'
//   ... inside your homepage JSX:
//   <JobsSearchBanner />

import Link from 'next/link'
import { Search, ArrowRight, Sparkles } from 'lucide-react'

export function JobsSearchBanner() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/jobs"
        className="group block rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent hover:from-primary/10 p-6 sm:p-8 transition-all duration-300 hover:border-primary/30">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                Search Live NHS Jobs
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full hidden sm:inline">NEW</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Browse current NHS vacancies across England, Wales, NI and London — then get an instant AI analysis.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary shrink-0">
            Browse jobs <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </section>
  )
}
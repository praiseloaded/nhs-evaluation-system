// components/feature-gate.tsx
//
// Server component — wrap any dashboard page's content with this.
// If the user's tier doesn't meet the feature's minTier, they see
// a clean upgrade prompt instead of the page content.
//
// Usage in any gated page:
//
//   import { FeatureGate } from '@/components/feature-gate'
//
//   export default async function InterviewSimulatorPage() {
//     return (
//       <FeatureGate featureKey="interview_simulator">
//         {/* existing page content unchanged */}
//       </FeatureGate>
//     )
//   }

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getUserTier } from "@/lib/billing/tier"
import Link from "next/link"
import { Lock, Sparkles, ArrowRight } from "lucide-react"

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }
const TIER_LABEL: Record<string, string> = { pro: "Pro", elite: "Elite" }

const FEATURE_COPY: Record<string, { title: string; description: string }> = {
  interview_simulator:    { title: "Interview Simulator AI", description: "Practice with real NHS panel personas, get scored answers, and build confidence before your actual interview." },
  career_gps:            { title: "Career GPS™", description: "Get a personalised band-by-band promotion roadmap showing exactly what experience and certificates you're missing." },
  interview_probability: { title: "Interview Probability™", description: "See your predicted likelihood of reaching interview stage, broken down by scoring factor." },
  mentorship:            { title: "Mentorship", description: "Get direct access to the team for personalised guidance on your NHS application journey." },
  recruiter_simulator:   { title: "Recruiter Simulator™", description: "Run your statement through a three-panel shortlisting simulation the way NHS recruiters actually score it." },
}

async function checkAccess(featureKey: string, userId: string): Promise<{ allowed: boolean; requiredTier: string }> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
    if (!flag) return { allowed: true, requiredTier: 'free' } // no flag = unrestricted
    if (!flag.enabled) return { allowed: false, requiredTier: flag.minTier }

    const userTier = await getUserTier(userId)
    const userRank = TIER_RANK[userTier] ?? 0
    const requiredRank = TIER_RANK[flag.minTier] ?? 0
    return { allowed: userRank >= requiredRank, requiredTier: flag.minTier }
  } catch {
    return { allowed: true, requiredTier: 'free' } // fail open — never break a page
  }
}

function UpgradePrompt({ featureKey, requiredTier }: { featureKey: string; requiredTier: string }) {
  const copy = FEATURE_COPY[featureKey] ?? { title: "This feature", description: "Upgrade your plan to unlock this feature." }
  const label = TIER_LABEL[requiredTier] ?? requiredTier

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{copy.title}</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">{copy.description}</p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-[13px] font-semibold">
          <Sparkles className="w-4 h-4" />
          Requires {label} plan
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Upgrade to {label}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border text-foreground text-[14px] font-medium hover:bg-accent transition-colors"
          >
            Back to dashboard
          </Link>
        </div>

        <p className="text-[12px] text-muted-foreground">
          Already upgraded?{' '}
          <Link href="/api/auth/session" className="underline hover:text-foreground transition-colors">
            Refresh your session
          </Link>
        </p>
      </div>
    </div>
  )
}

export async function FeatureGate({
  featureKey,
  children,
}: {
  featureKey: string
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) {
    // No session — let the page's own auth handle this, don't double-redirect
    return <>{children}</>
  }

  const { allowed, requiredTier } = await checkAccess(featureKey, session.user.id)

  if (!allowed) {
    return <UpgradePrompt featureKey={featureKey} requiredTier={requiredTier} />
  }

  return <>{children}</>
}
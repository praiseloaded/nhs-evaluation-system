import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export default async function SavedAnalysesPage() {


const session = await auth()
  if (!session?.user?.email) {
    return <div>Please sign in</div>
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return <div>User not found</div>
  }

  const analyses = await prisma.analysis.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Saved Analyses
            </h1>
            <p className="text-muted-foreground">
              Browse and manage all your evaluations
            </p>
          </div>

          <Link
            href="/new-analysis"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-semibold"
          >
            <Plus className="h-5 w-5" />
            New Analysis
          </Link>
        </div>

        {/* Search UI (still UI-only for now) */}
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-5 w-5" />
            <input
              type="text"
              placeholder="Search analyses..."
              className="flex-1 bg-transparent outline-none text-foreground"
            />
          </div>
        </div>


        {/* LIST */}
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/dashboard/analysis/${analysis.id}`}
              className="block rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground">
                    {analysis.jobTitle}
                  </h3>

                  <p className="text-sm text-muted-foreground mt-1">
                    Band: {analysis.skills?.slice?.(0, 1)?.[0] ?? 'N/A'}
                  </p>

                  <div className="flex gap-3 mt-4 text-sm text-muted-foreground">
                    <span>
                      Created {new Date(analysis.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* SCORE (from JSON result) */}
                <div className="text-right">
                  <div className="inline-flex px-4 py-2 rounded-lg font-bold text-lg bg-blue-100 text-blue-900">
                    {analysis.result?.totalScore ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overall Score
                  </p>
                </div>

              </div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  )
}


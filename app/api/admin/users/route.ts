// app/api/admin/users/route.ts
import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const url    = new URL(req.url)
    const search = url.searchParams.get('search')?.trim() ?? ''
    const tier   = url.searchParams.get('tier') ?? ''
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'))
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '25'))

    const where: any = {}
    if (tier)   where.tier = tier
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name:  { contains: search, mode: 'insensitive' } },
    ]

    const select = {
      id: true, name: true, email: true, tier: true, role: true,
      suspended: true, analysisUsed: true, analysisLimit: true,
      createdAt: true,
      _count: { select: { analyses: true, applications: true, interviews: true } },
    }

    const [primary, secondary] = await Promise.all([
      prisma.user.findMany({ where, select, orderBy: { createdAt: 'desc' } }).catch((err) => {
        console.error('[admin/users] primary DB error:', err.message)
        return []
      }),
      prisma2.user.findMany({ where, select, orderBy: { createdAt: 'desc' } }).catch((err) => {
        console.error('[admin/users] secondary DB error:', err.message)
        return []
      }),
    ])

    console.log(`[admin/users] primary: ${primary.length} users, secondary: ${secondary.length} users`)

    const seen   = new Set()
    const merged: any[] = []
    for (const u of [...primary, ...secondary]) {
      if (!seen.has(u.id)) {
        seen.add(u.id)
        merged.push({ ...u, _db: primary.find((p: any) => p.id === u.id) ? 'primary' : 'secondary' })
      }
    }

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const total      = merged.length
    const totalPages = Math.ceil(total / limit)
    const users      = merged.slice((page - 1) * limit, page * limit)

    return Response.json({ success: true, users, total, page, totalPages })
  } catch (err: any) {
    console.error('[admin/users]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})

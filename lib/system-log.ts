// lib/system-log.ts
// Call this from existing routes (analysis, cv export, cos-search, etc.)
// to feed the admin overview's usage and error monitoring.
// Designed to never throw or block the calling route — logging failures
// are swallowed so they can't break the actual feature.

import { prisma } from "@/lib/prisma"

type EventType = 'ai_call' | 'ai_error' | 'api_error' | 'scrape_failure' | 'payment_event'
type Provider = 'gemini' | 'groq' | 'stripe' | 'nhs_jobs' | 'ukvi_register'

export async function logSystemEvent(params: {
  type: EventType
  provider?: Provider
  userId?: string
  endpoint?: string
  statusCode?: number
  durationMs?: number
  errorMessage?: string
  metadata?: Record<string, any>
}) {
  try {
    await prisma.systemEvent.create({
      data: {
        type: params.type,
        provider: params.provider,
        userId: params.userId,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage?.slice(0, 2000),
        metadata: params.metadata ?? undefined,
      },
    })
  } catch (err) {
    // Never let logging break the actual feature
    console.error("SYSTEM_LOG_WRITE_FAILED:", err)
  }
}

/**
 * Convenience wrapper for timing an AI call and logging success/failure
 * in one place. Drop this around existing Gemini/Groq calls:
 *
 *   const result = await withSystemLog(
 *     { type: 'ai_call', provider: 'gemini', userId, endpoint: '/api/analysis' },
 *     () => callGemini(prompt)
 *   )
 */
export async function withSystemLog<T>(
  meta: { type: EventType; provider?: Provider; userId?: string; endpoint?: string; metadata?: Record<string, any> },
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    await logSystemEvent({ ...meta, durationMs: Date.now() - start, statusCode: 200 })
    return result
  } catch (err: any) {
    await logSystemEvent({
      ...meta,
      type: meta.type === 'ai_call' ? 'ai_error' : meta.type,
      durationMs: Date.now() - start,
      statusCode: err?.status ?? 500,
      errorMessage: err?.message ?? String(err),
    })
    throw err
  }
}
// lib/notifications.ts
// Call createNotification() from anywhere a user-facing event happens.
// Uses getDb() for dual-shard support — notifications are written to
// whichever shard the user lives on.

import { getDb } from '@/lib/db-router'
import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'mentorship_reply'
  | 'mentorship_thread_closed'
  | 'account_tier_changed'
  | 'account_suspended'
  | 'account_unsuspended'
  | 'analysis_complete'
  | 'job_ready_complete'
  | 'star_saved'
  | 'radar_matches'
  | 'cpd_milestone'
  | 'skills_milestone'
  | 'ats_complete'
  | 'upgrade_welcome'

export async function createNotification(params: {
  userId:  string
  type:    NotificationType
  title:   string
  body?:   string
  linkUrl?: string
}) {
  try {
    // Route to correct shard
    const db = await getDb(params.userId)

    // Check mute preference (silently skip if muted)
    const pref = await db.notificationPreference.findUnique({
      where: { userId_type: { userId: params.userId, type: params.type } },
    }).catch(() => null)
    if (pref?.muted) return null

    return await db.notification.create({
      data: {
        userId:  params.userId,
        type:    params.type,
        title:   params.title,
        body:    params.body   ?? null,
        linkUrl: params.linkUrl ?? null,
      },
    })
  } catch (err) {
    // Never let notification failures break the action that triggered them
    console.error('CREATE_NOTIFICATION_FAILED:', err)
    return null
  }
}
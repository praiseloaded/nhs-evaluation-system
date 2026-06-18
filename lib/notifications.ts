// lib/notifications.ts
//
// Call createNotification() from anywhere a user-facing event happens
// (mentorship reply, admin tier change, account suspended, etc). It
// checks the recipient's mute preference for that type first, so muted
// types never even get written — keeps the table from filling with
// notifications nobody will see and avoids needing to filter on every read.

import { prisma } from "@/lib/prisma"

export type NotificationType =
  | 'mentorship_reply'
  | 'mentorship_thread_closed'
  | 'account_tier_changed'
  | 'account_suspended'
  | 'account_unsuspended'

export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  linkUrl?: string
}) {
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: params.userId, type: params.type } },
    })
    if (pref?.muted) return null // respect mute, silently skip

    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl,
      },
    })
  } catch (err) {
    // Notifications should never break the action that triggered them
    console.error("CREATE_NOTIFICATION_FAILED:", err)
    return null
  }
}
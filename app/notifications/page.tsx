"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import NotificationIcon from "@/components/notifications/notification-icon"
import { useApp } from "@/app/app-provider"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "@/lib/actions"
import { timeAgo } from "@/lib/date-utils"

export default function NotificationsPage() {
  const { username } = useApp()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const unread = notifications.filter((n) => !n.is_read).length

  const load = useCallback(async () => {
    if (!username) return
    const res = await getUserNotifications(username)
    if (res.success) setNotifications(res.notifications)
    setLoading(false)
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const markAsRead = (id: string) => {
    if (!username) return
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    markNotificationAsRead(id, username)
  }

  const markAllAsRead = () => {
    if (!username) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    markAllNotificationsAsRead(username)
  }

  return (
    <div className="bg-toro-background min-h-full">
      <header className="sticky top-0 z-10 bg-toro-background/90 backdrop-blur-sm border-b border-black/5">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" aria-label="Volver">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-display text-toro-foreground">Notificaciones</h1>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-toro-primary text-xs gap-1">
              <CheckCheck className="w-4 h-4" />
              Marcar todas
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Bell className="animate-pulse w-7 h-7 text-toro-primary/40" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Bell className="w-10 h-10 text-toro-foreground/20 mx-auto mb-3" />
            <h3 className="font-bold text-toro-foreground mb-1">No tenés notificaciones</h3>
            <p className="text-sm text-toro-foreground/60">Acá vas a ver tus etiquetas, rankings, reportes y más.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Link
              key={n.id}
              href={`/groups/${n.group_id}`}
              onClick={() => markAsRead(n.id)}
              className="block active:scale-[0.99] transition"
            >
              <div
                className={`w-full flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  n.is_read ? "bg-white border-black/5" : "bg-toro-primary/5 border-toro-primary/20"
                }`}
              >
                <NotificationIcon type={n.notification_type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold text-sm leading-tight ${
                        n.is_read ? "text-toro-foreground/80" : "text-toro-foreground"
                      }`}
                    >
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-toro-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-toro-foreground/60 mt-0.5">{n.message}</p>
                  <p className="text-xs text-toro-foreground/40 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

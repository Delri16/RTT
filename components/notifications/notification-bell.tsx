"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/app/app-provider"
import { getUnreadNotificationsCount } from "@/lib/actions"

/** Campanita de notificaciones para el header, con badge de no leídas. */
export default function NotificationBell() {
  const { username } = useApp()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!username) return
    let alive = true

    const load = () => {
      getUnreadNotificationsCount(username).then((res) => {
        if (alive && res.success) setUnread(res.count)
      })
    }

    load()
    const interval = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [username])

  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-toro-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
    </Link>
  )
}

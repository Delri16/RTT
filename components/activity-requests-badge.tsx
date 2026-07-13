"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { getPendingRequestsCount } from "@/lib/actions"
import { useApp } from "@/app/app-provider"

interface ActivityRequestsBadgeProps {
  groupId: string
}

export default function ActivityRequestsBadge({ groupId }: ActivityRequestsBadgeProps) {
  const { username } = useApp()
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username && groupId) {
      loadCount()

      // Refresh count every 30 seconds
      const interval = setInterval(loadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [groupId, username])

  const loadCount = async () => {
    if (!username) return

    try {
      const result = await getPendingRequestsCount(username, groupId)
      if (result.success) {
        setCount(result.count || 0)
      }
    } catch (error) {
      console.error("Error loading requests count:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || count === 0) {
    return null
  }

  return (
    <div className="relative inline-block">
      <Bell className="w-5 h-5" />
      <Badge
        variant="destructive"
        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
      >
        {count}
      </Badge>
    </div>
  )
}

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { getPendingActivityTags } from "@/lib/actions"
import Link from "next/link"

export function ActivityTagsBadge({ username }: { username: string }) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const errorCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const loadCount = useCallback(async () => {
    if (errorCountRef.current >= 5 || !isMountedRef.current) {
      console.log("[v0] Stopped activity tag polling (errors or unmounted)")
      return
    }

    try {
      const result = await getPendingActivityTags(username)

      if (!isMountedRef.current) return

      if (result.success) {
        setCount(result.tags?.length || 0)
        errorCountRef.current = 0
      } else {
        errorCountRef.current += 1
        console.log(`[v0] Activity tag fetch failed (${errorCountRef.current}/5)`)
      }
    } catch (error) {
      console.error("[v0] Error loading activity tags count:", error)
      errorCountRef.current += 1
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [username])

  useEffect(() => {
    if (!username) return

    isMountedRef.current = true

    loadCount()

    intervalRef.current = setInterval(() => {
      if (errorCountRef.current < 5) {
        loadCount()
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 180000) // 3 minutes

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [username, loadCount])

  if (loading || count === 0) {
    return null
  }

  return (
    <Link href="/activity-tags" className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="relative inline-flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 rounded-full w-12 h-12 cursor-pointer">
        <Bell className="w-5 h-5 text-blue-600" />
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {count}
        </Badge>
      </div>
    </Link>
  )
}

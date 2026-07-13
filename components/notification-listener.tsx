"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/app/app-provider"
import { getPendingActivityTags } from "@/lib/actions"

/**
 * Component that listens for new activity tag notifications and shows browser notifications
 * Should be included once in the app layout
 */
export function NotificationListener() {
  const { username } = useApp()
  const lastCheckRef = useRef<Date>(new Date())
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!username) return

    // Function to check for new notifications
    const checkForNewNotifications = async () => {
      try {
        // Only check if notifications are enabled and permission is granted
        if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
          return
        }

        const result = await getPendingActivityTags(username)

        if (!result.success || !result.tags || result.tags.length === 0) {
          return
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready

        // Show notification for each new tag
        for (const tag of result.tags) {
          const notification = tag.notification

          if (!notification || notification.is_read) continue

          // Check if this notification was created after our last check
          const notificationDate = new Date(notification.created_at)
          if (notificationDate <= lastCheckRef.current) continue

          console.log("[v0] Showing notification for activity tag:", tag)

          // Show the notification using service worker
          await registration.showNotification("🐂 Road To Toro", {
            body: notification.message || `${tag.tagged_by} te etiquetó en una actividad`,
            icon: "/logo.png",
            badge: "/logo.png",
            tag: `activity-tag-${tag.id}`,
            requireInteraction: true,
            data: {
              type: "activity_tag",
              tagId: tag.id,
              activityName: tag.activity?.name || "actividad",
              taggedBy: tag.tagged_by,
              groupName: tag.group?.name || "",
            },
            actions: [
              {
                action: "accept",
                title: "✅ Aceptar",
              },
              {
                action: "view",
                title: "👁️ Ver detalles",
              },
            ],
          })
        }

        // Update last check time
        lastCheckRef.current = new Date()
      } catch (error) {
        console.error("[v0] Error checking for notifications:", error)
      }
    }

    // Check immediately on mount
    checkForNewNotifications()

    // Then check every 30 seconds
    checkIntervalRef.current = setInterval(checkForNewNotifications, 30000)

    // Cleanup on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [username])

  // This component doesn't render anything
  return null
}

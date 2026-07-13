"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already been prompted or has notifications enabled
    const hasBeenPrompted = localStorage.getItem("notification_prompt_shown") === "true"
    const notificationsEnabled = localStorage.getItem("notifications_enabled") === "true"

    // Show prompt if:
    // 1. Notifications are supported
    // 2. User hasn't been prompted before
    // 3. Notifications aren't already enabled
    // 4. Permission is default (not granted or denied)
    if (
      "Notification" in window &&
      !hasBeenPrompted &&
      !notificationsEnabled &&
      Notification.permission === "default"
    ) {
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }
  }, [])

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()

      if (permission === "granted") {
        localStorage.setItem("notifications_enabled", "true")

        // Show welcome notification using Service Worker
        try {
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification("¡Bienvenido, Toro! 🐂", {
            body: "Te recordaremos entrenar todos los días a las 19:00hs",
            icon: "/logo.png",
            badge: "/logo.png",
            tag: "welcome-notification",
          })
        } catch (error) {
          console.error("Error showing welcome notification:", error)
          // Fallback to regular notification
          new Notification("¡Bienvenido, Toro! 🐂", {
            body: "Te recordaremos entrenar todos los días a las 19:00hs",
            icon: "/logo.png",
            tag: "welcome-notification",
          })
        }
      }

      localStorage.setItem("notification_prompt_shown", "true")
      setShowPrompt(false)
    } catch (error) {
      console.error("Error enabling notifications:", error)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem("notification_prompt_shown", "true")
    setShowPrompt(false)
    setDismissed(true)
  }

  if (!showPrompt || dismissed) {
    return null
  }

  return (
    <Card className="bg-gradient-to-r from-toro-primary/10 to-toro-accent/10 border-toro-primary/20 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Bell className="w-6 h-6 text-toro-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-toro-foreground mb-1">¡Mantente motivado! 🔥</h3>
              <p className="text-sm text-toro-foreground/80 mb-3">
                Recibe recordatorios diarios a las 19:00hs para entrenar y ver quién está ganando en tu grupo
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnable}
                  className="bg-toro-primary hover:bg-toro-primary/90 text-white"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Activar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Más tarde
                </Button>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

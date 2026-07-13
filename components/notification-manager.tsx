"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, BellOff, Clock, Trophy } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserGroups, getGroupRankingTotal } from "@/lib/actions"

export default function NotificationManager() {
  const { username } = useApp()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [loading, setLoading] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check current notification permission
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }

    // Check if notifications are enabled in localStorage
    const enabled = localStorage.getItem("notifications_enabled") === "true"
    setNotificationsEnabled(enabled)

    // Register service worker
    registerServiceWorker()

    // Set up daily notifications if enabled
    if (enabled && Notification.permission === "granted") {
      scheduleDailyNotifications()
    }
  }, [])

  const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        console.log("Service Worker registered:", registration)
        setSwRegistration(registration)
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    }
  }

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador no soporta notificaciones")
      return false
    }

    setLoading(true)

    try {
      console.log("[v0] Requesting notification permission...")
      const permission = await Notification.requestPermission()
      console.log("[v0] Permission result:", permission)
      setPermission(permission)

      if (permission === "granted") {
        console.log("[v0] Permission granted!")
        return true
      } else {
        console.log("[v0] Permission denied or dismissed")
        alert("Necesitas permitir las notificaciones para recibir recordatorios diarios")
        return false
      }
    } catch (error) {
      console.error("[v0] Error requesting notification permission:", error)
      alert("Error al solicitar permisos de notificación")
      return false
    } finally {
      setLoading(false)
    }
  }

  const toggleNotifications = async (enabled: boolean) => {
    console.log("[v0] Toggle notifications:", enabled)

    if (enabled) {
      // Request permission if not granted
      if (permission !== "granted") {
        console.log("[v0] Permission not granted, requesting...")
        const granted = await requestNotificationPermission()
        if (!granted) {
          console.log("[v0] Permission request failed")
          return
        }
      }

      // Enable notifications
      console.log("[v0] Enabling notifications...")
      setNotificationsEnabled(true)
      localStorage.setItem("notifications_enabled", "true")
      scheduleDailyNotifications()

      // Show test notification
      showTestNotification()
    } else {
      // Disable notifications
      console.log("[v0] Disabling notifications...")
      setNotificationsEnabled(false)
      localStorage.setItem("notifications_enabled", "false")
      clearDailyNotifications()
    }
  }

  const showTestNotification = async () => {
    console.log("[v0] Showing test notification...")
    console.log("[v0] Permission:", Notification.permission)
    console.log("[v0] SW Registration:", !!swRegistration)

    if (Notification.permission === "granted") {
      try {
        if (swRegistration) {
          console.log("[v0] Using service worker notification...")
          await swRegistration.showNotification("¡Road To Toro activado! 🐂", {
            body: "Recibirás recordatorios diarios a las 19:00hs para entrenar",
            icon: "/logo.png",
            badge: "/logo.png",
            tag: "test-notification",
            requireInteraction: false,
            actions: [
              {
                action: "train",
                title: "💪 ¡Vamos!",
              },
            ],
          })
          console.log("[v0] Service worker notification sent!")
        } else {
          console.log("[v0] Using fallback notification...")
          new Notification("¡Road To Toro activado! 🐂", {
            body: "Recibirás recordatorios diarios a las 19:00hs para entrenar",
            icon: "/logo.png",
            tag: "test-notification",
          })
          console.log("[v0] Fallback notification sent!")
        }
      } catch (error) {
        console.error("[v0] Error showing notification:", error)
        try {
          console.log("[v0] Trying fallback after error...")
          new Notification("¡Road To Toro activado! 🐂", {
            body: "Recibirás recordatorios diarios a las 19:00hs para entrenar",
            icon: "/logo.png",
            tag: "test-notification",
          })
          console.log("[v0] Fallback notification sent!")
        } catch (fallbackError) {
          console.error("[v0] Fallback notification also failed:", fallbackError)
          alert("Error al mostrar notificación de prueba")
        }
      }
    } else {
      console.log("[v0] Permission not granted, cannot show notification")
    }
  }

  const scheduleDailyNotifications = () => {
    // Clear any existing intervals
    clearDailyNotifications()

    // Calculate time until next 19:00
    const now = new Date()
    const target = new Date()
    target.setHours(19, 0, 0, 0)

    // If it's already past 19:00 today, schedule for tomorrow
    if (now > target) {
      target.setDate(target.getDate() + 1)
    }

    const timeUntilNext = target.getTime() - now.getTime()

    // Set timeout for the first notification
    const timeoutId = setTimeout(() => {
      sendDailyNotification()

      // Then set interval for daily notifications (24 hours)
      const intervalId = setInterval(sendDailyNotification, 24 * 60 * 60 * 1000)
      localStorage.setItem("notification_interval", intervalId.toString())
    }, timeUntilNext)

    localStorage.setItem("notification_timeout", timeoutId.toString())

    checkPendingReports()
    const reportCheckInterval = setInterval(checkPendingReports, 6 * 60 * 60 * 1000) // Every 6 hours
    localStorage.setItem("report_check_interval", reportCheckInterval.toString())
  }

  const clearDailyNotifications = () => {
    // Clear timeout
    const timeoutId = localStorage.getItem("notification_timeout")
    if (timeoutId) {
      clearTimeout(Number.parseInt(timeoutId))
      localStorage.removeItem("notification_timeout")
    }

    // Clear interval
    const intervalId = localStorage.getItem("notification_interval")
    if (intervalId) {
      clearInterval(Number.parseInt(intervalId))
      localStorage.removeItem("notification_interval")
    }

    const reportCheckInterval = localStorage.getItem("report_check_interval")
    if (reportCheckInterval) {
      clearInterval(Number.parseInt(reportCheckInterval))
      localStorage.removeItem("report_check_interval")
    }
  }

  const sendDailyNotification = async () => {
    if (!username || Notification.permission !== "granted" || !swRegistration) return

    try {
      // Get user's first group
      const groupsResult = await getUserGroups(username)
      if (!groupsResult.success || groupsResult.groups.length === 0) {
        // No groups, send generic notification
        await swRegistration.showNotification("¡Es hora de entrenar, Toro! 🐂", {
          body: "Las 19:00hs son perfectas para una sesión de entrenamiento. ¡Dale que se puede!",
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "daily-motivation",
          requireInteraction: true,
          actions: [
            {
              action: "train",
              title: "💪 ¡Vamos a entrenar!",
            },
            {
              action: "later",
              title: "⏰ Más tarde",
            },
          ],
        })
        return
      }

      // Get ranking from first group
      const firstGroup = groupsResult.groups[0]
      const ranking = await getGroupRankingTotal(firstGroup.group_id)

      let notificationBody = "¡Es hora de entrenar para ser un verdadero Toro! 💪"

      if (ranking.length > 0) {
        const leader = ranking[0]
        const userPosition = ranking.findIndex((user) => user.username === username)

        if (leader.username === username) {
          notificationBody = `¡Estás liderando en "${firstGroup.groups.name}"! Mantén el ritmo, campeón 🏆`
        } else {
          const position = userPosition >= 0 ? userPosition + 1 : "último lugar"
          notificationBody = `${leader.username} está ganando en "${firstGroup.groups.name}" y vos estás en ${position}. ¡Entrená para ser un Toro! 🔥`
        }
      }

      await swRegistration.showNotification("¡Hora de entrenar, Toro! 🐂", {
        body: notificationBody,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "daily-motivation",
        requireInteraction: true,
        actions: [
          {
            action: "train",
            title: "💪 ¡Vamos a entrenar!",
          },
          {
            action: "later",
            title: "⏰ Más tarde",
          },
        ],
      })
    } catch (error) {
      console.error("Error sending daily notification:", error)
      // Send fallback notification
      try {
        await swRegistration.showNotification("¡Es hora de entrenar, Toro! 🐂", {
          body: "Las 19:00hs son perfectas para una sesión de entrenamiento. ¡Dale que se puede!",
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "daily-motivation",
        })
      } catch (fallbackError) {
        console.error("Fallback notification also failed:", fallbackError)
      }
    }
  }

  const checkPendingReports = async () => {
    console.log("[v0] Checking for pending reports...")
    if (!username || Notification.permission !== "granted") {
      console.log("[v0] Cannot check reports - no username or permission")
      return
    }

    try {
      // Import the function dynamically to avoid circular dependencies
      const { getUserReportStatus } = await import("@/lib/actions")
      const reportStatus = await getUserReportStatus(username)

      console.log("[v0] Report status:", reportStatus)

      const pendingReports = reportStatus.filter((status: any) => status.needs_report)

      console.log("[v0] Pending reports count:", pendingReports.length)

      if (pendingReports.length > 0) {
        console.log("[v0] Sending pending report notification...")
        await sendPendingReportNotification(pendingReports)
      }
    } catch (error) {
      console.error("[v0] Error checking pending reports:", error)
    }
  }

  const sendPendingReportNotification = async (pendingReports: any[]) => {
    console.log("[v0] Sending notification for pending reports...")

    if (!swRegistration && Notification.permission === "granted") {
      console.log("[v0] No service worker, using basic notification")
      // Use basic notification if service worker not available
      try {
        new Notification("📸 Reporte Pendiente", {
          body: `Tienes ${pendingReports.length} reporte(s) quincenal(es) pendiente(s). ¡No olvides actualizar tu progreso!`,
          icon: "/logo.png",
          tag: "pending-report",
        })
        console.log("[v0] Basic notification sent")
        return
      } catch (error) {
        console.error("[v0] Error with basic notification:", error)
      }
    }

    if (!swRegistration) {
      console.log("[v0] No service worker available")
      return
    }

    try {
      const groupNames = pendingReports.map((r) => r.group_name).join(", ")
      const body =
        pendingReports.length === 1
          ? `Tu reporte quincenal de "${pendingReports[0].group_name}" está pendiente. ¡Actualiza tu progreso!`
          : `Tienes ${pendingReports.length} reportes pendientes: ${groupNames}`

      await swRegistration.showNotification("📸 Reporte Pendiente", {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "pending-report",
        requireInteraction: true,
        actions: [
          {
            action: "report",
            title: "📸 Reportar Ahora",
          },
          {
            action: "dismiss",
            title: "❌ Más Tarde",
          },
        ],
        data: {
          url: "/reports",
        },
      })
      console.log("[v0] Service worker notification sent successfully")
    } catch (error) {
      console.error("[v0] Error sending pending report notification:", error)
      // Fallback to basic notification
      try {
        console.log("[v0] Trying fallback notification...")
        new Notification("📸 Reporte Pendiente", {
          body: `Tienes ${pendingReports.length} reporte(s) quincenal(es) pendiente(s). ¡No olvides actualizar tu progreso!`,
          icon: "/logo.png",
          tag: "pending-report",
        })
        console.log("[v0] Fallback notification sent")
      } catch (fallbackError) {
        console.error("[v0] Fallback notification also failed:", fallbackError)
      }
    }
  }

  if (!("Notification" in window)) {
    return null // Don't show if notifications aren't supported
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {notificationsEnabled ? (
            <Bell className="w-6 h-6 text-toro-accent" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-400" />
          )}
          Notificaciones Diarias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-toro-primary" />
            <div>
              <Label htmlFor="notifications" className="font-medium">
                Recordatorio a las 19:00hs
              </Label>
              <p className="text-sm text-gray-600">
                Te avisamos quién está ganando en tu grupo para motivarte a entrenar
              </p>
            </div>
          </div>
          <Switch
            id="notifications"
            checked={notificationsEnabled}
            onCheckedChange={toggleNotifications}
            disabled={loading}
          />
        </div>

        {permission === "denied" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              Las notificaciones están bloqueadas. Ve a la configuración de tu navegador para habilitarlas.
            </p>
          </div>
        )}

        {notificationsEnabled && permission === "granted" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">¡Notificaciones activadas!</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              Recibirás un recordatorio diario a las 19:00hs con el ranking de tu grupo
            </p>
          </div>
        )}

        {notificationsEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={showTestNotification}
            className="w-full bg-transparent"
            disabled={permission !== "granted" || !swRegistration}
          >
            <Bell className="w-4 h-4 mr-2" />
            Probar Notificación
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

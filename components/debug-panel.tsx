"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Bug, Clock, Megaphone } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserGroups, getGroupRankingTotal, sendBroadcastNotification } from "@/lib/actions"

export default function DebugPanel() {
  const { username } = useApp()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [broadcastTitle, setBroadcastTitle] = useState("🐂 Road To Toro")
  const [showBroadcast, setShowBroadcast] = useState(false)

  const triggerTestNotification = async () => {
    setLoading(true)
    const debugData: any = {
      timestamp: new Date().toLocaleString(),
      username,
      notificationPermission: "Notification" in window ? Notification.permission : "not-supported",
      serviceWorkerSupported: "serviceWorker" in navigator,
      notificationsEnabled: localStorage.getItem("notifications_enabled"),
    }

    try {
      console.log("[v0] Starting test notification...")

      // Check if notifications are supported
      if (!("Notification" in window)) {
        debugData.error = "Notifications not supported"
        alert("Tu navegador no soporta notificaciones")
        setDebugInfo(debugData)
        setLoading(false)
        return
      }

      console.log("[v0] Current permission:", Notification.permission)

      if (Notification.permission !== "granted") {
        console.log("[v0] Requesting notification permission...")
        const permission = await Notification.requestPermission()
        debugData.permissionRequested = true
        debugData.permissionResult = permission
        console.log("[v0] Permission result:", permission)

        if (permission !== "granted") {
          debugData.error = `Permiso denegado: ${permission}`
          alert("Necesitas permitir las notificaciones para recibir el test")
          setDebugInfo(debugData)
          setLoading(false)
          return
        }
      }

      console.log("[v0] Permission granted, getting service worker...")

      let registration: ServiceWorkerRegistration
      try {
        if (!("serviceWorker" in navigator)) {
          throw new Error("Service Worker no soportado")
        }

        // Try to get existing registration or register new one
        registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          console.log("[v0] No registration found, registering service worker...")
          registration = await navigator.serviceWorker.register("/sw.js")
        }

        // Wait for it to be ready with timeout
        console.log("[v0] Waiting for service worker to be ready...")
        const readyPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service Worker timeout")), 5000),
        )

        registration = await Promise.race([readyPromise, timeoutPromise])
        debugData.serviceWorkerReady = true
        console.log("[v0] Service worker ready!")
      } catch (swError) {
        console.error("[v0] Service worker error:", swError)
        debugData.serviceWorkerError = swError instanceof Error ? swError.message : String(swError)

        console.log("[v0] Using fallback notification...")
        new Notification("🐂 [TEST] ¡Notificación de prueba!", {
          body: "Si ves esto, las notificaciones están funcionando correctamente ✅",
          icon: "/logo.png",
          tag: "test-notification",
        })

        debugData.notificationSent = true
        debugData.notificationMethod = "fallback"
        setDebugInfo(debugData)
        setLoading(false)
        return
      }

      // Get user's groups for ranking
      console.log("[v0] Getting user groups...")
      const groupsResult = await getUserGroups(username!)
      debugData.groupsFound = groupsResult.success ? groupsResult.groups.length : 0

      if (groupsResult.success && groupsResult.groups.length > 0) {
        const firstGroup = groupsResult.groups[0]
        debugData.firstGroup = firstGroup.groups.name

        // Get ranking
        console.log("[v0] Getting ranking...")
        const ranking = await getGroupRankingTotal(firstGroup.group_id)
        debugData.rankingLength = ranking.length

        if (ranking.length > 0) {
          const leader = ranking[0]
          const userPosition = ranking.findIndex((user) => user.username === username)

          debugData.leader = leader.username
          debugData.leaderPoints = leader.points
          debugData.userPosition = userPosition >= 0 ? userPosition + 1 : "No encontrado"

          let notificationBody = "¡Es hora de entrenar para ser un verdadero Toro! 💪"

          if (leader.username === username) {
            notificationBody = `¡Estás liderando en "${firstGroup.groups.name}"! Mantén el ritmo, campeón 🏆`
          } else {
            const position = userPosition >= 0 ? userPosition + 1 : "último lugar"
            notificationBody = `${leader.username} está ganando en "${firstGroup.groups.name}" y vos estás en ${position}. ¡Entrená para ser un Toro! 🔥`
          }

          debugData.notificationBody = notificationBody

          // Send the notification using Service Worker
          console.log("[v0] Sending notification...")
          await registration.showNotification("🐂 [TEST] ¡Hora de entrenar, Toro!", {
            body: notificationBody,
            icon: "/logo.png",
            badge: "/logo.png",
            tag: "test-notification",
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

          debugData.notificationSent = true
          debugData.notificationMethod = "service-worker"
          debugData.notificationTag = "test-notification"
          console.log("[v0] Notification sent successfully!")
        } else {
          debugData.error = "No ranking data found"
        }
      } else {
        console.log("[v0] No groups, sending generic notification...")
        await registration.showNotification("🐂 [TEST] ¡Notificación de prueba!", {
          body: "Si ves esto, las notificaciones están funcionando correctamente ✅",
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "test-notification",
          requireInteraction: true,
        })
        debugData.notificationSent = true
        debugData.notificationMethod = "service-worker-generic"
      }
    } catch (error) {
      debugData.error = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] Debug notification error:", error)
      alert(`Error al enviar notificación: ${debugData.error}`)
    }

    setDebugInfo(debugData)
    setLoading(false)
  }

  const checkNotificationStatus = () => {
    const status = {
      permission: Notification.permission,
      enabled: localStorage.getItem("notifications_enabled"),
      timeoutId: localStorage.getItem("notification_timeout"),
      intervalId: localStorage.getItem("notification_interval"),
      currentTime: new Date().toLocaleString(),
      next19: getNext19Time(),
      serviceWorkerSupported: "serviceWorker" in navigator,
    }
    setDebugInfo(status)
  }

  const getNext19Time = () => {
    const now = new Date()
    const target = new Date()
    target.setHours(19, 0, 0, 0)

    if (now > target) {
      target.setDate(target.getDate() + 1)
    }

    return target.toLocaleString()
  }

  const simulate19PM = async () => {
    setLoading(true)

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Simulate the exact 19:00 notification logic
      const groupsResult = await getUserGroups(username!)

      if (!groupsResult.success || groupsResult.groups.length === 0) {
        await registration.showNotification("🐂 [SIMULACIÓN 19:00] ¡Es hora de entrenar, Toro!", {
          body: "Las 19:00hs son perfectas para una sesión de entrenamiento. ¡Dale que se puede!",
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "simulation-19pm",
          requireInteraction: true,
        })
        setDebugInfo({ simulated: true, type: "generic", time: "19:00" })
        setLoading(false)
        return
      }

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

      await registration.showNotification("🐂 [SIMULACIÓN 19:00] ¡Hora de entrenar, Toro!", {
        body: notificationBody,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "simulation-19pm",
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

      setDebugInfo({
        simulated: true,
        type: "ranking",
        time: "19:00",
        group: firstGroup.groups.name,
        ranking: ranking.slice(0, 3),
        notificationBody,
      })
    } catch (error) {
      setDebugInfo({
        simulated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    setLoading(false)
  }

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Escribe un mensaje para enviar")
      return
    }

    setLoading(true)
    const debugData: any = {
      timestamp: new Date().toLocaleString(),
      username,
      action: "broadcast",
    }

    try {
      console.log("[v0] Sending broadcast notification...")

      // Call server action to get user list
      const result = await sendBroadcastNotification(username!, broadcastMessage, broadcastTitle)

      if (!result.success) {
        debugData.error = result.error
        alert(`Error: ${result.error}`)
        setDebugInfo(debugData)
        setLoading(false)
        return
      }

      debugData.userCount = result.userCount
      debugData.users = result.users

      console.log(`[v0] Sending to ${result.userCount} users...`)

      // Check if notifications are supported
      if (!("Notification" in window)) {
        debugData.error = "Notifications not supported"
        alert("Tu navegador no soporta notificaciones")
        setDebugInfo(debugData)
        setLoading(false)
        return
      }

      // Check permission
      if (Notification.permission !== "granted") {
        console.log("[v0] Requesting notification permission...")
        const permission = await Notification.requestPermission()
        debugData.permissionRequested = true
        debugData.permissionResult = permission

        if (permission !== "granted") {
          debugData.error = `Permiso denegado: ${permission}`
          alert("Necesitas permitir las notificaciones")
          setDebugInfo(debugData)
          setLoading(false)
          return
        }
      }

      // Get service worker
      console.log("[v0] Getting service worker...")
      let registration: ServiceWorkerRegistration

      try {
        registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          console.log("[v0] Registering service worker...")
          registration = await navigator.serviceWorker.register("/sw.js")
        }

        const readyPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service Worker timeout")), 5000),
        )

        registration = await Promise.race([readyPromise, timeoutPromise])
        debugData.serviceWorkerReady = true
        console.log("[v0] Service worker ready!")
      } catch (swError) {
        console.error("[v0] Service worker error:", swError)
        debugData.serviceWorkerError = swError instanceof Error ? swError.message : String(swError)

        // Use fallback notification
        console.log("[v0] Using fallback notification...")
        new Notification(result.notification.title, {
          body: result.notification.message,
          icon: "/logo.png",
          tag: "broadcast-notification",
        })

        debugData.notificationSent = true
        debugData.notificationMethod = "fallback"
        debugData.message = `Broadcast enviado a ${result.userCount} usuarios (fallback)`

        alert(`✅ Notificación enviada a ${result.userCount} usuarios`)
        setBroadcastMessage("")
        setDebugInfo(debugData)
        setLoading(false)
        return
      }

      // Send notification using service worker
      console.log("[v0] Sending broadcast notification...")
      await registration.showNotification(result.notification.title, {
        body: result.notification.message,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "broadcast-notification",
        requireInteraction: true,
        data: {
          type: "broadcast",
          userCount: result.userCount,
        },
      })

      debugData.notificationSent = true
      debugData.notificationMethod = "service-worker"
      debugData.message = `Broadcast enviado a ${result.userCount} usuarios`
      console.log("[v0] Broadcast sent successfully!")

      alert(`✅ Notificación enviada a ${result.userCount} usuarios`)
      setBroadcastMessage("")
    } catch (error) {
      debugData.error = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] Broadcast error:", error)
      alert(`Error al enviar broadcast: ${debugData.error}`)
    }

    setDebugInfo(debugData)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={triggerTestNotification}
          disabled={loading}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <Bell className="w-4 h-4 mr-1" />
          {loading ? "Enviando..." : "Test Notificación"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={checkNotificationStatus}
          className="border-red-300 text-red-700 bg-transparent"
        >
          <Bug className="w-4 h-4 mr-1" />
          Check Status
        </Button>

        <Button
          size="sm"
          onClick={simulate19PM}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Clock className="w-4 h-4 mr-1" />
          {loading ? "Simulando..." : "Simular 19:00hs"}
        </Button>

        {username === "Santi" && (
          <Button
            size="sm"
            onClick={() => setShowBroadcast(!showBroadcast)}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Megaphone className="w-4 h-4 mr-1" />
            Broadcast
          </Button>
        )}
      </div>

      {username === "Santi" && showBroadcast && (
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300 space-y-3">
          <div className="flex items-center gap-2 text-purple-700 font-bold">
            <Megaphone className="w-5 h-5" />
            <span>Enviar Notificación a Todos</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-title" className="text-sm font-medium">
              Título
            </Label>
            <Input
              id="broadcast-title"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="🐂 Road To Toro"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-message" className="text-sm font-medium">
              Mensaje
            </Label>
            <Textarea
              id="broadcast-message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Escribe el mensaje que quieres enviar a todos los usuarios..."
              rows={4}
              className="bg-white"
            />
          </div>

          <Button
            onClick={sendBroadcast}
            disabled={loading || !broadcastMessage.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            {loading ? "Enviando..." : "Enviar a Todos"}
          </Button>
        </div>
      )}

      {debugInfo && (
        <div className="bg-gray-100 p-3 rounded text-xs space-y-2">
          <div className="font-bold text-red-700">Debug Info:</div>
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {key}
              </Badge>
              <span className="text-gray-700">
                {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useApp } from "@/app/app-provider"
import { ensurePushSubscription } from "@/lib/push-client"

/**
 * Re-sincroniza la suscripción Web Push del dispositivo en cada apertura de la
 * app (si el permiso ya está concedido). No pide permiso: eso lo hacen
 * NotificationPrompt (feed) y NotificationManager (ajustes) con un gesto del
 * usuario. No renderiza nada.
 */
export function PushSubscriber() {
  const { username } = useApp()

  useEffect(() => {
    if (!username) return
    ensurePushSubscription(username)
  }, [username])

  return null
}

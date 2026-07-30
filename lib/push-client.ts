// Suscripción a Web Push desde el navegador (client-side).
//
// ensurePushSubscription() es idempotente: se puede llamar en cada apertura de
// la app. Si el permiso está concedido, registra el service worker, obtiene (o
// crea) la suscripción push del dispositivo y la guarda en `push_subscriptions`
// vía server action. En iOS solo funciona con la PWA instalada en la pantalla
// de inicio (iOS 16.4+); en el Safari "suelto" no existe PushManager.

import { savePushSubscription } from "@/lib/actions"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * Registra el SW y sincroniza la suscripción push del dispositivo con el
 * backend. Devuelve true si quedó suscripto. No pide permiso: eso tiene que
 * salir de un gesto del usuario (ver NotificationPrompt / NotificationManager).
 */
export async function ensurePushSubscription(username: string): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.warn("[push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY; no se puede suscribir")
      return false
    }

    await navigator.serviceWorker.register("/sw.js")
    const registration = await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    const res = await savePushSubscription(username, {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })
    return res.success
  } catch (err) {
    console.error("[push] Error suscribiendo a push:", err)
    return false
  }
}

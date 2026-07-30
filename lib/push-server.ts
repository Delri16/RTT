// Envío de Web Push desde el server (lo importa lib/actions.ts, nunca el cliente).
//
// Requiere las claves VAPID en el entorno:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  (también la usa el cliente para suscribirse)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT                 (mailto: de contacto, opcional)
// Sin ellas, sendPushToUser es un no-op silencioso: la notificación in-app
// igual se crea, solo no llega el push al dispositivo.

import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

let vapidConfigured = false

function ensureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  if (!vapidConfigured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:zantyyyy@gmail.com", publicKey, privateKey)
    vapidConfigured = true
  }
  return true
}

export type PushPayload = {
  title: string
  body: string
  /** Ruta a abrir al tocar la notificación (default "/"). */
  url?: string
  /** Mismo tag = reemplaza la notificación anterior en vez de apilar. */
  tag?: string
}

/**
 * Manda un push a todos los dispositivos suscriptos del usuario. Las
 * suscripciones muertas (endpoint dado de baja: HTTP 404/410) se borran.
 */
export async function sendPushToUser(username: string, payload: PushPayload) {
  if (!ensureVapid()) {
    console.warn("[push] VAPID keys faltantes; no se manda push")
    return { sent: 0 }
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("username", username)

  if (error || !subs || subs.length === 0) return { sent: 0 }

  const body = JSON.stringify({ url: "/", ...payload })
  let sent = 0

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
        sent++
      } catch (err: any) {
        const status = err?.statusCode
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        } else {
          console.error("[push] Error mandando push:", status, err?.body || err?.message)
        }
      }
    }),
  )

  return { sent }
}

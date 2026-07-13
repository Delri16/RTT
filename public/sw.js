// Service Worker para manejar notificaciones push
const CACHE_NAME = "road-to-toro-v1"

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(self.clients.claim())
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification.tag, event.action)

  event.notification.close()

  // Handle different actions based on notification type
  const notificationData = event.notification.data || {}

  let targetUrl = "/"

  if (notificationData.type === "activity_tag") {
    if (event.action === "accept") {
      targetUrl = "/activity-tags"
    } else if (event.action === "view") {
      targetUrl = "/activity-tags"
    } else {
      // Click on notification body
      targetUrl = "/activity-tags"
    }
  } else {
    // Daily motivation notification
    if (event.action === "train") {
      targetUrl = "/log"
    } else {
      targetUrl = "/"
    }
  }

  // Open the app at the target URL
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          return client.focus().then(() => client.navigate(targetUrl))
        }
      }
      // Open new window/tab
      return self.clients.openWindow(targetUrl)
    }),
  )
})

// Handle push events (for future server-sent notifications)
self.addEventListener("push", (event) => {
  console.log("Push received:", event)

  let data = {}

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { body: event.data.text() }
    }
  }

  // Handle different notification types
  const notificationType = data.type || "daily"

  let options = {
    icon: "/logo.png",
    badge: "/logo.png",
    requireInteraction: true,
  }

  if (notificationType === "activity_tag") {
    // Activity tag notification
    options = {
      ...options,
      body: data.message || "Te han etiquetado en una actividad",
      tag: `activity-tag-${data.tagId}`,
      data: {
        type: "activity_tag",
        tagId: data.tagId,
        activityName: data.activityName,
        taggedBy: data.taggedBy,
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
    }
  } else {
    // Daily motivation notification
    options = {
      ...options,
      body: data.body || "¡Es hora de entrenar, Toro!",
      tag: "daily-motivation",
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
    }
  }

  event.waitUntil(self.registration.showNotification("Road To Toro", options))
})

// Handle notification action clicks
self.addEventListener("notificationaction", (event) => {
  console.log("Notification action clicked:", event.action)

  event.notification.close()

  if (event.action === "train") {
    event.waitUntil(self.clients.openWindow("/log"))
  }
})

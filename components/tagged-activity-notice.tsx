"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useApp } from "@/app/app-provider"
import { getUnreadNotificationsByType, markNotificationAsRead, type AppNotification } from "@/lib/actions"
import { timeAgo } from "@/lib/date-utils"

/**
 * Al abrir la app, si alguien te etiquetó en una actividad desde la última vez
 * (notificaciones `activity_auto_logged` sin leer), muestra un cartel con la
 * lista: la actividad YA quedó registrada a tu nombre, no hay que cargarla de
 * nuevo. Al cerrar se marcan como leídas, así no reaparece.
 */
export function TaggedActivityNotice() {
  const { username } = useApp()
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!username) return
    let active = true
    getUnreadNotificationsByType(username, "activity_auto_logged")
      .then((res) => {
        if (!active || !res.success || res.notifications.length === 0) return
        setItems(res.notifications)
        setOpen(true)
      })
      .catch((err) => console.error("[tagged-activity-notice] error:", err))
    return () => {
      active = false
    }
  }, [username])

  const dismiss = () => {
    setOpen(false)
    if (!username) return
    items.forEach((n) => markNotificationAsRead(n.id, username))
  }

  const goToHistory = () => {
    dismiss()
    router.push("/activities/history")
  }

  if (items.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-toro-foreground">
            <Dumbbell className="w-5 h-5 text-toro-accent" />
            {items.length === 1 ? "Te cargaron una actividad" : `Te cargaron ${items.length} actividades`}
          </DialogTitle>
          <DialogDescription className="text-toro-foreground/70">
            Ya están registradas a tu nombre con tus puntos. <span className="font-semibold">No las cargues de nuevo.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {items.map((n) => (
            <div key={n.id} className="rounded-xl bg-toro-accent/10 border border-toro-accent/30 px-3 py-2">
              <p className="text-sm text-toro-foreground leading-snug">{n.message}</p>
              <p className="text-[11px] text-toro-foreground/50 mt-1 flex items-center gap-1 flex-wrap">
                {n.group_name && (
                  <>
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[10rem]">{n.group_name}</span>
                    <span>·</span>
                  </>
                )}
                {timeAgo(n.created_at)}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button variant="outline" onClick={goToHistory}>
            Ver mi historial
          </Button>
          <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white" onClick={dismiss}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

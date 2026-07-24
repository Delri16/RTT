"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, AlertCircle } from "lucide-react"
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
import { getUserReportStatus } from "@/lib/actions"

const DISMISS_KEY = "rtt_report_reminder_dismissed"

/**
 * Al entrar a la app, si el usuario tiene un reporte de peso pendiente, muestra
 * un aviso con "Aceptar" (lleva a /reports) o "Cerrar". Solo se muestra una vez
 * por sesión de navegador para no molestar en cada navegación.
 */
export function ReportReminderDialog() {
  const { username } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pendingGroups, setPendingGroups] = useState<string[]>([])

  useEffect(() => {
    if (!username) return
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "true") return

    let active = true

    getUserReportStatus(username)
      .then((status) => {
        if (!active) return
        const pending = (status || []).filter((s: any) => s.needs_report)
        if (pending.length > 0) {
          setPendingGroups(pending.map((s: any) => s.group_name))
          setOpen(true)
        }
      })
      .catch((error) => {
        console.error("[report-reminder] Error checking report status:", error)
      })

    return () => {
      active = false
    }
  }, [username])

  const dismiss = () => {
    if (typeof window !== "undefined") sessionStorage.setItem(DISMISS_KEY, "true")
    setOpen(false)
  }

  const goToReports = () => {
    dismiss()
    router.push("/reports")
  }

  const description =
    pendingGroups.length === 1
      ? `Tenés pendiente el reporte quincenal de "${pendingGroups[0]}". Subí una foto y tu peso para seguir tu progreso.`
      : `Tenés ${pendingGroups.length} reportes quincenales pendientes: ${pendingGroups.join(", ")}.`

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-toro-foreground">
            <AlertCircle className="w-5 h-5 text-toro-primary" />
            Tenés que subir un reporte de peso
          </DialogTitle>
          <DialogDescription className="text-toro-foreground/70">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button variant="outline" onClick={dismiss}>
            Cerrar
          </Button>
          <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white" onClick={goToReports}>
            <Camera className="w-4 h-4 mr-2" />
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

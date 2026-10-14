"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, AlertCircle, CalendarClock } from "lucide-react"
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
import { argDayKey } from "@/lib/date-utils"

const DISMISS_KEY = "rtt_report_reminder_dismissed"
const TOMORROW_DISMISS_KEY = "rtt_report_tomorrow_dismissed"

type ReminderKind = "due" | "tomorrow"

type ReportStatus = {
  group_name: string
  needs_report: boolean
  days_until_next: number
}

/**
 * Al entrar a la app muestra uno de dos avisos sobre el reporte de peso:
 *
 * - **Vencido** (`due`): algún grupo tiene `needs_report`. Botones "Aceptar"
 *   (lleva a /reports) o "Cerrar". Se muestra una vez por sesión de navegador.
 * - **Mañana** (`tomorrow`): ningún grupo está vencido pero a alguno le queda
 *   exactamente 1 día (`days_until_next === 1`). Avisa que mañana toca y
 *   recuerda pesarse en ayunas. Se muestra una vez por día (localStorage con
 *   la fecha en hora Argentina), porque la condición dura todo el día y con
 *   sessionStorage reaparecería en cada apertura de la PWA.
 *
 * Si hay vencidos y además otro grupo vence mañana, gana el vencido.
 */
export function ReportReminderDialog() {
  const { username } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ReminderKind>("due")
  const [groups, setGroups] = useState<string[]>([])

  useEffect(() => {
    if (!username || typeof window === "undefined") return

    const dueDismissed = sessionStorage.getItem(DISMISS_KEY) === "true"
    const tomorrowDismissed = localStorage.getItem(TOMORROW_DISMISS_KEY) === argDayKey(new Date())
    if (dueDismissed && tomorrowDismissed) return

    let active = true

    getUserReportStatus(username)
      .then((status) => {
        if (!active) return
        const all = (status || []) as ReportStatus[]

        const due = all.filter((s) => s.needs_report)
        if (due.length > 0) {
          if (dueDismissed) return
          setKind("due")
          setGroups(due.map((s) => s.group_name))
          setOpen(true)
          return
        }

        const tomorrow = all.filter((s) => !s.needs_report && s.days_until_next === 1)
        if (tomorrow.length > 0 && !tomorrowDismissed) {
          setKind("tomorrow")
          setGroups(tomorrow.map((s) => s.group_name))
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
    if (typeof window !== "undefined") {
      if (kind === "due") sessionStorage.setItem(DISMISS_KEY, "true")
      else localStorage.setItem(TOMORROW_DISMISS_KEY, argDayKey(new Date()))
    }
    setOpen(false)
  }

  const goToReports = () => {
    dismiss()
    router.push("/reports")
  }

  const groupList = groups.join(", ")

  if (kind === "tomorrow") {
    const description =
      groups.length === 1
        ? `Mañana te toca el reporte quincenal de "${groups[0]}". Acordate de pesarte a la mañana, en ayunas y antes de desayunar, para que el número sea comparable con el anterior.`
        : `Mañana te toca el reporte quincenal de ${groups.length} grupos (${groupList}). Acordate de pesarte a la mañana, en ayunas y antes de desayunar, para que el número sea comparable con el anterior.`

    return (
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-toro-foreground">
              <CalendarClock className="w-5 h-5 text-toro-secondary" />
              Mañana tenés que subir el reporte
            </DialogTitle>
            <DialogDescription className="text-toro-foreground/70">{description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-toro-secondary/15 border border-toro-secondary/40 px-3 py-2 text-sm text-toro-foreground/80">
            ⚖️ No te olvides: <span className="font-semibold">pesate en ayunas</span>, siempre en las mismas condiciones.
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white" onClick={dismiss}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const description =
    groups.length === 1
      ? `Tenés pendiente el reporte quincenal de "${groups[0]}". Subí una foto y tu peso para seguir tu progreso.`
      : `Tenés ${groups.length} reportes quincenales pendientes: ${groupList}.`

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

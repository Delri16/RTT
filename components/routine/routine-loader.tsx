"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { getRoutine, type Routine } from "@/lib/actions"
import { Button } from "@/components/ui/button"

/** Carga una rutina por id (client-side) y la pasa al children render-prop. */
export default function RoutineLoader({
  id,
  children,
}: {
  id: string
  children: (routine: Routine) => React.ReactNode
}) {
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")

  useEffect(() => {
    let active = true
    getRoutine(id).then((res) => {
      if (!active) return
      if (res.success && res.routine) {
        setRoutine(res.routine)
        setState("ok")
      } else {
        setState("error")
      }
    })
    return () => {
      active = false
    }
  }, [id])

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-toro-background">
        <Dumbbell className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  if (state === "error" || !routine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-toro-background text-center px-6">
        <div className="text-4xl mb-3">🤔</div>
        <h2 className="font-display text-xl text-toro-foreground mb-1">No encontramos esta rutina</h2>
        <p className="text-sm text-toro-foreground/50 mb-4">Puede que se haya eliminado.</p>
        <Link href="/mi-rutina">
          <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">Volver a Mi Rutina</Button>
        </Link>
      </div>
    )
  }

  return <>{children(routine)}</>
}

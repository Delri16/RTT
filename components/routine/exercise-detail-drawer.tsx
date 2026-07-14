"use client"

import { useEffect, useState } from "react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Plus, Check, Trophy } from "lucide-react"
import {
  type Exercise,
  exerciseImageUrl,
  tMuscle,
  tEquipment,
  tCategory,
  tForce,
  tLevel,
  tMechanic,
} from "@/lib/exercise-catalog"
import { getExerciseHistory } from "@/lib/actions"

const FAME_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: "Popular", className: "bg-toro-primary/15 text-toro-primary" },
  2: { label: "Común", className: "bg-toro-secondary/30 text-toro-foreground/70" },
  3: { label: "Poco común", className: "bg-black/5 text-toro-foreground/50" },
}

export default function ExerciseDetailDrawer({
  exercise,
  open,
  onOpenChange,
  username,
  onAdd,
  isAdded,
}: {
  exercise: Exercise | null
  open: boolean
  onOpenChange: (v: boolean) => void
  username?: string | null
  onAdd?: (ex: Exercise) => void
  isAdded?: boolean
}) {
  const [imgIndex, setImgIndex] = useState(0)
  const [best, setBest] = useState<{ weight: number; reps: number } | null>(null)

  // Alterna las 2 imágenes (posición inicial / final) automáticamente.
  useEffect(() => {
    if (!open || !exercise || exercise.images.length < 2) return
    const t = setInterval(() => setImgIndex((i) => (i + 1) % exercise.images.length), 1100)
    return () => clearInterval(t)
  }, [open, exercise])

  useEffect(() => {
    setImgIndex(0)
    setBest(null)
    if (!open || !exercise || !username) return
    let active = true
    getExerciseHistory(username, exercise.id, 100).then((res) => {
      if (!active || !res.success || res.sets.length === 0) return
      const top = res.sets.reduce((a: any, b: any) => (Number(b.weight) > Number(a.weight) ? b : a))
      setBest({ weight: Number(top.weight), reps: top.reps })
    })
    return () => {
      active = false
    }
  }, [open, exercise, username])

  if (!exercise) return null
  const fame = FAME_BADGE[exercise.fame]

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-4 pb-8">
          {/* Imagen */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white mt-1 border border-black/5">
            {exercise.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exerciseImageUrl(exercise.images[imgIndex]) || "/placeholder.svg"}
                alt={exercise.nombre}
                className="w-full h-full object-cover"
                onClick={() => setImgIndex((i) => (i + 1) % exercise.images.length)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="w-12 h-12 text-toro-foreground/20" />
              </div>
            )}
            {exercise.images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {exercise.images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === imgIndex ? "w-4 bg-toro-primary" : "w-1.5 bg-white/70"}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 mt-3">
            <div className="min-w-0">
              <h2 className="text-xl font-display text-toro-foreground leading-tight">{exercise.nombre}</h2>
              <p className="text-sm text-toro-foreground/40">{exercise.name}</p>
            </div>
            {fame && <Badge className={`shrink-0 border-0 ${fame.className}`}>{fame.label}</Badge>}
          </div>

          {/* Récord personal */}
          {best && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-toro-accent/10 px-3 py-2">
              <Trophy className="w-4 h-4 text-toro-accent shrink-0" />
              <span className="text-sm text-toro-foreground">
                Tu récord: <span className="font-bold">{best.weight} kg</span>
                <span className="text-toro-foreground/50"> × {best.reps} reps</span>
              </span>
            </div>
          )}

          {/* Chips de info */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {exercise.primaryMuscles.map((m) => (
              <span key={m} className="text-xs font-medium rounded-full bg-toro-primary/10 text-toro-primary px-2.5 py-1">
                {tMuscle(m)}
              </span>
            ))}
            {exercise.secondaryMuscles.map((m) => (
              <span key={m} className="text-xs rounded-full bg-black/5 text-toro-foreground/60 px-2.5 py-1">
                {tMuscle(m)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <InfoRow label="Equipo" value={tEquipment(exercise.equipment)} />
            <InfoRow label="Categoría" value={tCategory(exercise.category)} />
            <InfoRow label="Nivel" value={tLevel(exercise.level)} />
            <InfoRow label="Tipo" value={tMechanic(exercise.mechanic)} />
            <InfoRow label="Fuerza" value={tForce(exercise.force)} />
          </div>

          {/* Instrucciones ES */}
          {exercise.instrucciones?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-toro-foreground mb-2">Cómo hacerlo</h3>
              <ol className="space-y-2">
                {exercise.instrucciones.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-toro-foreground/80">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-toro-secondary/40 text-toro-foreground/70 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {onAdd && (
          <div className="border-t border-black/5 p-3 bg-white/80 backdrop-blur">
            <Button
              onClick={() => onAdd(exercise)}
              disabled={isAdded}
              className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white disabled:bg-toro-accent disabled:opacity-100"
            >
              {isAdded ? (
                <>
                  <Check className="w-5 h-5 mr-1.5" /> Agregado a la rutina
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-1.5" /> Agregar a la rutina
                </>
              )}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-toro-foreground/40">{label}</div>
      <div className="font-medium text-toro-foreground/80 truncate">{value}</div>
    </div>
  )
}

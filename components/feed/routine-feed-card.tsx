"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Dumbbell, ListChecks, Plus, Check, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useApp } from "@/app/app-provider"
import { addSharedRoutine, type FeedItem } from "@/lib/actions"
import { loadExercises, exerciseThumb, type Exercise } from "@/lib/exercise-catalog"

type RoutineFeedItem = Extract<FeedItem, { type: "routine" }>

export default function RoutineFeedCard({ item }: { item: RoutineFeedItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-4 mb-3 mt-1">
      <div className="rounded-xl bg-gradient-to-br from-toro-primary/12 to-toro-secondary/15 p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
            {item.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-toro-primary">Compartió una rutina</p>
            <p className="text-toro-foreground font-semibold leading-tight truncate">{item.routineName}</p>
            <p className="text-xs text-toro-foreground/50 flex items-center gap-1">
              <ListChecks className="w-3 h-3" /> {item.exercises.length} ejercicio{item.exercises.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {item.description && <p className="text-sm text-toro-foreground/60 mt-2">{item.description}</p>}
        <Button
          onClick={() => setOpen(true)}
          className="w-full mt-3 bg-toro-primary hover:bg-toro-primary/90 text-white h-10"
        >
          <Eye className="w-4 h-4 mr-1.5" /> Ver rutina
        </Button>
      </div>

      <RoutineViewerDrawer item={item} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function RoutineViewerDrawer({
  item,
  open,
  onOpenChange,
}: {
  item: RoutineFeedItem
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { username } = useApp()
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [adding, setAdding] = useState(false)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    loadExercises().then((all) => {
      const map = new Map<string, Exercise>()
      for (const ex of item.exercises) {
        const found = all.find((e) => e.id === ex.exercise_id)
        if (found) map.set(ex.exercise_id, found)
      }
      setCatalog(map)
    })
  }, [open, item.exercises])

  async function add() {
    if (!username) return
    setAdding(true)
    setError(null)
    const res = await addSharedRoutine(username, {
      name: item.routineName,
      emoji: item.emoji,
      description: item.description,
      exercises: item.exercises,
    })
    setAdding(false)
    if (!res.success || !res.routine) {
      setError(res.error || "No se pudo agregar.")
      return
    }
    setAddedId(res.routine.id)
  }

  const isOwn = username === item.username

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display text-xl flex items-center gap-2">
            <span className="text-2xl">{item.emoji}</span> {item.routineName}
          </DrawerTitle>
          <p className="text-xs text-toro-foreground/50 text-left">
            de {item.username} · {item.exercises.length} ejercicios
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 space-y-2 pb-2">
          {item.description && <p className="text-sm text-toro-foreground/60">{item.description}</p>}
          {item.exercises.map((ex, i) => {
            const cat = catalog.get(ex.exercise_id)
            return (
              <div key={ex.exercise_id + i} className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-2.5">
                <span className="w-5 text-center font-display text-toro-foreground/30 shrink-0">{i + 1}</span>
                {cat ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={exerciseThumb(cat) || "/placeholder.svg"} alt="" className="w-11 h-11 rounded-lg object-cover bg-toro-background shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-toro-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-toro-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-toro-foreground text-sm leading-tight truncate">{ex.name}</div>
                  {ex.notes && <div className="text-[11px] text-toro-foreground/50 truncate">{ex.notes}</div>}
                </div>
                {ex.target_sets && ex.target_reps && (
                  <div className="shrink-0 rounded-lg bg-toro-primary/10 text-toro-primary text-xs font-bold px-2.5 py-1.5">
                    {ex.target_sets}×{ex.target_reps}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-black/5 p-3 space-y-2">
          {addedId ? (
            <Link href={`/mi-rutina/${addedId}`}>
              <Button className="w-full bg-toro-accent hover:bg-toro-accent/90 text-white h-11">
                <Check className="w-5 h-5 mr-1.5" /> ¡Agregada! Editá tu copia
              </Button>
            </Link>
          ) : (
            <Button
              onClick={add}
              disabled={adding || !username}
              className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white h-11"
            >
              {adding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-1.5" /> {isOwn ? "Guardar otra copia" : "Agregar a mis rutinas"}
                </>
              )}
            </Button>
          )}
          {error && <p className="text-sm text-toro-primary text-center">{error}</p>}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

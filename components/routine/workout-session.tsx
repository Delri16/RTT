"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Dumbbell, Loader2, Trophy, X, Timer, History } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import PRCelebration, { type PRData } from "@/components/routine/pr-celebration"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { loadExercises, exerciseThumb, type Exercise } from "@/lib/exercise-catalog"
import { logWorkoutSet, deleteWorkoutSet, getExerciseHistory, type Routine } from "@/lib/actions"

type SetRow = { weight: string; reps: string; done: boolean; setId?: string; pending?: boolean }

export default function WorkoutSession({ routine, username }: { routine: Routine; username: string }) {
  const router = useRouter()
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [sets, setSets] = useState<Record<string, SetRow[]>>({})
  const [last, setLast] = useState<Record<string, { weight: number; reps: number } | null>>({})
  const [pr, setPr] = useState<PRData | null>(null)
  const [rest, setRest] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)

  // Estado inicial: N filas por ejercicio (según target_sets).
  useEffect(() => {
    const init: Record<string, SetRow[]> = {}
    for (const ex of routine.exercises) {
      const n = Math.max(1, ex.target_sets ?? 3)
      init[ex.exercise_id] = Array.from({ length: n }, () => ({
        weight: "",
        reps: ex.target_reps ? String(ex.target_reps) : "",
        done: false,
      }))
    }
    setSets(init)
  }, [routine])

  // Catálogo (thumbs) + último registro por ejercicio (para prefiltrar peso).
  useEffect(() => {
    let active = true
    loadExercises().then((all) => {
      if (!active) return
      const map = new Map<string, Exercise>()
      for (const ex of routine.exercises) {
        const found = all.find((e) => e.id === ex.exercise_id)
        if (found) map.set(ex.exercise_id, found)
      }
      setCatalog(map)
    })
    Promise.all(
      routine.exercises.map((ex) =>
        getExerciseHistory(username, ex.exercise_id, 1).then((res) => ({
          id: ex.exercise_id,
          last: res.success && res.sets.length > 0 ? { weight: Number(res.sets[0].weight), reps: res.sets[0].reps } : null,
        })),
      ),
    ).then((results) => {
      if (!active) return
      const map: Record<string, { weight: number; reps: number } | null> = {}
      for (const r of results) map[r.id] = r.last
      setLast(map)
    })
    return () => {
      active = false
    }
  }, [routine, username])

  function updateRow(exId: string, idx: number, patch: Partial<SetRow>) {
    setSets((prev) => {
      const rows = [...(prev[exId] ?? [])]
      rows[idx] = { ...rows[idx], ...patch }
      return { ...prev, [exId]: rows }
    })
  }

  function addRow(exId: string) {
    setSets((prev) => {
      const rows = prev[exId] ?? []
      const lastRow = rows[rows.length - 1]
      return { ...prev, [exId]: [...rows, { weight: lastRow?.weight ?? "", reps: lastRow?.reps ?? "", done: false }] }
    })
  }

  function removeRow(exId: string, idx: number) {
    const row = sets[exId]?.[idx]
    if (row?.done && row.setId) deleteWorkoutSet(row.setId)
    setSets((prev) => ({ ...prev, [exId]: (prev[exId] ?? []).filter((_, i) => i !== idx) }))
  }

  async function toggleDone(exId: string, exName: string, idx: number) {
    const row = sets[exId]?.[idx]
    if (!row) return

    // Desmarcar: borra la serie registrada.
    if (row.done) {
      if (row.setId) deleteWorkoutSet(row.setId)
      updateRow(exId, idx, { done: false, setId: undefined })
      return
    }

    const weight = Number(row.weight)
    const reps = Number(row.reps)
    if (!reps || reps <= 0) return // reps obligatorias

    updateRow(exId, idx, { pending: true })
    const res = await logWorkoutSet({
      username,
      routine_id: routine.id,
      exercise_id: exId,
      exercise_name: exName,
      weight: isNaN(weight) ? 0 : weight,
      reps,
    })
    if (!res.success) {
      updateRow(exId, idx, { pending: false })
      return
    }
    updateRow(exId, idx, { done: true, pending: false, setId: (res as any).set?.id })
    setLast((prev) => ({ ...prev, [exId]: { weight: isNaN(weight) ? 0 : weight, reps } }))
    setRest(90) // arranca descanso

    if (res.isPR && weight > 0) {
      setPr({ exerciseId: exId, exerciseName: exName, weight, reps, prevWeight: (res as any).prevWeight ?? null })
    }
  }

  const stats = useMemo(() => {
    let done = 0
    let volume = 0
    for (const rows of Object.values(sets)) {
      for (const r of rows) {
        if (r.done) {
          done++
          volume += (Number(r.weight) || 0) * (Number(r.reps) || 0)
        }
      }
    }
    return { done, volume }
  }, [sets])

  return (
    <div className="bg-toro-background min-h-full pb-40">
      <RoutineHeader
        title={routine.name}
        subtitle="Entrenando"
        back={`/mi-rutina/${routine.id}`}
        right={
          <Button
            onClick={() => setFinishing(true)}
            size="sm"
            className="bg-toro-accent hover:bg-toro-accent/90 text-white rounded-xl"
          >
            Terminar
          </Button>
        }
      />

      <div className="p-4 space-y-4 max-w-xl mx-auto">
        {routine.exercises.map((ex) => {
          const cat = catalog.get(ex.exercise_id)
          const rows = sets[ex.exercise_id] ?? []
          const lastRec = last[ex.exercise_id]
          return (
            <div key={ex.exercise_id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 border-b border-black/5">
                {cat ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={exerciseThumb(cat) || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-lg object-cover bg-toro-background shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-toro-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-toro-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-toro-foreground leading-tight truncate">{ex.name}</div>
                  <div className="text-xs text-toro-foreground/50 flex items-center gap-2">
                    {ex.target_sets && ex.target_reps && (
                      <span>
                        Meta: {ex.target_sets}×{ex.target_reps}
                      </span>
                    )}
                    {lastRec && (
                      <span className="flex items-center gap-0.5">
                        <History className="w-3 h-3" /> {lastRec.weight}kg×{lastRec.reps}
                      </span>
                    )}
                  </div>
                  {ex.notes && <div className="text-[11px] text-toro-primary/70 truncate">{ex.notes}</div>}
                </div>
              </div>

              {/* Filas de series */}
              <div className="p-2">
                <div className="grid grid-cols-[28px_1fr_1fr_44px_32px] gap-1.5 px-1 pb-1 text-[10px] uppercase tracking-wide text-toro-foreground/40">
                  <span className="text-center">#</span>
                  <span className="text-center">Kg</span>
                  <span className="text-center">Reps</span>
                  <span className="text-center">OK</span>
                  <span />
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[28px_1fr_1fr_44px_32px] gap-1.5 items-center py-1 rounded-lg ${
                      row.done ? "bg-toro-accent/10" : ""
                    }`}
                  >
                    <span className="text-center text-sm font-bold text-toro-foreground/50">{idx + 1}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={row.weight}
                      onChange={(e) => updateRow(ex.exercise_id, idx, { weight: e.target.value })}
                      placeholder={lastRec ? String(lastRec.weight) : "0"}
                      disabled={row.done}
                      className="h-9 text-center bg-toro-background/60 border-black/10 px-1 disabled:opacity-70"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={row.reps}
                      onChange={(e) => updateRow(ex.exercise_id, idx, { reps: e.target.value })}
                      placeholder={ex.target_reps ? String(ex.target_reps) : "0"}
                      disabled={row.done}
                      className="h-9 text-center bg-toro-background/60 border-black/10 px-1 disabled:opacity-70"
                    />
                    <button
                      onClick={() => toggleDone(ex.exercise_id, ex.name, idx)}
                      disabled={row.pending}
                      className={`h-9 rounded-lg flex items-center justify-center transition active:scale-90 ${
                        row.done ? "bg-toro-accent text-white" : "bg-black/5 text-toro-foreground/40"
                      }`}
                    >
                      {row.pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => removeRow(ex.exercise_id, idx)}
                      className="h-9 flex items-center justify-center text-toro-foreground/30 hover:text-toro-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addRow(ex.exercise_id)}
                  className="w-full mt-1 py-2 rounded-lg text-sm font-medium text-toro-primary bg-toro-primary/5 flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar serie
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra de progreso fija */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 pointer-events-none">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-black/5 px-4 py-2.5 flex items-center justify-between pointer-events-auto">
          <div className="text-sm">
            <span className="font-bold text-toro-foreground">{stats.done}</span>
            <span className="text-toro-foreground/50"> series · </span>
            <span className="font-bold text-toro-foreground">{Math.round(stats.volume)}</span>
            <span className="text-toro-foreground/50"> kg vol.</span>
          </div>
          <Button
            onClick={() => setFinishing(true)}
            size="sm"
            className="bg-toro-accent hover:bg-toro-accent/90 text-white rounded-xl h-8"
          >
            Terminar
          </Button>
        </div>
      </div>

      {rest !== null && <RestTimer seconds={rest} onClose={() => setRest(null)} />}

      <PRCelebration pr={pr} username={username} onClose={() => setPr(null)} />

      {/* Resumen final */}
      <Dialog open={finishing} onOpenChange={setFinishing}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-toro-secondary" /> ¡Buen entreno!
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Stat label="Series hechas" value={String(stats.done)} />
            <Stat label="Volumen total" value={`${Math.round(stats.volume)} kg`} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFinishing(false)} className="flex-1 bg-transparent">
              Seguir
            </Button>
            <Button
              onClick={() => {
                setFinishing(true)
                router.push(`/mi-rutina/${routine.id}`)
              }}
              className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
            >
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-toro-background p-3 text-center">
      <div className="text-2xl font-display text-toro-foreground">{value}</div>
      <div className="text-xs text-toro-foreground/50">{label}</div>
    </div>
  )
}

function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [left, setLeft] = useState(seconds)
  const startRef = useRef(seconds)

  useEffect(() => {
    setLeft(seconds)
    startRef.current = seconds
  }, [seconds])

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t)
          return 0
        }
        return l - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [seconds])

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, "0")

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-lg text-white ${
          left === 0 ? "bg-toro-accent" : "bg-toro-foreground"
        }`}
      >
        <Timer className="w-4 h-4" />
        <span className="font-bold tabular-nums">
          {left === 0 ? "¡Dale!" : `${mm}:${ss}`}
        </span>
        <button onClick={() => setLeft((l) => l + 30)} className="text-xs bg-white/20 rounded-full px-2 py-0.5">
          +30s
        </button>
        <button onClick={onClose} aria-label="Cerrar" className="ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

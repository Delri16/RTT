"use client"

import { useEffect, useMemo, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Loader2, Trophy, Trash2, Dumbbell } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { exerciseThumb, type Exercise } from "@/lib/exercise-catalog"
import { logWorkoutSet, deleteWorkoutSet, getExerciseHistory } from "@/lib/actions"
import PRCelebration, { type PRData } from "@/components/routine/pr-celebration"

type SetEntry = { id: string; weight: number; reps: number; created_at: string; is_pr: boolean }

/** Drawer para registrar series sueltas de un ejercicio favorito (sin rutina) y ver su progreso. */
export default function ExerciseProgressDrawer({
  exercise,
  username,
  open,
  onOpenChange,
  readOnly = false,
}: {
  exercise: Pick<Exercise, "id" | "nombre" | "images"> | null
  username: string
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Vista de solo lectura (perfil de otro usuario): sin registro de series ni compartir. */
  readOnly?: boolean
}) {
  const [history, setHistory] = useState<SetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState("")
  const [reps, setReps] = useState("")
  const [saving, setSaving] = useState(false)
  const [pr, setPr] = useState<PRData | null>(null)

  useEffect(() => {
    if (!open || !exercise) return
    setLoading(true)
    setWeight("")
    setReps("")
    getExerciseHistory(username, exercise.id, 50).then((res) => {
      if (res.success) setHistory(res.sets as SetEntry[])
      setLoading(false)
    })
  }, [open, exercise, username])

  const best = useMemo(() => {
    if (!history.length) return null
    return history.reduce((a, b) => (b.weight > a.weight ? b : a))
  }, [history])

  const chartData = useMemo(
    () =>
      [...history]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((s) => ({
          date: new Date(s.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
          peso: s.weight,
        })),
    [history],
  )

  async function addSet() {
    if (!exercise) return
    const w = Number(weight)
    const r = Number(reps)
    if (!r || r <= 0) return
    setSaving(true)
    const res = await logWorkoutSet({
      username,
      exercise_id: exercise.id,
      exercise_name: exercise.nombre,
      weight: isNaN(w) ? 0 : w,
      reps: r,
      routine_id: null,
    })
    setSaving(false)
    if (!res.success) return
    setWeight("")
    setReps("")
    const refreshed = await getExerciseHistory(username, exercise.id, 50)
    if (refreshed.success) setHistory(refreshed.sets as SetEntry[])
    if (res.isPR && w > 0) {
      setPr({ exerciseId: exercise.id, exerciseName: exercise.nombre, weight: w, reps: r, prevWeight: (res as any).prevWeight ?? null })
    }
  }

  async function removeSet(id: string) {
    setHistory((prev) => prev.filter((s) => s.id !== id))
    await deleteWorkoutSet(id)
  }

  if (!exercise) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-1">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exerciseThumb(exercise as Exercise) || "/placeholder.svg"}
              alt=""
              className="w-11 h-11 rounded-xl object-cover bg-toro-background shrink-0"
            />
            <DrawerTitle className="font-display text-lg text-left leading-tight">{exercise.nombre}</DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-8 space-y-4">
          {best && (
            <div className="flex items-center gap-2 rounded-xl bg-toro-accent/10 px-3 py-2">
              <Trophy className="w-4 h-4 text-toro-accent shrink-0" />
              <span className="text-sm text-toro-foreground">
                Tu récord: <span className="font-bold">{best.weight} kg</span>
                <span className="text-toro-foreground/50"> × {best.reps} reps</span>
              </span>
            </div>
          )}

          {/* Registro rápido */}
          {!readOnly && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wide text-toro-foreground/40">Kg</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  className="h-10 text-center bg-white border-black/10"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wide text-toro-foreground/40">Reps</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="0"
                  className="h-10 text-center bg-white border-black/10"
                />
              </div>
              <Button
                onClick={addSet}
                disabled={saving || !reps}
                className="h-10 bg-toro-primary hover:bg-toro-primary/90 text-white shrink-0"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </Button>
            </div>
          )}

          {/* Gráfico de progreso */}
          {chartData.length >= 2 && (
            <div>
              <h3 className="text-sm font-bold text-toro-foreground mb-1">Progreso de peso</h3>
              <div className="h-40 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}
                      formatter={(v: number) => [`${v} kg`, "Peso"]}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#FF6B6B" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historial */}
          <div>
            <h3 className="text-sm font-bold text-toro-foreground mb-1">Historial</h3>
            {loading ? (
              <div className="flex justify-center py-6">
                <Dumbbell className="animate-spin w-5 h-5 text-toro-primary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-toro-foreground/40 py-2">Todavía no registraste series.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-white rounded-xl border border-black/5 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-bold text-toro-foreground">{s.weight} kg</span>
                      <span className="text-toro-foreground/50"> × {s.reps} reps</span>
                      {s.is_pr && <Trophy className="w-3.5 h-3.5 text-toro-secondary inline ml-1.5 -mt-0.5" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-toro-foreground/40">
                        {new Date(s.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                      </span>
                      {!readOnly && (
                        <button
                          onClick={() => removeSet(s.id)}
                          aria-label="Eliminar serie"
                          className="text-toro-foreground/30 hover:text-toro-primary"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>

      {!readOnly && <PRCelebration pr={pr} username={username} onClose={() => setPr(null)} />}
    </Drawer>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GripVertical, Trash2, Plus, ChevronUp, ChevronDown, Dumbbell, Loader2 } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import ExerciseCatalog from "@/components/routine/exercise-catalog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { type Exercise, exerciseThumb } from "@/lib/exercise-catalog"
import { createRoutine, updateRoutine, type Routine, type RoutineExercise } from "@/lib/actions"

const EMOJIS = ["💪", "🔥", "🏋️", "🦵", "🏃", "🧘", "⚡", "🐂", "🎯", "🥵", "🫀", "🦍"]

type Draft = RoutineExercise & { thumb?: string }

export default function RoutineBuilder({
  username,
  initial,
}: {
  username: string
  initial?: Routine
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [emoji, setEmoji] = useState(initial?.emoji ?? "💪")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [items, setItems] = useState<Draft[]>(initial?.exercises ?? [])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedIds = items.map((i) => i.exercise_id)

  function addExercise(ex: Exercise) {
    setItems((prev) => {
      if (prev.some((i) => i.exercise_id === ex.id)) {
        return prev.filter((i) => i.exercise_id !== ex.id) // toggle off si ya estaba
      }
      return [
        ...prev,
        {
          exercise_id: ex.id,
          name: ex.nombre,
          target_sets: 3,
          target_reps: 10,
          notes: null,
          thumb: exerciseThumb(ex),
        },
      ]
    })
  }

  function patch(id: string, updates: Partial<Draft>) {
    setItems((prev) => prev.map((i) => (i.exercise_id === id ? { ...i, ...updates } : i)))
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.exercise_id !== id))
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  async function save() {
    if (!name.trim()) {
      setError("Ponele un nombre a la rutina.")
      return
    }
    if (items.length === 0) {
      setError("Agregá al menos un ejercicio.")
      return
    }
    setError(null)
    setSaving(true)
    const payload = {
      name: name.trim(),
      emoji,
      description: description.trim() || undefined,
      exercises: items.map(({ thumb, ...rest }) => rest),
    }
    const res = initial
      ? await updateRoutine(initial.id, payload)
      : await createRoutine({ username, ...payload })
    setSaving(false)
    if (!res.success) {
      setError(res.error || "No se pudo guardar.")
      return
    }
    router.push(`/mi-rutina/${initial ? initial.id : (res as any).routine.id}`)
  }

  return (
    <div className="bg-toro-background min-h-full pb-28">
      <RoutineHeader
        title={initial ? "Editar rutina" : "Nueva rutina"}
        back
        right={
          <Button
            onClick={save}
            disabled={saving}
            size="sm"
            className="bg-toro-primary hover:bg-toro-primary/90 text-white rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        }
      />

      <div className="p-4 space-y-4 max-w-xl mx-auto">
        {/* Nombre + emoji */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm space-y-3">
          <div className="flex gap-3">
            <div className="shrink-0">
              <label className="text-xs text-toro-foreground/50 block mb-1">Ícono</label>
              <div className="w-14 h-14 rounded-xl bg-toro-background flex items-center justify-center text-3xl">
                {emoji}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-toro-foreground/50 block mb-1">Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Push - Pecho y tríceps"
                className="bg-toro-background/60 border-black/10"
                maxLength={60}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-9 h-9 rounded-lg text-xl transition ${
                  emoji === e ? "bg-toro-primary/15 ring-2 ring-toro-primary" : "bg-black/5"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas de la rutina (opcional)"
            className="bg-toro-background/60 border-black/10 resize-none"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Ejercicios */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-bold text-toro-foreground">Ejercicios ({items.length})</h2>
          </div>

          {items.length === 0 ? (
            <button
              onClick={() => setCatalogOpen(true)}
              className="w-full rounded-2xl border-2 border-dashed border-toro-primary/30 bg-toro-primary/5 py-8 text-toro-primary font-medium flex flex-col items-center gap-2"
            >
              <Dumbbell className="w-8 h-8" />
              Agregá tu primer ejercicio
            </button>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.exercise_id} className="bg-white rounded-2xl border border-black/5 p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    {it.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumb || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-lg object-cover bg-toro-background shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-toro-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-5 h-5 text-toro-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-toro-foreground text-sm leading-tight truncate">{it.name}</div>
                    </div>
                    <div className="flex flex-col">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-0.5 text-toro-foreground/40 disabled:opacity-20">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-0.5 text-toro-foreground/40 disabled:opacity-20">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => remove(it.exercise_id)} className="p-1.5 text-toro-foreground/40 hover:text-toro-primary">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <NumField label="Series" value={it.target_sets} onChange={(v) => patch(it.exercise_id, { target_sets: v })} />
                    <NumField label="Reps" value={it.target_reps} onChange={(v) => patch(it.exercise_id, { target_reps: v })} />
                    <Input
                      value={it.notes ?? ""}
                      onChange={(e) => patch(it.exercise_id, { notes: e.target.value || null })}
                      placeholder="Nota"
                      className="h-9 bg-toro-background/60 border-black/10 text-sm flex-1"
                      maxLength={40}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setCatalogOpen(true)}
              className="w-full mt-2 border-dashed border-toro-primary/40 text-toro-primary bg-toro-primary/5"
            >
              <Plus className="w-5 h-5 mr-1" /> Agregar más ejercicios
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-toro-primary text-center font-medium">{error}</p>}
      </div>

      {/* Drawer del catálogo en modo selección */}
      <Drawer open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="pb-1 flex-row items-center justify-between">
            <DrawerTitle className="font-display text-xl">Elegí ejercicios</DrawerTitle>
            <Button
              size="sm"
              onClick={() => setCatalogOpen(false)}
              className="bg-toro-accent hover:bg-toro-accent/90 text-white rounded-xl"
            >
              Listo ({items.length})
            </Button>
          </DrawerHeader>
          <div className="overflow-y-auto">
            <ExerciseCatalog
              username={username}
              mode="select"
              selectedIds={selectedIds}
              onAdd={addExercise}
              suggestName={name}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-toro-foreground/50">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
        className="h-9 w-14 bg-toro-background/60 border-black/10 text-sm text-center px-1"
      />
    </div>
  )
}

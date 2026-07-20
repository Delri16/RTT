"use client"

import { useEffect, useMemo, useState } from "react"
import { Dumbbell, Trophy, Layers, Flame, ChevronDown, ChevronRight, Star } from "lucide-react"
import {
  getRoutines,
  getWorkoutStats,
  getFavoriteExercises,
  getPersonalRecords,
  type Routine,
  type FavoriteExercise,
} from "@/lib/actions"
import { loadExercises, exerciseThumb, type Exercise } from "@/lib/exercise-catalog"
import ExerciseProgressDrawer from "@/components/routine/exercise-progress-drawer"

const TABS = [
  { value: "rutinas", label: "Rutinas", icon: Layers },
  { value: "favoritos", label: "Favoritos", icon: Star },
] as const

/** Vista de solo lectura de "Mi Rutina" para el perfil de OTRO usuario: rutinas, favoritos y progreso por ejercicio. */
export default function PublicRoutineTab({ username }: { username: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("rutinas")
  const [routines, setRoutines] = useState<Routine[]>([])
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([])
  const [records, setRecords] = useState<Map<string, { weight: number; reps: number }>>(new Map())
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [stats, setStats] = useState<{ totalSets: number; totalVolume: number; prCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [active, setActive] = useState<FavoriteExercise | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      getRoutines(username),
      getFavoriteExercises(username),
      getPersonalRecords(username),
      getWorkoutStats(username),
      loadExercises(),
    ]).then(([r, favs, recs, s, all]) => {
      if (!alive) return
      setRoutines(r.routines)
      setFavorites(favs.success ? favs.favorites : [])
      if (recs.success) setRecords(new Map(recs.records.map((rec: any) => [rec.exercise_id, { weight: rec.weight, reps: rec.reps }])))
      if (s.success) setStats({ totalSets: s.totalSets, totalVolume: s.totalVolume, prCount: s.prCount })
      setCatalog(new Map(all.map((e) => [e.id, e])))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [username])

  const activeExercise = useMemo(() => {
    if (!active) return null
    const cat = catalog.get(active.exercise_id)
    return cat ?? { id: active.exercise_id, nombre: active.exercise_name, images: [] as string[] }
  }, [active, catalog])

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Dumbbell className="animate-spin w-7 h-7 text-toro-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Trophy className="w-4 h-4" />} value={stats?.prCount ?? 0} label="Récords" accent="secondary" />
        <StatCard icon={<Layers className="w-4 h-4" />} value={stats?.totalSets ?? 0} label="Series" accent="primary" />
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          value={stats ? `${Math.round(stats.totalVolume / 1000)}t` : "0t"}
          label="Volumen"
          accent="accent"
        />
      </div>

      {/* Segmentado Rutinas / Favoritos */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition ${
              tab === t.value ? "bg-white shadow-sm text-toro-primary" : "text-toro-foreground/50"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "rutinas" ? (
        routines.length === 0 ? (
          <EmptyState text="Todavía no armó ninguna rutina." />
        ) : (
          <div className="space-y-2">
            {routines.map((r) => {
              const isOpen = expanded === r.id
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-toro-background flex items-center justify-center text-xl shrink-0">
                      {r.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-toro-foreground leading-tight truncate">{r.name}</div>
                      <div className="text-xs text-toro-foreground/50">
                        {r.exercises.length} ejercicio{r.exercises.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5 text-toro-foreground/30 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-toro-foreground/30 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1.5 border-t border-black/5 pt-2">
                      {r.exercises.map((ex, i) => (
                        <div key={ex.exercise_id} className="flex items-center gap-2 text-sm">
                          <span className="w-4 text-center text-toro-foreground/30 shrink-0">{i + 1}</span>
                          <span className="flex-1 truncate text-toro-foreground/80">{ex.name}</span>
                          {ex.target_sets && ex.target_reps && (
                            <span className="shrink-0 text-xs text-toro-foreground/40">
                              {ex.target_sets}×{ex.target_reps}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : favorites.length === 0 ? (
        <EmptyState text="Todavía no marcó ningún ejercicio favorito." />
      ) : (
        <div className="space-y-2">
          {favorites.map((f) => {
            const cat = catalog.get(f.exercise_id)
            const rec = records.get(f.exercise_id)
            return (
              <button
                key={f.exercise_id}
                onClick={() => setActive(f)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-2 pr-3 shadow-sm active:scale-[0.99] transition text-left"
              >
                {cat ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exerciseThumb(cat) || "/placeholder.svg"}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-toro-background shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-toro-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-toro-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-toro-foreground leading-tight truncate">{f.exercise_name}</div>
                  <div className="text-xs text-toro-foreground/50 flex items-center gap-1">
                    {rec ? (
                      <>
                        <Trophy className="w-3 h-3 text-toro-secondary" /> {rec.weight} kg × {rec.reps}
                      </>
                    ) : (
                      "Sin registros todavía"
                    )}
                  </div>
                </div>
                <Star className="w-4 h-4 fill-toro-secondary text-toro-secondary shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      <ExerciseProgressDrawer
        exercise={activeExercise}
        username={username}
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        readOnly
      />
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  accent: "primary" | "secondary" | "accent"
}) {
  const color =
    accent === "primary" ? "text-toro-primary" : accent === "secondary" ? "text-toro-secondary" : "text-toro-accent"
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-3 shadow-sm text-center">
      <div className={`inline-flex ${color} mb-0.5`}>{icon}</div>
      <div className="text-2xl font-display text-toro-foreground leading-none">{value}</div>
      <div className="text-[11px] text-toro-foreground/50 mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 px-6 bg-white rounded-2xl border border-dashed border-black/10">
      <div className="text-3xl mb-2">🏋️</div>
      <p className="text-sm text-toro-foreground/60">{text}</p>
    </div>
  )
}

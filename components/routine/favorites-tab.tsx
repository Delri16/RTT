"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Star, Dumbbell, Trophy, Search } from "lucide-react"
import { loadExercises, exerciseThumb, type Exercise } from "@/lib/exercise-catalog"
import { getFavoriteExercises, getPersonalRecords, type FavoriteExercise } from "@/lib/actions"
import ExerciseProgressDrawer from "@/components/routine/exercise-progress-drawer"

/** Tab "Favoritos" del hub de Mi Rutina: ejercicios marcados, registro suelto y progreso. */
export default function FavoritesTab({ username }: { username: string }) {
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([])
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [records, setRecords] = useState<Map<string, { weight: number; reps: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<FavoriteExercise | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([getFavoriteExercises(username), loadExercises(), getPersonalRecords(username)]).then(
      ([favs, all, recs]) => {
        if (!alive) return
        setFavorites(favs.success ? favs.favorites : [])
        setCatalog(new Map(all.map((e) => [e.id, e])))
        if (recs.success) {
          setRecords(new Map(recs.records.map((r: any) => [r.exercise_id, { weight: r.weight, reps: r.reps }])))
        }
        setLoading(false)
      },
    )
    return () => {
      alive = false
    }
  }, [username])

  function refreshAfterClose() {
    getFavoriteExercises(username).then((res) => res.success && setFavorites(res.favorites))
    getPersonalRecords(username).then(
      (res) => res.success && setRecords(new Map(res.records.map((r: any) => [r.exercise_id, { weight: r.weight, reps: r.reps }]))),
    )
  }

  const activeExercise = useMemo(() => {
    if (!active) return null
    const cat = catalog.get(active.exercise_id)
    return cat ?? { id: active.exercise_id, nombre: active.exercise_name, images: [] as string[] }
  }, [active, catalog])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Dumbbell className="animate-spin w-7 h-7 text-toro-primary" />
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 px-6 bg-white rounded-2xl border border-dashed border-black/10">
        <div className="text-4xl mb-2">⭐</div>
        <h3 className="font-bold text-toro-foreground mb-1">Todavía no tenés favoritos</h3>
        <p className="text-sm text-toro-foreground/60 mb-4">
          Marcá ejercicios con la estrella para registrar series sin necesidad de armar una rutina.
        </p>
        <Link
          href="/mi-rutina/ejercicios"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-toro-primary bg-toro-primary/10 rounded-xl px-4 py-2"
        >
          <Search className="w-4 h-4" /> Explorar ejercicios
        </Link>
      </div>
    )
  }

  return (
    <>
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

      <ExerciseProgressDrawer
        exercise={activeExercise}
        username={username}
        open={!!active}
        onOpenChange={(v) => {
          if (!v) {
            setActive(null)
            refreshAfterClose()
          }
        }}
      />
    </>
  )
}

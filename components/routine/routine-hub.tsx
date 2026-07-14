"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Dumbbell, Trophy, ChevronRight, Search, Flame, Layers } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import { Button } from "@/components/ui/button"
import { getRoutines, getWorkoutStats, getPersonalRecords, type Routine } from "@/lib/actions"

export default function RoutineHub({ username }: { username: string }) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [stats, setStats] = useState<{ totalSets: number; totalVolume: number; prCount: number } | null>(null)
  const [records, setRecords] = useState<{ exercise_id: string; exercise_name: string; weight: number; reps: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([getRoutines(username), getWorkoutStats(username), getPersonalRecords(username)]).then(
      ([r, s, pr]) => {
        if (!active) return
        setRoutines(r.routines)
        if (s.success) setStats({ totalSets: s.totalSets, totalVolume: s.totalVolume, prCount: s.prCount })
        if (pr.success) setRecords(pr.records.slice(0, 5))
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [username])

  return (
    <div className="bg-toro-background min-h-full pb-24">
      <RoutineHeader
        title="Mi Rutina"
        right={
          <Link href="/mi-rutina/ejercicios" aria-label="Explorar ejercicios" className="p-2 rounded-xl text-toro-foreground/60 hover:bg-black/5">
            <Search className="w-5 h-5" />
          </Link>
        }
      />

      <div className="p-4 space-y-5 max-w-xl mx-auto">
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

        {/* Rutinas */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-display text-lg text-toro-foreground">Mis rutinas</h2>
            <Link href="/mi-rutina/nueva">
              <Button size="sm" className="bg-toro-primary hover:bg-toro-primary/90 text-white rounded-xl h-8">
                <Plus className="w-4 h-4 mr-1" /> Nueva
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Dumbbell className="animate-spin w-7 h-7 text-toro-primary" />
            </div>
          ) : routines.length === 0 ? (
            <EmptyRoutines />
          ) : (
            <div className="space-y-2">
              {routines.map((r) => (
                <Link
                  key={r.id}
                  href={`/mi-rutina/${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-3 shadow-sm active:scale-[0.99] transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-toro-background flex items-center justify-center text-2xl shrink-0">
                    {r.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-toro-foreground leading-tight truncate">{r.name}</div>
                    <div className="text-xs text-toro-foreground/50">
                      {r.exercises.length} ejercicio{r.exercises.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-toro-foreground/30 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Récords personales */}
        {records.length > 0 && (
          <section>
            <h2 className="font-display text-lg text-toro-foreground mb-2 px-1">Tus récords</h2>
            <div className="space-y-2">
              {records.map((rec) => (
                <div key={rec.exercise_id} className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-3 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-toro-secondary/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-toro-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-toro-foreground text-sm leading-tight truncate">{rec.exercise_name}</div>
                    <div className="text-xs text-toro-foreground/50">{rec.reps} reps</div>
                  </div>
                  <div className="shrink-0 font-display text-xl text-toro-foreground">
                    {rec.weight}
                    <span className="text-xs text-toro-foreground/40 ml-0.5">kg</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Explorar catálogo */}
        <Link
          href="/mi-rutina/ejercicios"
          className="flex items-center gap-3 bg-gradient-to-br from-toro-accent/15 to-toro-primary/10 rounded-2xl p-4 border border-black/5"
        >
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-toro-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-toro-foreground">Explorar ejercicios</div>
            <div className="text-xs text-toro-foreground/50">870 ejercicios con fotos, filtros y traducción</div>
          </div>
          <ChevronRight className="w-5 h-5 text-toro-foreground/30 shrink-0" />
        </Link>
      </div>
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

function EmptyRoutines() {
  return (
    <div className="text-center py-8 px-6 bg-white rounded-2xl border border-dashed border-black/10">
      <div className="text-4xl mb-2">🏋️</div>
      <h3 className="font-bold text-toro-foreground mb-1">Todavía no tenés rutinas</h3>
      <p className="text-sm text-toro-foreground/60 mb-4">Armá tu primera rutina eligiendo ejercicios del catálogo.</p>
      <Link href="/mi-rutina/nueva">
        <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">
          <Plus className="w-5 h-5 mr-1" /> Crear rutina
        </Button>
      </Link>
    </div>
  )
}

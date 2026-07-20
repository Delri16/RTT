"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, SlidersHorizontal, X, Dumbbell, Plus, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import ExerciseDetailDrawer from "@/components/routine/exercise-detail-drawer"
import FavoriteButton from "@/components/routine/favorite-button"
import { getFavoriteExercises } from "@/lib/actions"
import {
  type Exercise,
  type ExerciseFilters,
  type Fame,
  loadExercises,
  filterExercises,
  facetValues,
  exerciseThumb,
  tMuscle,
  tEquipment,
  tCategory,
  tForce,
  tLevel,
  tMechanic,
  FORCE_ES,
  LEVEL_ES,
  MECHANIC_ES,
} from "@/lib/exercise-catalog"

const FAME_TABS: { value: Fame; label: string; hint: string }[] = [
  { value: 1, label: "Populares", hint: "Los más usados" },
  { value: 2, label: "Comunes", hint: "+ variantes" },
  { value: 3, label: "Todos", hint: "Catálogo completo" },
]

const PAGE = 24

export default function ExerciseCatalog({
  username,
  mode = "browse",
  selectedIds,
  onAdd,
}: {
  username?: string | null
  mode?: "browse" | "select"
  selectedIds?: string[]
  onAdd?: (ex: Exercise) => void
}) {
  const [all, setAll] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [fame, setFame] = useState<Fame>(1)
  const [filters, setFilters] = useState<Omit<ExerciseFilters, "search" | "fame">>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visible, setVisible] = useState(PAGE)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const sentinel = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds])

  useEffect(() => {
    loadExercises()
      .then((data) => setAll(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!username) return
    getFavoriteExercises(username).then((res) => {
      if (res.success) setFavoriteIds(new Set(res.favorites.map((f) => f.exercise_id)))
    })
  }, [username])

  const facets = useMemo(() => (all.length ? facetValues(all) : { muscles: [], equipment: [], category: [] }), [all])

  const filtered = useMemo(
    () => filterExercises(all, { ...filters, search, fame }),
    [all, filters, search, fame],
  )

  // Reset paginado al cambiar filtros/búsqueda.
  useEffect(() => setVisible(PAGE), [search, fame, filters])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (e) => e[0].isIntersecting && setVisible((v) => v + PAGE),
      { rootMargin: "300px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length])

  const activeFilterCount =
    (filters.muscles?.length || 0) +
    (filters.equipment?.length || 0) +
    (filters.category?.length || 0) +
    (filters.force?.length || 0) +
    (filters.level?.length || 0) +
    (filters.mechanic?.length || 0)

  return (
    <div className="flex flex-col">
      {/* Búsqueda + filtros */}
      <div className="sticky top-[52px] z-10 bg-toro-background/95 backdrop-blur-md pt-2 pb-2 px-3 space-y-2 border-b border-black/5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-toro-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar (español o inglés)…"
              className="pl-9 pr-8 bg-white border-black/10 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-toro-foreground/40"
                aria-label="Limpiar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="relative shrink-0 bg-white border-black/10 rounded-xl px-3"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-toro-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Segmentado de fama */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/5 rounded-xl">
          {FAME_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFame(t.value)}
              className={`rounded-lg py-1.5 text-center transition ${
                fame === t.value ? "bg-white shadow-sm" : "text-toro-foreground/50"
              }`}
            >
              <div className={`text-sm font-bold ${fame === t.value ? "text-toro-primary" : ""}`}>{t.label}</div>
              <div className="text-[9px] text-toro-foreground/40 leading-none">{t.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-3 py-2">
        <p className="text-xs text-toro-foreground/40 mb-2">
          {loading ? "Cargando ejercicios…" : `${filtered.length} ejercicios`}
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Dumbbell className="animate-spin w-7 h-7 text-toro-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-toro-foreground/50">
            <div className="text-4xl mb-2">🔍</div>
            No encontramos ejercicios con esos filtros.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, visible).map((ex) => {
              const added = selected.has(ex.id)
              return (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-2 pr-3 shadow-sm active:scale-[0.99] transition"
                >
                  <button onClick={() => setDetail(ex)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exerciseThumb(ex) || "/placeholder.svg"}
                      alt={ex.nombre}
                      loading="lazy"
                      className="w-16 h-16 rounded-xl object-cover bg-toro-background shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-toro-foreground leading-tight truncate">{ex.nombre}</div>
                      <div className="text-xs text-toro-foreground/50 truncate">
                        {ex.primaryMuscles.map(tMuscle).join(", ")}
                      </div>
                      <div className="text-[11px] text-toro-foreground/40 truncate">{tEquipment(ex.equipment)}</div>
                    </div>
                  </button>

                  {username && (
                    <FavoriteButton
                      username={username}
                      exerciseId={ex.id}
                      exerciseName={ex.nombre}
                      favorited={favoriteIds.has(ex.id)}
                      onChange={(v) =>
                        setFavoriteIds((prev) => {
                          const next = new Set(prev)
                          v ? next.add(ex.id) : next.delete(ex.id)
                          return next
                        })
                      }
                      className="w-9 h-9"
                    />
                  )}

                  {mode === "select" && onAdd && (
                    <button
                      onClick={() => onAdd(ex)}
                      aria-label={added ? "Agregado" : "Agregar"}
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${
                        added ? "bg-toro-accent text-white" : "bg-toro-primary/10 text-toro-primary"
                      }`}
                    >
                      {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              )
            })}
            {visible < filtered.length && <div ref={sentinel} className="h-6" />}
          </div>
        )}
      </div>

      <ExerciseDetailDrawer
        exercise={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        username={username}
        onAdd={mode === "select" && onAdd ? (ex) => onAdd(ex) : undefined}
        isAdded={detail ? selected.has(detail.id) : false}
      />

      <FiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        facets={facets}
        filters={filters}
        setFilters={setFilters}
        resultCount={filtered.length}
        activeCount={activeFilterCount}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------

function FiltersDrawer({
  open,
  onOpenChange,
  facets,
  filters,
  setFilters,
  resultCount,
  activeCount,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  facets: { muscles: string[]; equipment: string[]; category: string[] }
  filters: Omit<ExerciseFilters, "search" | "fame">
  setFilters: (f: Omit<ExerciseFilters, "search" | "fame">) => void
  resultCount: number
  activeCount: number
}) {
  function toggle(key: keyof typeof filters, value: string) {
    const cur = new Set(filters[key] ?? [])
    cur.has(value) ? cur.delete(value) : cur.add(value)
    setFilters({ ...filters, [key]: [...cur] })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display text-xl">Filtros</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4 space-y-5">
          <ChipGroup
            title="Músculo"
            options={facets.muscles.map((m) => ({ value: m, label: tMuscle(m) }))}
            selected={filters.muscles ?? []}
            onToggle={(v) => toggle("muscles", v)}
          />
          <ChipGroup
            title="Equipo / máquina"
            options={facets.equipment.map((e) => ({ value: e, label: tEquipment(e) }))}
            selected={filters.equipment ?? []}
            onToggle={(v) => toggle("equipment", v)}
          />
          <ChipGroup
            title="Categoría"
            options={facets.category.map((c) => ({ value: c, label: tCategory(c) }))}
            selected={filters.category ?? []}
            onToggle={(v) => toggle("category", v)}
          />
          <ChipGroup
            title="Nivel"
            options={Object.keys(LEVEL_ES).map((l) => ({ value: l, label: tLevel(l) }))}
            selected={filters.level ?? []}
            onToggle={(v) => toggle("level", v)}
          />
          <ChipGroup
            title="Tipo de movimiento"
            options={Object.keys(MECHANIC_ES).map((m) => ({ value: m, label: tMechanic(m) }))}
            selected={filters.mechanic ?? []}
            onToggle={(v) => toggle("mechanic", v)}
          />
          <ChipGroup
            title="Fuerza"
            options={Object.keys(FORCE_ES).map((f) => ({ value: f, label: tForce(f) }))}
            selected={filters.force ?? []}
            onToggle={(v) => toggle("force", v)}
          />
        </div>
        <DrawerFooter className="flex-row gap-2 border-t border-black/5">
          <Button
            variant="outline"
            onClick={() => setFilters({})}
            disabled={activeCount === 0}
            className="flex-1 bg-transparent"
          >
            Limpiar {activeCount > 0 && `(${activeCount})`}
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white">
            Ver {resultCount}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ChipGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  const sel = new Set(selected)
  return (
    <div>
      <h3 className="text-sm font-bold text-toro-foreground mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = sel.has(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`text-sm rounded-full px-3 py-1.5 border transition active:scale-95 ${
                active
                  ? "bg-toro-primary text-white border-toro-primary"
                  : "bg-white text-toro-foreground/70 border-black/10"
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

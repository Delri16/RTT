"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import {
  SPORT_CATEGORY_LABEL,
  SPORT_CATEGORY_ORDER,
  searchSportIcons,
  type SportCategory,
  type SportIcon,
} from "@/lib/sport-icons"

interface SportIconPickerProps {
  value: string | null
  onChange: (id: string | null) => void
  /** Muestra el botón "Sin ícono" para poder dejarlo vacío. */
  allowNone?: boolean
  /** Versión chiquita (para el formulario de edición dentro de la lista). */
  compact?: boolean
}

/**
 * Grilla de deportes (emoji) agrupada por categoría, con buscador.
 * Es solo informativo: el ícono elegido no cambia puntos ni nada del cálculo.
 */
export default function SportIconPicker({ value, onChange, allowNone = true, compact = false }: SportIconPickerProps) {
  const [query, setQuery] = useState("")

  const grouped = useMemo(() => {
    const matches = searchSportIcons(query)
    const map = new Map<SportCategory, SportIcon[]>()
    for (const sport of matches) {
      const list = map.get(sport.category)
      if (list) list.push(sport)
      else map.set(sport.category, [sport])
    }
    return SPORT_CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, sports: map.get(c)! }))
  }, [query])

  const emojiSize = compact ? "text-xl" : "text-2xl"

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-toro-foreground/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar deporte..."
          className={`pl-9 ${compact ? "h-9 text-sm" : ""}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-toro-foreground/40"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${
            value === null
              ? "border-toro-primary bg-toro-primary/10 text-toro-primary font-semibold"
              : "border-gray-200 text-toro-foreground/60 hover:bg-gray-50"
          }`}
        >
          Sin ícono
        </button>
      )}

      {grouped.length === 0 ? (
        <p className="text-sm text-toro-foreground/50 text-center py-4">No encontramos ese deporte</p>
      ) : (
        <div
          className={`space-y-3 overflow-y-auto overscroll-contain rounded-lg bg-toro-background/40 p-2 ${
            compact ? "max-h-64" : "max-h-72"
          }`}
        >
          {grouped.map(({ category, sports }) => (
            <div key={category}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-toro-foreground/40 mb-1.5">
                {SPORT_CATEGORY_LABEL[category]}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {sports.map((sport) => {
                  const selected = value === sport.id
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => onChange(selected ? null : sport.id)}
                      title={sport.label}
                      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border py-2 px-1 transition-all ${
                        selected
                          ? "border-toro-primary bg-toro-primary/10 ring-2 ring-toro-primary"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`${emojiSize} leading-none`}>{sport.emoji}</span>
                      <span className="text-[10px] leading-tight text-center text-toro-foreground/70 line-clamp-2">
                        {sport.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

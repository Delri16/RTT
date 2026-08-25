"use client"

import { getRank, type Rank } from "@/lib/global-points"

/**
 * Chip del rango (Ternero / Novillo / Toro / Toro de Oro).
 *
 * El rango es una función pura de los puntos del período que se está mirando
 * (ver lib/global-points.ts): no hay ascenso/descenso guardado en la DB.
 */
export default function RankBadge({
  points,
  rank,
  size = "md",
  showEmoji = true,
  className = "",
}: {
  /** Puntos del período. Se ignora si se pasa `rank` directo. */
  points?: number
  rank?: Rank
  size?: "sm" | "md" | "lg"
  showEmoji?: boolean
  className?: string
}) {
  const r = rank ?? getRank(points ?? 0)

  const sizeClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : size === "lg"
        ? "text-sm px-3.5 py-1.5 gap-1.5"
        : "text-xs px-2.5 py-1 gap-1"

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ring-1 ${r.bg} ${r.text} ${r.ring} ${sizeClass} ${className}`}
    >
      {showEmoji && <span className="leading-none">{r.emoji}</span>}
      {r.label}
    </span>
  )
}

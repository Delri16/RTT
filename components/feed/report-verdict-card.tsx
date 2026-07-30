"use client"

import { ArrowDown, ArrowUp, Minus, PartyPopper, Skull, Scale } from "lucide-react"
import { formatKg, type ReportVerdict, type VerdictLevel } from "@/lib/report-verdict"

// Cartel del veredicto del reporte: verde si cumplió el objetivo, amarillo si
// quedó a mitad de camino, rojo si fue para el lado contrario. La idea es que se
// vea de lejos, así que va color de fondo, borde grueso y el delta en grande.

const STYLES: Record<
  VerdictLevel,
  { wrap: string; badge: string; headline: string; delta: string; icon: string; message: string }
> = {
  green: {
    wrap: "bg-emerald-50 border-toro-accent",
    badge: "bg-toro-accent/20 text-emerald-700",
    headline: "text-emerald-700",
    delta: "text-emerald-600",
    icon: "bg-toro-accent text-white",
    message: "text-emerald-800",
  },
  yellow: {
    wrap: "bg-amber-50 border-amber-400",
    badge: "bg-amber-400/25 text-amber-800",
    headline: "text-amber-700",
    delta: "text-amber-600",
    icon: "bg-amber-400 text-white",
    message: "text-amber-800",
  },
  red: {
    wrap: "bg-red-50 border-red-400",
    badge: "bg-red-400/20 text-red-700",
    headline: "text-red-700",
    delta: "text-red-600",
    icon: "bg-red-500 text-white",
    message: "text-red-800",
  },
  neutral: {
    wrap: "bg-toro-background border-black/10",
    badge: "bg-black/5 text-toro-foreground/60",
    headline: "text-toro-foreground/80",
    delta: "text-toro-foreground/70",
    icon: "bg-white text-toro-foreground/60 shadow-sm",
    message: "text-toro-foreground/70",
  },
}

const GOAL_TEXT: Record<string, string> = {
  lose: "Objetivo: BAJAR de peso",
  gain: "Objetivo: SUBIR de peso",
  maintain: "Objetivo: MANTENERSE",
}

/** Borde del post entero, para que el veredicto se note ya desde el scroll. */
export const VERDICT_RING: Record<VerdictLevel, string> = {
  green: "border-toro-accent/40",
  yellow: "border-amber-400/50",
  red: "border-red-400/50",
  neutral: "border-black/5",
}

export default function ReportVerdictCard({ verdict: v, weight }: { verdict: ReportVerdict; weight: number }) {
  const s = STYLES[v.level]
  const strong = v.intensity === 3
  const Icon =
    v.level === "green" ? PartyPopper : v.level === "red" ? Skull : v.level === "yellow" ? Minus : Scale
  const DeltaArrow = v.delta == null || v.delta === 0 ? Minus : v.delta > 0 ? ArrowUp : ArrowDown

  return (
    <div
      className={`mx-4 mb-3 rounded-2xl border-2 p-3 animate-pop ${s.wrap} ${
        strong ? "border-[3px] shadow-soft-lg" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.icon} ${
            strong ? "animate-pulse-soft" : ""
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}
          >
            {GOAL_TEXT[v.goal]}
          </span>
          <p className={`font-display text-lg leading-tight mt-1 ${s.headline}`}>
            {v.headline} {v.emoji}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className={`font-display leading-none flex items-center gap-0.5 ${s.delta} ${strong ? "text-3xl" : "text-2xl"}`}>
            <DeltaArrow className={strong ? "w-6 h-6" : "w-5 h-5"} />
            {v.delta == null ? `${formatKg(weight)} kg` : v.deltaLabel}
          </div>
          <div className="text-[10px] text-toro-foreground/50 mt-1">
            {v.prevWeight != null ? `antes ${formatKg(v.prevWeight)} kg` : "sin reporte previo"}
          </div>
        </div>
      </div>

      <p className={`mt-2.5 text-sm font-semibold leading-snug ${s.message}`}>{v.message}</p>
    </div>
  )
}

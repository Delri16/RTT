"use client"

import UserAvatar from "@/components/user-avatar"
import { formatPoints, type GlobalRankingRow } from "@/lib/global-points"

/**
 * Podio del top 3 del ranking global.
 *
 * Se dibuja en orden visual 2 - 1 - 3 (el primero al medio y más alto), que es
 * como se lee un podio de verdad. En pantallas de 375px entra justo: cada
 * columna es 1fr y los pedestales tienen alturas fijas.
 */

const STEPS = [
  {
    // 2º — plata
    height: "h-16",
    gradient: "from-slate-200 via-slate-300 to-slate-400",
    ring: "ring-slate-300",
    medal: "🥈",
    glow: "",
  },
  {
    // 1º — oro
    height: "h-24",
    gradient: "from-yellow-300 via-amber-400 to-yellow-500",
    ring: "ring-yellow-400",
    medal: "🥇",
    glow: "shadow-[0_8px_28px_-6px_rgba(250,204,21,0.55)]",
  },
  {
    // 3º — bronce
    height: "h-12",
    gradient: "from-amber-500 via-amber-600 to-amber-700",
    ring: "ring-amber-500",
    medal: "🥉",
    glow: "",
  },
]

export default function GlobalPodium({
  rows,
  viewer,
  onSelect,
}: {
  rows: GlobalRankingRow[]
  viewer?: string | null
  onSelect?: (row: GlobalRankingRow) => void
}) {
  const first = rows[0]
  const second = rows[1]
  const third = rows[2]

  // Orden visual: 2 - 1 - 3. Se filtran los huecos para grupos de 1 o 2 personas.
  const slots = [
    { row: second, step: STEPS[0], place: 2 },
    { row: first, step: STEPS[1], place: 1 },
    { row: third, step: STEPS[2], place: 3 },
  ].filter((s) => s.row)

  if (!first) return null

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-toro-secondary/25 via-toro-background to-toro-background border border-black/5 shadow-soft px-3 pt-6 pb-0">
      {/* Resplandor detrás del primer puesto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-16 rounded-full bg-toro-secondary/40 blur-3xl"
      />

      <div className="relative flex items-end justify-center gap-2">
        {slots.map(({ row, step, place }, i) => {
          const isViewer = viewer && row!.username === viewer
          return (
            <button
              key={row!.username}
              onClick={() => onSelect?.(row!)}
              className="flex-1 min-w-0 flex flex-col items-center gap-1.5 group animate-fade-in-up"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {/* Corona sobre el campeón */}
              {place === 1 && <span className="text-xl leading-none animate-float">👑</span>}

              <div className={`relative rounded-full ring-4 ${step.ring} ${step.glow} transition group-active:scale-95`}>
                <UserAvatar
                  avatarId={row!.avatar || "default"}
                  username={row!.username}
                  size={place === 1 ? "lg" : "md"}
                  showTooltip={false}
                />
                <span className="absolute -bottom-1 -right-1 text-sm leading-none drop-shadow">{step.medal}</span>
              </div>

              <div className="w-full min-w-0 text-center">
                <p
                  className={`truncate text-xs font-bold leading-tight ${
                    isViewer ? "text-toro-primary" : "text-toro-foreground"
                  }`}
                >
                  {row!.username}
                </p>
                <p className="text-[11px] font-semibold text-toro-foreground/50 tabular-nums">
                  {formatPoints(row!.globalPoints)}
                </p>
              </div>

              {/* Pedestal */}
              <div
                className={`w-full ${step.height} rounded-t-xl bg-gradient-to-b ${step.gradient} flex items-start justify-center pt-1.5 shadow-inner`}
              >
                <span className="font-display text-lg text-white/90 drop-shadow-sm leading-none">{place}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Trophy } from "lucide-react"
import { getUserStreak, getGlobalRanking } from "@/lib/actions"
import { EMPTY_STREAK, streakEmoji, streakMessage, WEEK_DAY_LABELS, type StreakInfo } from "@/lib/streaks"
import { formatPoints, getRank, type GlobalRankingRow } from "@/lib/global-points"

/**
 * Tira que va arriba del feed: racha de días, semana en curso y posición en el
 * ranking global. Es además el acceso a /ranking (la app no tiene lugar en la
 * barra de abajo, que se dejó igual a propósito).
 *
 * No bloquea el feed: mientras carga no ocupa espacio, y aparece con una
 * animación de entrada cuando llegan los datos.
 */
export default function StreakStrip({ username }: { username: string }) {
  const [streak, setStreak] = useState<StreakInfo>(EMPTY_STREAK)
  const [me, setMe] = useState<GlobalRankingRow | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getUserStreak(username), getGlobalRanking("month", username)]).then(([s, r]) => {
      if (!active) return
      setStreak(s.streak)
      setMe(r.viewerRow)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [username])

  if (!ready) return null

  const rank = me ? getRank(me.globalPoints) : null

  return (
    <Link
      href="/ranking"
      className="block rounded-2xl bg-white border border-black/5 shadow-soft overflow-hidden card-interactive animate-fade-in-down"
    >
      {/* Fila 1: racha */}
      <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5">
        <span
          className={`text-2xl leading-none shrink-0 ${streak.atRisk ? "animate-pulse-soft" : ""}`}
          aria-hidden="true"
        >
          {streakEmoji(streak)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-toro-foreground leading-tight">
            {streak.current > 0 ? (
              <>
                Racha de <span className="tabular-nums">{streak.current}</span> día
                {streak.current === 1 ? "" : "s"}
              </>
            ) : (
              "Sin racha activa"
            )}
          </p>
          <p className="text-[11px] text-toro-foreground/55 truncate">{streakMessage(streak)}</p>
        </div>

        {/* Semana en curso: un punto por día, lunes a domingo */}
        <div className="flex items-end gap-1 shrink-0" aria-label={`${streak.daysThisWeek} de 7 días esta semana`}>
          {streak.weekDays.map((done, i) => {
            const isToday = i === streak.todayIndex
            const isFuture = i > streak.todayIndex
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`w-4 h-4 rounded-full transition ${
                    done
                      ? "bg-toro-accent"
                      : isFuture
                        ? "bg-black/5"
                        : "bg-black/10"
                  } ${isToday ? "ring-2 ring-toro-primary ring-offset-1" : ""}`}
                />
                <span
                  className={`text-[8px] leading-none font-bold ${
                    isToday ? "text-toro-primary" : "text-toro-foreground/30"
                  }`}
                >
                  {WEEK_DAY_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fila 2: posición global */}
      <div className="flex items-center gap-2 border-t border-black/5 bg-toro-background/50 px-3.5 py-2">
        <Trophy className="w-3.5 h-3.5 text-toro-secondary shrink-0" />
        {me && rank ? (
          <p className="text-xs text-toro-foreground/70 min-w-0 flex-1 truncate">
            Vas <strong className="text-toro-foreground">#{me.position}</strong> en el ranking global del mes ·{" "}
            <span className="tabular-nums">{formatPoints(me.globalPoints)}</span> pts ·{" "}
            <span className={rank.text}>
              {rank.emoji} {rank.label}
            </span>
          </p>
        ) : (
          <p className="text-xs text-toro-foreground/70 min-w-0 flex-1 truncate">
            Todavía no entraste al ranking global de este mes
          </p>
        )}
        <ChevronRight className="w-4 h-4 text-toro-foreground/30 shrink-0" />
      </div>
    </Link>
  )
}

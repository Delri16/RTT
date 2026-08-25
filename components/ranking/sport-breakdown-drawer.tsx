"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Dumbbell, ChevronRight, Flame } from "lucide-react"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import UserAvatar from "@/components/user-avatar"
import RankBadge from "@/components/ranking/rank-badge"
import { getGlobalSportBreakdown, getUserStreak } from "@/lib/actions"
import {
  formatPoints,
  positionLabel,
  type GlobalRankingRow,
  type SportBreakdownRow,
} from "@/lib/global-points"
import type { RankingPeriod } from "@/lib/date-utils"
import { EMPTY_STREAK, type StreakInfo } from "@/lib/streaks"

/**
 * Detalle de una persona del ranking global: de qué deportes salieron sus
 * puntos, con una barra por deporte proporcional al aporte.
 */
export default function SportBreakdownDrawer({
  row,
  period,
  periodLabel,
  onOpenChange,
}: {
  row: GlobalRankingRow | null
  period: RankingPeriod
  periodLabel: string
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<SportBreakdownRow[]>([])
  const [streak, setStreak] = useState<StreakInfo>(EMPTY_STREAK)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!row) return
    let active = true
    setLoading(true)
    setRows([])
    Promise.all([getGlobalSportBreakdown(row.username, period), getUserStreak(row.username)]).then(
      ([breakdown, streakRes]) => {
        if (!active) return
        if (breakdown.success) setRows(breakdown.rows)
        setStreak(streakRes.streak)
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [row, period])

  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.totalPoints)) : 0

  return (
    <Drawer open={!!row} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {row && (
          <div className="overflow-y-auto scrollbar-slim px-4 pb-8">
            {/* Cabecera */}
            <div className="flex items-center gap-3 pt-4 pb-4">
              <UserAvatar avatarId={row.avatar || "default"} username={row.username} size="lg" showTooltip={false} />
              <div className="min-w-0 flex-1">
                <DrawerTitle className="font-display text-xl text-toro-foreground leading-tight truncate">
                  {row.username}
                </DrawerTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <RankBadge points={row.globalPoints} size="sm" />
                  <span className="text-xs text-toro-foreground/50">{periodLabel}</span>
                </div>
              </div>
              <Link
                href={`/profile/${row.username}`}
                className="shrink-0 p-2 rounded-xl text-toro-foreground/40 hover:bg-black/5 active:scale-95 transition"
                aria-label={`Ver perfil de ${row.username}`}
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Números gruesos */}
            <div className="grid grid-cols-4 gap-1.5 mb-5">
              <MiniStat value={positionLabel(row.position)} label="Puesto" />
              <MiniStat value={formatPoints(row.globalPoints)} label="Puntos" accent />
              <MiniStat value={String(row.activities)} label="Actividades" />
              <MiniStat
                value={streak.current > 0 ? `${streak.current}` : "—"}
                label="Racha"
                icon={streak.current > 0 ? <Flame className="w-3 h-3" /> : undefined}
              />
            </div>

            {/* Desglose por deporte */}
            <h3 className="font-display text-base text-toro-foreground mb-2">De dónde salen los puntos</h3>

            {loading ? (
              <div className="flex justify-center py-10">
                <Dumbbell className="animate-spin w-6 h-6 text-toro-primary/70" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-toro-foreground/50 py-6 text-center">
                Sin actividades con deporte asignado en este período.
              </p>
            ) : (
              <div className="space-y-2 stagger">
                {rows.map((s) => (
                  <div key={s.relationId} className="bg-white rounded-xl border border-black/5 p-3 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xl leading-none shrink-0">{s.icon || "🏅"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-toro-foreground leading-tight truncate">{s.name}</p>
                        <p className="text-[11px] text-toro-foreground/50 tabular-nums">
                          {s.activities} × {s.unitPoints} pts
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-lg text-toro-foreground tabular-nums">
                        {formatPoints(s.totalPoints)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-toro-primary to-toro-accent transition-all duration-500"
                        style={{ width: `${max > 0 ? Math.max(6, (s.totalPoints / max) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function MiniStat({
  value,
  label,
  accent,
  icon,
}: {
  value: string
  label: string
  accent?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-toro-background p-2 text-center">
      <div
        className={`font-display text-lg leading-none tabular-nums flex items-center justify-center gap-0.5 ${
          accent ? "text-toro-primary" : "text-toro-foreground"
        }`}
      >
        {icon}
        {value}
      </div>
      <div className="text-[10px] text-toro-foreground/50 mt-1">{label}</div>
    </div>
  )
}

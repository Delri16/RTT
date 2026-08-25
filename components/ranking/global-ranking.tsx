"use client"

import { useEffect, useMemo, useState } from "react"
import { Globe, Flame, Info, TrendingUp, Trophy } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import UserAvatar from "@/components/user-avatar"
import RankBadge from "@/components/ranking/rank-badge"
import GlobalPodium from "@/components/ranking/global-podium"
import SportBreakdownDrawer from "@/components/ranking/sport-breakdown-drawer"
import { ListSkeleton } from "@/components/ui/skeletons"
import { getGlobalRanking, getUserStreak } from "@/lib/actions"
import {
  formatPoints,
  getRank,
  getNextRank,
  pointsToNextRank,
  rankProgress,
  GLOBAL_PERIODS,
  GLOBAL_PERIOD_LABEL,
  type GlobalRankingRow,
} from "@/lib/global-points"
import type { RankingPeriod } from "@/lib/date-utils"
import { EMPTY_STREAK, streakEmoji, streakMessage, type StreakInfo } from "@/lib/streaks"

/**
 * Ranking global entre todos los grupos.
 *
 * Los puntos que se muestran acá NO son los del grupo: son los globales, que
 * salen de activity_relations.global_points y valen lo mismo para todos (ver
 * lib/global-points.ts). El ranking de cada grupo sigue intacto en su pestaña.
 */
export default function GlobalRanking({ username }: { username: string }) {
  const [period, setPeriod] = useState<RankingPeriod>("month")
  const [rows, setRows] = useState<GlobalRankingRow[]>([])
  const [streak, setStreak] = useState<StreakInfo>(EMPTY_STREAK)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GlobalRankingRow | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getGlobalRanking(period, username).then((res) => {
      if (!active) return
      setRows(res.rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [period, username])

  // La racha no depende del período: se carga una sola vez.
  useEffect(() => {
    let active = true
    getUserStreak(username).then((res) => {
      if (active) setStreak(res.streak)
    })
    return () => {
      active = false
    }
  }, [username])

  const me = useMemo(() => rows.find((r) => r.username === username) ?? null, [rows, username])
  const rest = rows.slice(3)

  return (
    <div className="bg-toro-background min-h-full pb-24">
      <RoutineHeader title="Ranking Global" subtitle="Todos los grupos, una sola tabla" />

      <div className="p-4 space-y-5 max-w-xl mx-auto">
        {/* Selector de período */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/5 rounded-xl">
          {GLOBAL_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg py-2 text-xs font-bold transition ${
                period === p ? "bg-white shadow-sm text-toro-primary" : "text-toro-foreground/50 hover:bg-white/40"
              }`}
            >
              {GLOBAL_PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-44 rounded-3xl skeleton-shimmer" />
            <ListSkeleton count={5} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Tu situación */}
            {me && <MyCard row={me} total={rows.length} streak={streak} onOpen={() => setSelected(me)} />}

            {/* Podio */}
            <GlobalPodium rows={rows} viewer={username} onSelect={setSelected} />

            {/* Resto de la tabla */}
            {rest.length > 0 && (
              <section>
                <h2 className="font-display text-lg text-toro-foreground mb-2 px-1">La tabla</h2>
                <div className="space-y-1.5 stagger">
                  {rest.map((row) => (
                    <Row
                      key={row.username}
                      row={row}
                      isViewer={row.username === username}
                      onSelect={() => setSelected(row)}
                    />
                  ))}
                </div>
              </section>
            )}

            <HowItWorks />
          </>
        )}
      </div>

      <SportBreakdownDrawer
        row={selected}
        period={period}
        periodLabel={GLOBAL_PERIOD_LABEL[period]}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  )
}

/** Tarjeta grande con la situación de quien mira: rango, puntos y cuánto falta. */
function MyCard({
  row,
  total,
  streak,
  onOpen,
}: {
  row: GlobalRankingRow
  /** Cuánta gente hay en la tabla, para leer "#2 de 9". */
  total: number
  streak: StreakInfo
  onOpen: () => void
}) {
  const rank = getRank(row.globalPoints)
  const next = getNextRank(row.globalPoints)
  const falta = pointsToNextRank(row.globalPoints)
  const progress = rankProgress(row.globalPoints)

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-3xl overflow-hidden shadow-soft border border-black/5 card-interactive animate-scale-in"
    >
      <div className={`bg-gradient-to-br ${rank.gradient} px-4 pt-4 pb-5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">Tu posición global</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-4xl leading-none drop-shadow-sm tabular-nums">#{row.position}</span>
              <span className="text-sm font-semibold text-white/85 tabular-nums">de {total}</span>
            </div>
            <p className="text-[11px] text-white/70 mt-1 tabular-nums">
              {row.activities} actividades · {row.sports} deporte{row.sports === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-3xl leading-none drop-shadow-sm tabular-nums">
              {formatPoints(row.globalPoints)}
            </div>
            <div className="text-[11px] font-semibold text-white/75 uppercase tracking-wide">puntos</div>
          </div>
        </div>

        {/* Progreso al próximo rango */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
            <span className="flex items-center gap-1">
              <span>{rank.emoji}</span> {rank.label}
            </span>
            {next ? (
              <span className="text-white/80">
                {formatPoints(falta ?? 0)} para {next.label} {next.emoji}
              </span>
            ) : (
              <span className="text-white/80">Rango máximo 👑</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pie: racha */}
      <div className="bg-white px-4 py-3 flex items-center gap-2.5">
        <span className="text-xl leading-none shrink-0">{streakEmoji(streak)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-toro-foreground leading-tight">
            {streak.current > 0 ? `${streak.current} día${streak.current === 1 ? "" : "s"} de racha` : "Sin racha"}
          </p>
          <p className="text-[11px] text-toro-foreground/55 truncate">{streakMessage(streak)}</p>
        </div>
        {streak.longest > 0 && (
          <div className="shrink-0 text-right">
            <div className="font-display text-base text-toro-foreground/70 tabular-nums leading-none">
              {streak.longest}
            </div>
            <div className="text-[10px] text-toro-foreground/40">récord</div>
          </div>
        )}
      </div>
    </button>
  )
}

function Row({
  row,
  isViewer,
  onSelect,
}: {
  row: GlobalRankingRow
  isViewer: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-2xl border p-2.5 text-left transition active:scale-[0.99] ${
        isViewer
          ? "bg-toro-primary/5 border-toro-primary/30 ring-1 ring-toro-primary/20"
          : "bg-white border-black/5 shadow-sm hover:shadow-soft"
      }`}
    >
      <span className="w-7 shrink-0 text-center font-display text-base text-toro-foreground/40 tabular-nums">
        {row.position}
      </span>
      <UserAvatar avatarId={row.avatar || "default"} username={row.username} size="sm" showTooltip={false} />
      <div className="min-w-0 flex-1">
        <p
          className={`font-bold text-sm leading-tight truncate ${
            isViewer ? "text-toro-primary" : "text-toro-foreground"
          }`}
        >
          {row.username}
          {isViewer && <span className="ml-1.5 text-[10px] font-semibold text-toro-primary/60">vos</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <RankBadge points={row.globalPoints} size="sm" showEmoji={false} />
          <span className="text-[11px] text-toro-foreground/45 tabular-nums">
            {row.activities} act · {row.sports} dep
          </span>
        </div>
      </div>
      <span className="shrink-0 font-display text-lg text-toro-foreground tabular-nums">
        {formatPoints(row.globalPoints)}
      </span>
    </button>
  )
}

function HowItWorks() {
  return (
    <details className="group bg-white/60 rounded-2xl border border-black/5 overflow-hidden">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-sm font-semibold text-toro-foreground/70">
        <Info className="w-4 h-4 shrink-0 text-toro-accent" />
        ¿Cómo se calculan estos puntos?
        <span className="ml-auto text-toro-foreground/30 transition group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-toro-foreground/65 space-y-2">
        <p>
          Los puntos de tus grupos los define cada admin, así que no se pueden comparar entre grupos: la misma actividad
          puede valer 50 en uno y 100 en otro.
        </p>
        <p>
          Acá cada <strong>deporte</strong> vale lo mismo para todos, sin importar de qué grupo venga. El gimnasio es el
          que más suma (100), y el resto baja según cuánto exige una sesión típica.
        </p>
        <p className="flex items-start gap-1.5 text-toro-foreground/50">
          <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
          Los puntos de tus grupos y los rodeos no cambiaron: esta es una tabla aparte.
        </p>
      </div>
    </details>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <div className="relative inline-block mb-4">
        <Globe className="w-14 h-14 text-toro-primary/25" />
        <Trophy className="w-6 h-6 text-toro-secondary absolute -bottom-1 -right-1" />
      </div>
      <h2 className="text-xl font-display text-toro-foreground mb-2">Todavía no hay ranking</h2>
      <p className="text-toro-foreground/60 text-sm max-w-xs mx-auto">
        Registrá actividades que tengan un deporte asignado y vas a aparecer acá, compitiendo contra todos los grupos.
      </p>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Camera, Layers, Scale, TrendingDown, TrendingUp, Users, Minus, LineChart } from "lucide-react"
import UserAvatar from "@/components/user-avatar"
import ReportHistoryDrawer from "@/components/feed/report-history-drawer"
import { ListSkeleton } from "@/components/ui/skeletons"
import { getGroupReportsOverview, type GroupMemberReportState, type GroupReportRow } from "@/lib/actions"
import { getReportVerdict, formatKg, type VerdictLevel } from "@/lib/report-verdict"
import { REPORT_INTERVAL_DAYS } from "@/lib/date-utils"

/**
 * Pestaña "Reportes" dentro de un grupo: el estado de peso de todo el grupo.
 *
 * Es solo lectura, igual que el calendario. Para reportar se sigue yendo a
 * /reports/create — acá no se crea nada.
 *
 * Dos vistas:
 *  - Por persona: en qué anda cada miembro y a quién le toca reportar.
 *  - Historial: todos los reportes del grupo, del más nuevo al más viejo.
 */

const TABS = [
  { value: "personas", label: "Por persona", icon: Users },
  { value: "historial", label: "Historial", icon: Layers },
] as const

// Mismos colores que el veredicto del feed (lib/report-verdict.ts).
const LEVEL_TEXT: Record<VerdictLevel, string> = {
  green: "text-toro-accent",
  yellow: "text-yellow-600",
  red: "text-toro-primary",
  neutral: "text-toro-foreground/40",
}
const LEVEL_BG: Record<VerdictLevel, string> = {
  green: "bg-toro-accent/10",
  yellow: "bg-toro-secondary/25",
  red: "bg-toro-primary/10",
  neutral: "bg-black/5",
}

export default function GroupReportsTab({ groupId }: { groupId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("personas")
  const [rows, setRows] = useState<GroupReportRow[]>([])
  const [states, setStates] = useState<GroupMemberReportState[]>([])
  const [loading, setLoading] = useState(true)
  const [openFor, setOpenFor] = useState<{ username: string; goal: string | null } | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getGroupReportsOverview(groupId).then((res) => {
      if (!active) return
      setRows(res.rows)
      setStates(res.states)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [groupId])

  const resumen = useMemo(() => {
    const alDia = states.filter((s) => !s.needsReport).length
    const pendientes = states.length - alDia
    const cambios = states.map((s) => s.totalChange).filter((c): c is number => c != null)
    const cambioTotal = cambios.reduce((a, b) => a + b, 0)
    return { alDia, pendientes, total: states.length, cambioTotal, conHistorial: cambios.length }
  }, [states])

  if (loading) return <ListSkeleton count={5} />

  if (states.length === 0) {
    return <p className="text-center text-toro-foreground/50 py-10">Este grupo todavía no tiene miembros.</p>
  }

  return (
    <div className="space-y-4">
      {/* Resumen del grupo */}
      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${resumen.alDia}/${resumen.total}`} label="Al día" tone={resumen.pendientes === 0 ? "good" : "flat"} />
        <Stat value={String(rows.length)} label={rows.length === 1 ? "Reporte" : "Reportes"} tone="flat" />
        <Stat
          value={resumen.conHistorial > 0 ? signedKg(resumen.cambioTotal) : "—"}
          label="Cambio del grupo"
          tone={resumen.cambioTotal < 0 ? "good" : resumen.cambioTotal > 0 ? "bad" : "flat"}
        />
      </div>

      {/* Segmentado */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition ${
              tab === t.value ? "bg-white shadow-sm text-toro-primary" : "text-toro-foreground/50"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "personas" ? (
        <div className="space-y-2 stagger">
          {states.map((s) => (
            <PersonCard key={s.username} state={s} onOpen={() => setOpenFor({ username: s.username, goal: s.goal })} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyHistory />
      ) : (
        <div className="space-y-2 stagger">
          {rows.map((r) => (
            <HistoryRow key={r.id} row={r} onOpen={() => setOpenFor({ username: r.username, goal: r.goal })} />
          ))}
        </div>
      )}

      {/* Reusa el drawer de evolución del feed: gráfico + lista de esa persona */}
      <ReportHistoryDrawer
        username={openFor?.username ?? ""}
        goal={openFor?.goal ?? null}
        open={!!openFor}
        onOpenChange={(v) => !v && setOpenFor(null)}
      />
    </div>
  )
}

function PersonCard({ state, onOpen }: { state: GroupMemberReportState; onOpen: () => void }) {
  const verdict = state.last
    ? getReportVerdict({
        weight: state.last.weight,
        prevWeight: state.last.prevWeight,
        goal: state.goal,
        seed: state.last.id,
      })
    : null

  const delta = state.last && state.last.prevWeight != null ? state.last.weight - state.last.prevWeight : null

  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-3 shadow-sm active:scale-[0.99] transition"
    >
      <UserAvatar avatarId={state.avatar || "default"} username={state.username} size="md" showTooltip={false} />

      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm text-toro-foreground leading-tight truncate">{state.username}</p>
        {state.last ? (
          <p className="text-[11px] text-toro-foreground/50">
            {state.count} reporte{state.count === 1 ? "" : "s"} ·{" "}
            {state.daysSince === 0 ? "hoy" : `hace ${state.daysSince} d`}
          </p>
        ) : (
          <p className="text-[11px] text-toro-foreground/50">Todavía no reportó</p>
        )}
        {state.needsReport && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-toro-primary/10 text-toro-primary text-[10px] font-bold px-2 py-0.5">
            <AlertCircle className="w-3 h-3" />
            {state.daysSince === null ? "Sin reportes" : `Le toca hace ${state.daysSince - REPORT_INTERVAL_DAYS} d`}
          </span>
        )}
      </div>

      <div className="shrink-0 text-right">
        {state.last ? (
          <>
            <div className="font-display text-xl text-toro-foreground leading-none tabular-nums">
              {formatKg(state.last.weight)}
              <span className="text-[11px] text-toro-foreground/40 ml-0.5">kg</span>
            </div>
            {delta != null && verdict ? (
              <span
                className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${LEVEL_BG[verdict.level]} ${LEVEL_TEXT[verdict.level]}`}
              >
                <DeltaIcon delta={delta} />
                {signedKg(delta)}
              </span>
            ) : (
              <span className="mt-1 block text-[10px] text-toro-foreground/40">primer reporte</span>
            )}
          </>
        ) : (
          <Scale className="w-6 h-6 text-toro-foreground/15" />
        )}
      </div>
    </button>
  )
}

function HistoryRow({ row, onOpen }: { row: GroupReportRow; onOpen: () => void }) {
  const verdict = getReportVerdict({
    weight: row.weight,
    prevWeight: row.prevWeight,
    goal: row.goal,
    seed: row.id,
  })
  const delta = row.prevWeight != null ? row.weight - row.prevWeight : null
  const photos = [row.bodyPhotoUrl, row.scalePhotoUrl].filter(Boolean) as string[]

  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-2.5 shadow-sm active:scale-[0.99] transition"
    >
      <UserAvatar avatarId={row.avatar || "default"} username={row.username} size="sm" showTooltip={false} />

      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm text-toro-foreground leading-tight truncate">{row.username}</p>
        <p className="text-[11px] text-toro-foreground/50 tabular-nums">
          {new Date(`${row.reportDate}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </p>
      </div>

      {photos.length > 0 && (
        <div className="shrink-0 flex -space-x-2">
          {photos.slice(0, 2).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url || "/placeholder.svg"}
              alt=""
              className="w-8 h-8 rounded-lg object-cover border-2 border-white bg-toro-background"
            />
          ))}
        </div>
      )}

      <div className="shrink-0 text-right w-[70px]">
        <div className="font-display text-base text-toro-foreground leading-none tabular-nums">
          {formatKg(row.weight)}
          <span className="text-[10px] text-toro-foreground/40 ml-0.5">kg</span>
        </div>
        {delta != null ? (
          <span className={`text-[11px] font-bold tabular-nums ${LEVEL_TEXT[verdict.level]}`}>
            {signedKg(delta)}
          </span>
        ) : (
          <span className="text-[10px] text-toro-foreground/35">1º</span>
        )}
      </div>
    </button>
  )
}

/**
 * Delta con signo: "+1,2" / "-0,8" / "0".
 *
 * formatKg (lib/report-verdict.ts) devuelve la MAGNITUD (usa Math.abs), porque
 * sus otros usuarios le ponen el signo aparte. Si se le pasa un delta negativo
 * tal cual, el menos desaparece y "bajó 800 g" se lee como si hubiera subido.
 */
function signedKg(delta: number): string {
  const abs = Math.round(Math.abs(delta) * 10) / 10
  if (abs === 0) return "0"
  return `${delta > 0 ? "+" : "-"}${formatKg(abs)}`
}

function DeltaIcon({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) return <Minus className="w-3 h-3" />
  return delta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "good" | "bad" | "flat" }) {
  const color = tone === "good" ? "text-toro-accent" : tone === "bad" ? "text-toro-primary" : "text-toro-foreground"
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-3 text-center shadow-sm">
      <div className={`font-display text-xl leading-none tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-toro-foreground/50 mt-1 leading-tight">{label}</div>
    </div>
  )
}

function EmptyHistory() {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-black/10">
      <div className="relative inline-block mb-3">
        <Camera className="w-10 h-10 text-toro-foreground/15" />
        <LineChart className="w-5 h-5 text-toro-secondary absolute -bottom-1 -right-1" />
      </div>
      <h3 className="font-bold text-toro-foreground mb-1">Sin reportes todavía</h3>
      <p className="text-sm text-toro-foreground/55">
        Cuando alguien del grupo suba su peso, va a aparecer acá con su evolución.
      </p>
    </div>
  )
}

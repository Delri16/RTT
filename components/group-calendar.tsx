"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UserAvatar, { avatarEmoji } from "@/components/user-avatar"
import { ChevronLeft, ChevronRight, CalendarDays, Trophy, Timer, Info } from "lucide-react"
import { getGroupActivitiesInRange } from "@/lib/actions"
import { argDayKey, toDayKey, argDayStartISO, argDayEndISO } from "@/lib/date-utils"
import { resolveActivityEmoji } from "@/lib/sport-icons"

interface GroupCalendarProps {
  groupId: string
  members: any[]
  currentUsername?: string
}

type CalendarActivity = {
  id: string
  username: string
  points_earned: number
  minutes_performed: number | null
  completed_at: string
  sport_icon?: string | null
  group_activities?: { name?: string; icon?: string | null } | null
}

type DayEntry = {
  key: string
  date: Date
  inMonth: boolean
  activities: CalendarActivity[]
  byMember: { username: string; points: number; items: CalendarActivity[] }[]
  totalPoints: number
}

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]

const MONTH_LABEL = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })
const LONG_DAY_LABEL = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" })

/** Lunes de la semana que contiene `date` (la semana arranca lunes, igual que los rankings). */
function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - offset)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

/** 42 celdas (6 semanas) arrancando el lunes de la semana del día 1. */
function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeekMonday(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

function weekGridDays(anchor: Date): Date[] {
  const start = startOfWeekMonday(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Escala de color por cuánta gente del grupo se movió ese día. */
function intensityClasses(activeMembers: number, totalMembers: number): string {
  if (activeMembers === 0) return "bg-white border-gray-200"
  const ratio = activeMembers / Math.max(totalMembers, 1)
  if (ratio >= 0.75) return "bg-toro-accent border-toro-accent"
  if (ratio >= 0.5) return "bg-toro-accent/60 border-toro-accent/60"
  if (ratio >= 0.25) return "bg-toro-accent/35 border-toro-accent/40"
  return "bg-toro-accent/15 border-toro-accent/30"
}

export default function GroupCalendar({ groupId, members, currentUsername }: GroupCalendarProps) {
  const [view, setView] = useState<"month" | "week">("month")
  const [cursor, setCursor] = useState(() => new Date())
  const [activities, setActivities] = useState<CalendarActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const todayKey = argDayKey(new Date())

  const visibleDates = useMemo(
    () => (view === "week" ? weekGridDays(cursor) : monthGridDays(cursor)),
    [view, cursor],
  )

  const rangeStart = toDayKey(visibleDates[0])
  const rangeEnd = toDayKey(visibleDates[visibleDates.length - 1])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const res = await getGroupActivitiesInRange(groupId, argDayStartISO(rangeStart), argDayEndISO(rangeEnd))
      if (cancelled) return
      setActivities(res.success ? (res.activities as CalendarActivity[]) : [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [groupId, rangeStart, rangeEnd])

  // Avatar por username (los miembros del grupo + cualquiera que tenga actividad
  // en el rango aunque ya no esté en el grupo).
  const avatarByUser = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      map.set(m.username, m.profiles?.avatar_url || m.profiles?.avatar || "default")
    }
    return map
  }, [members])

  const days: DayEntry[] = useMemo(() => {
    const buckets = new Map<string, CalendarActivity[]>()
    for (const a of activities) {
      const key = argDayKey(a.completed_at)
      const list = buckets.get(key)
      if (list) list.push(a)
      else buckets.set(key, [a])
    }

    return visibleDates.map((date) => {
      const key = toDayKey(date)
      const dayActivities = buckets.get(key) || []

      const perMember = new Map<string, { username: string; points: number; items: CalendarActivity[] }>()
      for (const a of dayActivities) {
        const entry = perMember.get(a.username) || { username: a.username, points: 0, items: [] }
        entry.points += a.points_earned || 0
        entry.items.push(a)
        perMember.set(a.username, entry)
      }

      return {
        key,
        date,
        inMonth: date.getMonth() === cursor.getMonth(),
        activities: dayActivities,
        byMember: [...perMember.values()].sort((a, b) => b.points - a.points),
        totalPoints: dayActivities.reduce((sum, a) => sum + (a.points_earned || 0), 0),
      }
    })
  }, [activities, visibleDates, cursor])

  const dayByKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days])
  const selected = selectedDay ? dayByKey.get(selectedDay) : undefined

  // Filas de la vista semanal: todos los miembros del grupo, ordenados por
  // los puntos que hicieron en la semana (los que no hicieron nada quedan al final).
  const weekRows = useMemo(() => {
    const totals = new Map<string, number>()
    for (const d of days) {
      for (const m of d.byMember) {
        totals.set(m.username, (totals.get(m.username) || 0) + m.points)
      }
    }
    const usernames = new Set<string>([...members.map((m) => m.username), ...totals.keys()])
    return [...usernames]
      .map((username) => ({ username, total: totals.get(username) || 0 }))
      .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username))
  }, [days, members])

  const move = (delta: number) => {
    setSelectedDay(null)
    setCursor((prev) =>
      view === "week"
        ? addDays(prev, delta * 7)
        : new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    )
  }

  const goToday = () => {
    setSelectedDay(null)
    setCursor(new Date())
  }

  const periodLabel =
    view === "week"
      ? `${visibleDates[0].getDate()} ${new Intl.DateTimeFormat("es-AR", { month: "short" }).format(visibleDates[0])} – ${visibleDates[6].getDate()} ${new Intl.DateTimeFormat("es-AR", { month: "short" }).format(visibleDates[6])}`
      : MONTH_LABEL.format(cursor)

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-3 sm:p-4 space-y-4">
        {/* Cabecera: período + navegación */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Anterior" className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="font-bold text-toro-foreground first-letter:uppercase truncate">{periodLabel}</p>
            <p className="text-[11px] text-toro-foreground/50">
              {loading ? "Cargando…" : `${activities.length} actividades`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Siguiente" className="shrink-0">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Selector de vista */}
        <div className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 gap-1 bg-toro-background rounded-full p-1">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v)
                  setSelectedDay(null)
                }}
                className={`rounded-full py-1.5 text-sm font-semibold transition-colors ${
                  view === v ? "bg-toro-primary text-white shadow-sm" : "text-toro-foreground/60"
                }`}
              >
                {v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goToday} className="shrink-0 bg-transparent">
            Hoy
          </Button>
        </div>

        {/* Grilla */}
        {view === "month" ? (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-toro-foreground/40">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isToday = day.key === todayKey
                const isSelected = day.key === selectedDay
                const shown = day.byMember.slice(0, 3)
                const extra = day.byMember.length - shown.length

                return (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDay(isSelected ? null : day.key)}
                    className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-start transition-all ${intensityClasses(
                      day.byMember.length,
                      members.length,
                    )} ${day.inMonth ? "" : "opacity-40"} ${
                      isSelected ? "ring-2 ring-toro-primary ring-offset-1" : ""
                    } ${isToday ? "border-toro-primary border-2" : ""}`}
                  >
                    <span
                      className={`text-[11px] leading-none font-bold ${
                        isToday ? "text-toro-primary" : "text-toro-foreground/70"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    <div className="flex-1 flex items-center justify-center flex-wrap gap-px leading-none">
                      {shown.map((m) => (
                        <span key={m.username} className="text-[10px] leading-none" title={m.username}>
                          {avatarEmoji(avatarByUser.get(m.username))}
                        </span>
                      ))}
                      {extra > 0 && <span className="text-[8px] font-bold text-toro-foreground/60">+{extra}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="min-w-[300px]">
              {/* Encabezado de días */}
              <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-1 mb-1">
                <div />
                {days.map((day, i) => (
                  <div key={day.key} className="text-center">
                    <div className="text-[10px] font-bold text-toro-foreground/40">{WEEKDAY_LABELS[i]}</div>
                    <div
                      className={`text-[11px] font-bold ${
                        day.key === todayKey ? "text-toro-primary" : "text-toro-foreground/70"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Una fila por miembro */}
              <div className="space-y-1">
                {weekRows.map((row) => (
                  <div key={row.username} className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-1 items-center">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm shrink-0">{avatarEmoji(avatarByUser.get(row.username))}</span>
                      <span
                        className={`text-[11px] truncate ${
                          row.username === currentUsername
                            ? "font-bold text-toro-primary"
                            : "text-toro-foreground/80"
                        }`}
                      >
                        {row.username}
                      </span>
                    </div>
                    {days.map((day) => {
                      const entry = day.byMember.find((m) => m.username === row.username)
                      return (
                        <button
                          key={day.key}
                          onClick={() => setSelectedDay(day.key === selectedDay ? null : day.key)}
                          className={`h-8 rounded-md border text-[10px] font-bold flex items-center justify-center transition-all ${
                            entry
                              ? "bg-toro-accent/25 border-toro-accent/40 text-toro-accent"
                              : "bg-gray-50 border-gray-100 text-gray-300"
                          } ${day.key === selectedDay ? "ring-2 ring-toro-primary" : ""}`}
                        >
                          {entry ? entry.points : "–"}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leyenda + ayuda */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-toro-foreground/50">
          <span className="inline-flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            Tocá un día para ver el detalle
          </span>
          {view === "month" && (
            <span className="inline-flex items-center gap-1">
              Menos
              <span className="w-3 h-3 rounded-sm border bg-white border-gray-200" />
              <span className="w-3 h-3 rounded-sm border bg-toro-accent/15 border-toro-accent/30" />
              <span className="w-3 h-3 rounded-sm border bg-toro-accent/35 border-toro-accent/40" />
              <span className="w-3 h-3 rounded-sm border bg-toro-accent/60 border-toro-accent/60" />
              <span className="w-3 h-3 rounded-sm border bg-toro-accent border-toro-accent" />
              Más
            </span>
          )}
        </div>

        {/* Detalle del día */}
        {selected && (
          <div className="rounded-xl border border-toro-primary/20 bg-toro-background/60 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-toro-foreground first-letter:uppercase text-sm leading-tight">
                  {LONG_DAY_LABEL.format(selected.date)}
                </p>
                <p className="text-[11px] text-toro-foreground/60">
                  {selected.byMember.length === 0
                    ? "Sin actividad"
                    : `${selected.byMember.length} ${selected.byMember.length === 1 ? "persona" : "personas"} · ${selected.totalPoints} pts`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(null)}
                className="shrink-0 text-toro-foreground/50 h-7 px-2 text-xs"
              >
                Cerrar
              </Button>
            </div>

            {selected.byMember.length === 0 ? (
              <p className="text-sm text-toro-foreground/50 py-3 text-center">Nadie registró nada este día.</p>
            ) : (
              <div className="space-y-2">
                {selected.byMember.map((m) => (
                  <div key={m.username} className="bg-white rounded-lg p-2.5 border border-black/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <UserAvatar avatarId={avatarByUser.get(m.username)} username={m.username} size="sm" />
                      <span
                        className={`text-sm font-semibold truncate flex-1 ${
                          m.username === currentUsername ? "text-toro-primary" : "text-toro-foreground"
                        }`}
                      >
                        {m.username}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-toro-accent shrink-0">
                        <Trophy className="w-3 h-3" />
                        {m.points} pts
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.items.map((item) => {
                        const emoji = resolveActivityEmoji(item.sport_icon, item.group_activities?.icon)
                        return (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 bg-toro-background rounded-full px-2 py-0.5 text-[11px] text-toro-foreground/80"
                        >
                          {emoji ? (
                            <span className="text-xs leading-none shrink-0">{emoji}</span>
                          ) : (
                            <CalendarDays className="w-3 h-3 shrink-0 text-toro-primary" />
                          )}
                          {item.group_activities?.name || "Actividad"}
                          {item.minutes_performed ? (
                            <span className="inline-flex items-center gap-0.5 text-toro-foreground/50">
                              <Timer className="w-3 h-3" />
                              {item.minutes_performed}′
                            </span>
                          ) : null}
                          <span className="font-bold text-toro-accent">{item.points_earned}</span>
                        </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

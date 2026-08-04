"use client"

import { useEffect, useMemo, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Scale, Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { getUserReports } from "@/lib/actions"
import { getReportVerdict, VerdictLevel } from "@/lib/report-verdict"

type ReportRow = {
  id: string
  reported_weight: number
  report_date: string
  groups?: { name: string } | null
}

const LEVEL_DOT: Record<VerdictLevel, string> = {
  green: "bg-toro-accent",
  yellow: "bg-toro-secondary",
  red: "bg-toro-primary",
  neutral: "bg-toro-foreground/30",
}

/** Drawer que muestra la evolución de todos los reportes de peso de un usuario: gráfico + lista cronológica. */
export default function ReportHistoryDrawer({
  username,
  goal,
  open,
  onOpenChange,
}: {
  username: string
  goal: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getUserReports(username).then((res) => {
      if (res.success) setReports((res.reports as ReportRow[]) ?? [])
      setLoading(false)
    })
  }, [open, username])

  // Cronológico ascendente para calcular veredicto (vs. el reporte anterior) y graficar.
  const ascending = useMemo(
    () => [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date)),
    [reports],
  )

  const withVerdict = useMemo(() => {
    let prev: number | null = null
    return ascending.map((r) => {
      const verdict = getReportVerdict({ weight: r.reported_weight, prevWeight: prev, goal, seed: r.id })
      prev = r.reported_weight
      return { ...r, verdict }
    })
  }, [ascending, goal])

  const chartData = useMemo(
    () =>
      ascending.map((r) => ({
        date: new Date(r.report_date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        peso: r.reported_weight,
      })),
    [ascending],
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-toro-secondary/20 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6 text-toro-foreground/70" />
            </div>
            <DrawerTitle className="font-display text-lg text-left leading-tight">
              Evolución de {username}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-8 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-5 h-5 text-toro-primary" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-toro-foreground/40 py-2">Todavía no hay reportes.</p>
          ) : (
            <>
              {chartData.length >= 2 && (
                <div>
                  <h3 className="text-sm font-bold text-toro-foreground mb-1">Peso a lo largo del tiempo</h3>
                  <div className="h-40 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} domain={["dataMin - 1", "dataMax + 1"]} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}
                          formatter={(v: number) => [`${v} kg`, "Peso"]}
                        />
                        <Line type="monotone" dataKey="peso" stroke="#FF6B6B" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-toro-foreground mb-1">Historial de reportes</h3>
                <div className="space-y-1.5">
                  {[...withVerdict].reverse().map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-white rounded-xl border border-black/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${LEVEL_DOT[r.verdict.level]}`} />
                        <div className="min-w-0">
                          <div className="text-sm">
                            <span className="font-bold text-toro-foreground">{r.reported_weight} kg</span>
                            {r.verdict.delta != null && (
                              <span className="text-toro-foreground/50"> · {r.verdict.deltaLabel}</span>
                            )}
                          </div>
                          {r.groups?.name && (
                            <div className="text-[11px] text-toro-foreground/40 truncate">{r.groups.name}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-toro-foreground/40 shrink-0 ml-2">
                        {new Date(r.report_date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

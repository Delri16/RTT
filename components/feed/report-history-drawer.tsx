"use client"

import { useEffect, useMemo, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Scale, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { getUserReports } from "@/lib/actions"
import { getReportVerdict, VerdictLevel } from "@/lib/report-verdict"

type ReportRow = {
  id: string
  reported_weight: number
  report_date: string
  scale_photo_url: string | null
  body_photo_url: string | null
  groups?: { name: string } | null
}

type Photo = { url: string; date: string; weight: number; label: string }

function BeforeAfter({
  label,
  first,
  last,
  onOpen,
}: {
  label: string
  first: Photo
  last: Photo
  onOpen: (url: string) => void
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-toro-foreground mb-1">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { tag: "Antes", ...first },
          { tag: "Ahora", ...last },
        ].map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(p.url)}
            className="rounded-xl overflow-hidden bg-toro-background relative text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url || "/placeholder.svg"} alt={p.tag} className="w-full aspect-square object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[11px] px-2 py-1 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wide">{p.tag}</span>
              <span>
                {p.weight} kg ·{" "}
                {new Date(p.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Visor a pantalla completa con carousel: swipe/flechas entre todas las fotos del historial. */
function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: Photo[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const photo = photos[index]
  if (!photo) return null

  const go = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length)

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX == null) return
        const dx = e.changedTouches[0].clientX - touchStartX
        if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1)
        setTouchStartX(null)
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <span className="text-sm font-semibold">
          {photo.label} · {photo.weight} kg ·{" "}
          {new Date(photo.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </span>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Foto anterior"
            className="absolute left-1 z-10 p-2 text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url || "/placeholder.svg"} alt="" className="max-w-full max-h-full object-contain" />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Foto siguiente"
            className="absolute right-1 z-10 p-2 text-white/80 hover:text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  )
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

  function firstAndLast(key: "scale_photo_url" | "body_photo_url", label: string) {
    const withPhoto = ascending.filter((r) => r[key])
    if (withPhoto.length < 2) return null
    const first = withPhoto[0]
    const last = withPhoto[withPhoto.length - 1]
    if (first.id === last.id) return null
    return {
      first: { url: first[key] as string, date: first.report_date, weight: first.reported_weight, label },
      last: { url: last[key] as string, date: last.report_date, weight: last.reported_weight, label },
    }
  }

  const scaleComparison = useMemo(() => firstAndLast("scale_photo_url", "Balanza"), [ascending])
  const bodyComparison = useMemo(() => firstAndLast("body_photo_url", "Cuerpo"), [ascending])

  // Todas las fotos en orden cronológico, para el carousel del visor a pantalla completa.
  const allPhotos = useMemo<Photo[]>(
    () =>
      ascending.flatMap((r) => {
        const out: Photo[] = []
        if (r.body_photo_url) out.push({ url: r.body_photo_url, date: r.report_date, weight: r.reported_weight, label: "Cuerpo" })
        if (r.scale_photo_url) out.push({ url: r.scale_photo_url, date: r.report_date, weight: r.reported_weight, label: "Balanza" })
        return out
      }),
    [ascending],
  )

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  function openPhoto(url: string) {
    const i = allPhotos.findIndex((p) => p.url === url)
    if (i >= 0) setLightboxIndex(i)
  }

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
              {bodyComparison && <BeforeAfter label="Antes / Ahora (cuerpo)" onOpen={openPhoto} {...bodyComparison} />}
              {scaleComparison && <BeforeAfter label="Antes / Ahora (balanza)" onOpen={openPhoto} {...scaleComparison} />}

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
                        {r.scale_photo_url || r.body_photo_url ? (
                          <button
                            type="button"
                            onClick={() => openPhoto((r.body_photo_url || r.scale_photo_url) as string)}
                            className="shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.body_photo_url || r.scale_photo_url || "/placeholder.svg"}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-toro-background"
                            />
                          </button>
                        ) : (
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${LEVEL_DOT[r.verdict.level]}`} />
                        )}
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

      {lightboxIndex != null && (
        <PhotoLightbox
          photos={allPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </Drawer>
  )
}

"use client"

export type ReportPhoto = { url: string; date: string; weight: number; label: string }

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/**
 * Tira horizontal con TODAS las fotos de un tipo (cuerpo o balanza), en orden
 * cronológico y una al lado de la otra, para ver el progreso completo de un
 * vistazo. Scrollea con snap; la primera y la última llevan la etiqueta
 * "Antes" / "Ahora". Tocar una foto llama a `onOpen` (visor a pantalla completa).
 */
export default function ReportPhotoStrip({
  title,
  photos,
  onOpen,
}: {
  title: string
  photos: ReportPhoto[]
  onOpen: (url: string) => void
}) {
  if (photos.length === 0) return null
  const first = photos[0]
  const last = photos[photos.length - 1]
  const delta = photos.length > 1 ? Math.round((last.weight - first.weight) * 10) / 10 : null

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <h3 className="text-sm font-bold text-toro-foreground">{title}</h3>
        <span className="text-[11px] text-toro-foreground/50">
          {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          {delta != null && (
            <>
              {" · "}
              <span className={delta < 0 ? "text-toro-accent" : delta > 0 ? "text-toro-primary" : ""}>
                {delta > 0 ? "+" : ""}
                {delta} kg
              </span>
            </>
          )}
        </span>
      </div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p, i) => {
          const tag = photos.length > 1 && i === 0 ? "Antes" : i === photos.length - 1 ? "Ahora" : null
          return (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => onOpen(p.url)}
              className="relative shrink-0 w-32 snap-start rounded-xl overflow-hidden bg-toro-background text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url || "/placeholder.svg"} alt={`${p.label} ${fmtDate(p.date)}`} className="w-32 h-40 object-cover" />
              {tag && (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-toro-primary text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
                  {tag}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white px-2 py-1 leading-tight">
                <div className="text-xs font-bold">{p.weight} kg</div>
                <div className="text-[10px] opacity-80">{fmtDate(p.date)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

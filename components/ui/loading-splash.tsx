"use client"

import { useEffect, useState } from "react"
import { randomTip, TIP_CATEGORY_META, type ToroTip } from "@/lib/toro-tips"

/**
 * Splash de carga: barra de progreso + un tip al azar para "estar toro"
 * (entrenamiento, alimentación o sueño, de lib/toro-tips.ts).
 *
 * La barra es "falsa" a propósito: no sabemos cuánto tarda cada carga, así que
 * la anima CSS (`animate-progress-fill`) de 0 a ~92% con ease-out y queda ahí
 * hasta que la pantalla real reemplaza al splash. Da sensación de avance sin
 * mentir con un 100% que nunca llega.
 *
 * El tip se elige en un effect (no en el render) para que el HTML del server y
 * el del cliente coincidan: si no, `Math.random` daría mismatch de hidratación.
 */
export default function LoadingSplash({ label = "Cargando" }: { label?: string }) {
  const [tip, setTip] = useState<ToroTip | null>(null)

  useEffect(() => {
    setTip(randomTip())
  }, [])

  const meta = tip ? TIP_CATEGORY_META[tip.category] : null

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-toro-background px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-toro-foreground/50">{label}</p>
            <span className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-toro-primary animate-pulse-soft"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={label}
            aria-busy="true"
            className="relative h-2.5 w-full overflow-hidden rounded-full bg-toro-foreground/10"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-toro-primary to-toro-secondary animate-progress-fill" />
          </div>
        </div>

        <div
          className={`w-full rounded-2xl bg-white/70 border border-toro-foreground/5 shadow-soft px-4 py-3.5 transition-opacity duration-300 ${
            tip ? "opacity-100 animate-fade-in-up" : "opacity-0"
          }`}
          aria-live="polite"
        >
          {tip && meta ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-toro-primary mb-1">
                <span className="mr-1" aria-hidden="true">
                  {meta.emoji}
                </span>
                Tip de {meta.label.toLowerCase()}
              </p>
              <p className="text-sm leading-snug text-toro-foreground/80">{tip.text}</p>
            </>
          ) : (
            // Placeholder con la misma altura aprox. para que no salte el layout
            // cuando el tip aparece después de montar.
            <div className="h-12" />
          )}
        </div>
      </div>
    </div>
  )
}

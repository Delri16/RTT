"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RestGameProps } from "./types"

type Phase = "esperando" | "listo" | "ya" | "resultado" | "adelantado"

/**
 * Reacción: tocar apenas el panel se pone verde.
 *
 * Puntaje: 500 - milisegundos, con piso en 0. Una reacción humana buena ronda
 * los 200-250 ms, así que da entre 250 y 300 puntos por ronda.
 */
export default function ReactionGame({ addScore }: RestGameProps) {
  const [phase, setPhase] = useState<Phase>("esperando")
  const [ms, setMs] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const startRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const arm = useCallback(() => {
    setPhase("listo")
    setMs(null)
    // Espera aleatoria para que no se pueda anticipar.
    const delay = 1200 + Math.random() * 2800
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setPhase("ya")
    }, delay)
  }, [])

  useEffect(() => {
    arm()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [arm])

  function handleTap() {
    if (phase === "listo") {
      // Tocó antes de tiempo.
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setPhase("adelantado")
      return
    }
    if (phase === "ya") {
      const elapsed = Math.round(performance.now() - startRef.current)
      setMs(elapsed)
      setBest((b) => (b === null || elapsed < b ? elapsed : b))
      addScore(Math.max(0, 500 - elapsed))
      setPhase("resultado")
      return
    }
    if (phase === "resultado" || phase === "adelantado") {
      arm()
    }
  }

  const style =
    phase === "ya"
      ? "bg-toro-accent text-white"
      : phase === "listo"
        ? "bg-toro-primary/90 text-white"
        : phase === "adelantado"
          ? "bg-toro-secondary text-toro-foreground"
          : "bg-white text-toro-foreground"

  return (
    <button
      onClick={handleTap}
      className={`w-full h-full min-h-[150px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors duration-100 select-none ${style}`}
    >
      {phase === "listo" && (
        <>
          <span className="text-3xl">✋</span>
          <span className="font-display text-xl">Esperá…</span>
          <span className="text-xs opacity-80">No toques todavía</span>
        </>
      )}
      {phase === "ya" && (
        <>
          <span className="text-4xl">⚡</span>
          <span className="font-display text-3xl">¡YA!</span>
        </>
      )}
      {phase === "resultado" && (
        <>
          <span className="font-display text-4xl tabular-nums">{ms}<span className="text-lg"> ms</span></span>
          <span className="text-xs opacity-70">
            +{Math.max(0, 500 - (ms ?? 0))} pts{best !== null && ` · mejor ${best} ms`}
          </span>
          <span className="text-xs font-semibold text-toro-primary mt-1">Tocá para seguir</span>
        </>
      )}
      {phase === "adelantado" && (
        <>
          <span className="text-3xl">🙈</span>
          <span className="font-display text-xl">Muy ansioso</span>
          <span className="text-xs opacity-80">Tocá para reintentar</span>
        </>
      )}
    </button>
  )
}

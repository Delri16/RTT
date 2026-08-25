"use client"

import { useEffect, useRef, useState } from "react"
import type { RestGameProps } from "./types"

/**
 * Precisión: una barra barre de lado a lado y hay que frenarla dentro de la
 * zona verde, que se achica con cada acierto.
 *
 * Puntaje: hasta 200 por tiro, según lo cerca del centro de la zona.
 */
export default function PrecisionGame({ addScore }: RestGameProps) {
  // Posición del cursor 0..100 y ancho de la zona objetivo.
  const [pos, setPos] = useState(0)
  const [zoneWidth, setZoneWidth] = useState(26)
  const [zoneStart, setZoneStart] = useState(37)
  const [result, setResult] = useState<{ hit: boolean; points: number } | null>(null)
  const [streak, setStreak] = useState(0)
  const [running, setRunning] = useState(true)

  const posRef = useRef(0)
  const dirRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const speedRef = useRef(0.85)

  // Bucle de animación del cursor. requestAnimationFrame y no setInterval para
  // que vaya parejo y no consuma cuando la pestaña está oculta.
  useEffect(() => {
    if (!running) return
    let last = performance.now()

    const tick = (now: number) => {
      const dt = now - last
      last = now
      posRef.current += dirRef.current * speedRef.current * (dt / 16)
      if (posRef.current >= 100) {
        posRef.current = 100
        dirRef.current = -1
      } else if (posRef.current <= 0) {
        posRef.current = 0
        dirRef.current = 1
      }
      setPos(posRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  function stop() {
    if (!running) return
    setRunning(false)

    const center = zoneStart + zoneWidth / 2
    const dist = Math.abs(posRef.current - center)
    const hit = posRef.current >= zoneStart && posRef.current <= zoneStart + zoneWidth

    let points = 0
    if (hit) {
      // Cuanto más cerca del centro, más puntos.
      points = Math.round(200 * (1 - dist / (zoneWidth / 2)) + 40)
      addScore(points)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
    setResult({ hit, points })

    setTimeout(() => {
      // Siguiente tiro: zona nueva, más angosta si viene acertando.
      const nextWidth = hit ? Math.max(9, zoneWidth - 3) : 26
      setZoneWidth(nextWidth)
      setZoneStart(6 + Math.random() * (88 - nextWidth))
      speedRef.current = hit ? Math.min(2.1, speedRef.current + 0.12) : 0.85
      setResult(null)
      setRunning(true)
    }, 800)
  }

  return (
    <button
      onClick={stop}
      className="w-full h-full min-h-[150px] rounded-2xl bg-white flex flex-col items-center justify-center gap-3 px-4 select-none active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-toro-foreground/60">
          Seguidas: <span className="tabular-nums">{streak}</span>
        </span>
        <span className="text-xs font-semibold text-toro-foreground/50">
          {result ? (result.hit ? `+${result.points}` : "Erraste") : "Tocá para frenar"}
        </span>
      </div>

      {/* Pista */}
      <div className="relative w-full h-9 rounded-full bg-black/5 overflow-hidden">
        {/* Zona objetivo */}
        <div
          className={`absolute top-0 bottom-0 rounded-full transition-colors ${
            result ? (result.hit ? "bg-toro-accent/70" : "bg-toro-primary/40") : "bg-toro-accent/35"
          }`}
          style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}
        />
        {/* Centro de la zona */}
        <div
          className="absolute top-1 bottom-1 w-0.5 bg-toro-accent/70 rounded-full"
          style={{ left: `calc(${zoneStart + zoneWidth / 2}% - 1px)` }}
        />
        {/* Cursor */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-toro-foreground rounded-full shadow"
          style={{ left: `calc(${pos}% - 3px)` }}
        />
      </div>

      <span className="text-2xl leading-none">{result ? (result.hit ? "🎯" : "💨") : "👇"}</span>
    </button>
  )
}

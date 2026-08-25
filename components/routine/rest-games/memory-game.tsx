"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RestGameProps } from "./types"

const PADS = [
  { bg: "bg-toro-primary", lit: "bg-toro-primary/40" },
  { bg: "bg-toro-accent", lit: "bg-toro-accent/40" },
  { bg: "bg-toro-secondary", lit: "bg-toro-secondary/40" },
  { bg: "bg-indigo-400", lit: "bg-indigo-400/40" },
]

type Phase = "mostrando" | "repitiendo" | "error"

/**
 * Memoria estilo Simón: se muestra una secuencia y hay que repetirla.
 * Cada ronda agrega un paso.
 *
 * Puntaje: 40 × N al COMPLETAR la ronda N, acumulativo (llegar a la ronda 5 da
 * 40+80+120+160+200 = 600). Se acredita ronda por ronda y no al fallar: si se
 * sumara solo en el fallo, quien no pierde nunca termina la partida en 0.
 */
export default function MemoryGame({ addScore, score }: RestGameProps) {
  const [sequence, setSequence] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>("mostrando")
  const [active, setActive] = useState<number | null>(null)
  const [round, setRound] = useState(1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  /** Reproduce la secuencia encendiendo cada pad por turno. */
  const play = useCallback((seq: number[]) => {
    clearTimers()
    setPhase("mostrando")
    setActive(null)
    seq.forEach((pad, i) => {
      timers.current.push(setTimeout(() => setActive(pad), i * 620 + 300))
      timers.current.push(setTimeout(() => setActive(null), i * 620 + 300 + 380))
    })
    timers.current.push(
      setTimeout(() => {
        setPhase("repitiendo")
        setStep(0)
      }, seq.length * 620 + 320),
    )
  }, [])

  // Arranque: primera secuencia de un solo paso.
  useEffect(() => {
    const first = [Math.floor(Math.random() * 4)]
    setSequence(first)
    play(first)
    return clearTimers
  }, [play])

  function tap(pad: number) {
    if (phase !== "repitiendo") return
    setActive(pad)
    setTimeout(() => setActive(null), 140)

    if (sequence[step] !== pad) {
      // Falló: los puntos de las rondas que sí completó ya están acreditados,
      // así que acá no se suma nada. Arranca de nuevo con una secuencia corta.
      setPhase("error")
      clearTimers()
      timers.current.push(
        setTimeout(() => {
          const fresh = [Math.floor(Math.random() * 4)]
          setSequence(fresh)
          setRound(1)
          play(fresh)
        }, 1100),
      )
      return
    }

    if (step === sequence.length - 1) {
      // Ronda completa: se acreditan los puntos AHORA, no al fallar. Antes se
      // sumaban solo en el fallo, así que quien no perdía nunca terminaba la
      // partida con 0 puntos por más lejos que hubiera llegado.
      addScore(40 * round)
      const next = [...sequence, Math.floor(Math.random() * 4)]
      setRound((r) => r + 1)
      timers.current.push(
        setTimeout(() => {
          setSequence(next)
          play(next)
        }, 520),
      )
      return
    }

    setStep((s) => s + 1)
  }

  return (
    <div className="w-full h-full min-h-[150px] flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-toro-foreground/60">
          Ronda <span className="tabular-nums">{round}</span>
          <span className="ml-2 text-toro-accent tabular-nums">{score} pts</span>
        </span>
        <span className="text-xs font-semibold text-toro-foreground/50">
          {phase === "mostrando" ? "Mirá…" : phase === "error" ? "¡Uh! De nuevo" : "Repetí"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {PADS.map((p, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            disabled={phase !== "repitiendo"}
            aria-label={`Pad ${i + 1}`}
            className={`rounded-2xl min-h-[62px] transition-all duration-100 ${
              active === i ? `${p.bg} scale-95 shadow-lg` : `${p.lit} active:scale-95`
            } ${phase === "error" ? "opacity-40" : ""}`}
          />
        ))}
      </div>
    </div>
  )
}

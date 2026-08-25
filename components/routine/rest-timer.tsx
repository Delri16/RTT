"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Gamepad2, Minus, Plus, Timer, Trophy, X } from "lucide-react"
import { argDayKey } from "@/lib/date-utils"
import {
  formatRest,
  gameOfTheDay,
  REST_GAMES_ENABLED_KEY,
  type RestGameKey,
} from "@/lib/rest-games"
import { getRestGameLeaderboard, saveRestGameScore } from "@/lib/actions"
import type { RestGameLeaderRow } from "@/lib/global-points"
import ReactionGame from "@/components/routine/rest-games/reaction-game"
import MemoryGame from "@/components/routine/rest-games/memory-game"
import TriviaGame from "@/components/routine/rest-games/trivia-game"
import PrecisionGame from "@/components/routine/rest-games/precision-game"

/**
 * Timer de descanso entre series.
 *
 * Tres cosas que el timer viejo no hacía y que se notan más que cualquier juego:
 *
 *  1. La pantalla no se apaga (Wake Lock API). Antes se bloqueaba a los 30s con
 *     las manos ocupadas.
 *  2. Avisa: vibración + un beep sintetizado con Web Audio (sin archivos de
 *     audio, así no pesa nada en el bundle).
 *  3. Cuenta contra un timestamp absoluto y no restando de a un segundo, así
 *     no se atrasa cuando el navegador tira del freno de mano en segundo plano.
 *
 * Encima de eso va el juego del día, que dura exactamente lo que dura el
 * descanso. Se puede apagar (queda guardado en localStorage).
 */

const GAMES: Record<RestGameKey, React.ComponentType<{ addScore: (n: number) => void; score: number }>> = {
  reaccion: ReactionGame,
  memoria: MemoryGame,
  trivia: TriviaGame,
  precision: PrecisionGame,
}

export default function RestTimer({
  seconds,
  username,
  onClose,
  onAdjustDefault,
}: {
  /** Duración del descanso configurada para el ejercicio. */
  seconds: number
  username: string
  onClose: () => void
  /** Se llama si la persona ajusta la duración, para recordarla en la sesión. */
  onAdjustDefault?: (next: number) => void
}) {
  // El componente se remonta en cada serie (el padre lo montea con `key`), así
  // que el estado inicial alcanza: no hace falta un efecto que lo reinicie —
  // uno que dependiera de `seconds` reiniciaría la cuenta al ajustar la
  // duración con los botones +/-.
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  // Duración total de ESTE descanso, incluyendo lo que se haya sumado a mano.
  // Es lo que usa el anillo de progreso como denominador.
  const [total, setTotal] = useState(seconds)
  const [expanded, setExpanded] = useState(false)
  const [gamesOn, setGamesOn] = useState(false)
  const [score, setScore] = useState(0)
  const [leaders, setLeaders] = useState<RestGameLeaderRow[]>([])
  const [showLeaders, setShowLeaders] = useState(false)

  const firedRef = useRef(false)
  const savedRef = useRef(false)
  const wakeLockRef = useRef<any>(null)

  const dayKey = useMemo(() => argDayKey(new Date()), [])
  const game = useMemo(() => gameOfTheDay(dayKey), [dayKey])
  const GameComponent = GAMES[game.key]

  // Preferencia de juegos (por defecto encendidos).
  useEffect(() => {
    const stored = localStorage.getItem(REST_GAMES_ENABLED_KEY)
    const on = stored === null ? true : stored === "1"
    setGamesOn(on)
    setExpanded(on)
  }, [])

  function toggleGames() {
    setGamesOn((on) => {
      const next = !on
      localStorage.setItem(REST_GAMES_ENABLED_KEY, next ? "1" : "0")
      if (next) setExpanded(true)
      return next
    })
  }

  /** Suma (o resta) tiempo al descanso en curso, moviendo también el total. */
  const shift = useCallback((deltaMs: number) => {
    setEndsAt((e) => Math.max(Date.now(), e + deltaMs))
    setTotal((t) => Math.max(1, t + Math.round(deltaMs / 1000)))
    if (deltaMs > 0) firedRef.current = false
  }, [])

  // --- Cuenta regresiva contra timestamp absoluto ---
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true
        notifyDone()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt])

  // --- Wake Lock: que no se apague la pantalla mientras descansás ---
  const acquireWakeLock = useCallback(async () => {
    try {
      const anyNav = navigator as any
      if (!anyNav.wakeLock?.request) return
      wakeLockRef.current = await anyNav.wakeLock.request("screen")
    } catch {
      // Sin permiso o sin soporte (iOS < 16.4): el timer funciona igual.
    }
  }, [])

  useEffect(() => {
    acquireWakeLock()
    const onVisible = () => {
      if (document.visibilityState === "visible") acquireWakeLock()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      wakeLockRef.current?.release?.().catch(() => {})
      wakeLockRef.current = null
    }
  }, [acquireWakeLock])

  // --- Guardar el puntaje al cerrar (una sola vez) ---
  const persistScore = useCallback(() => {
    if (savedRef.current || score <= 0) return
    savedRef.current = true
    saveRestGameScore({ username, day: dayKey, gameKey: game.key, score })
  }, [score, username, dayKey, game.key])

  function close() {
    persistScore()
    onClose()
  }

  function loadLeaders() {
    setShowLeaders((v) => !v)
    if (leaders.length > 0) return
    // Lunes de esta semana, para la tabla semanal.
    const d = new Date(`${dayKey}T00:00:00-03:00`)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    getRestGameLeaderboard(argDayKey(monday)).then((res) => {
      if (res.success) setLeaders(res.rows)
    })
  }

  const progress = Math.max(0, Math.min(1, left / total))
  const done = left === 0

  // --- Compacto ---
  if (!expanded) {
    return (
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-2 shadow-lg text-white ${
            done ? "bg-toro-accent" : "bg-toro-foreground"
          }`}
        >
          <Timer className="w-4 h-4 shrink-0" />
          <span className="font-bold tabular-nums text-sm min-w-[42px] text-center">
            {done ? "¡Dale!" : formatClock(left)}
          </span>
          <button
            onClick={() => shift(30000)}
            className="text-xs bg-white/20 rounded-full px-2 py-0.5 active:scale-95 transition"
          >
            +30s
          </button>
          {gamesOn && (
            <button
              onClick={() => setExpanded(true)}
              aria-label="Abrir el juego"
              className="bg-white/20 rounded-full p-1 active:scale-95 transition"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={close} aria-label="Cerrar" className="p-0.5 active:scale-95 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // --- Expandido: el juego ocupa el descanso ---
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-fade-in-up">
      <div className="max-w-md mx-auto bg-toro-background rounded-t-3xl shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.25)] border-t border-black/5 overflow-hidden">
        {/* Barra de progreso del descanso, pegada al borde superior */}
        <div className="h-1 bg-black/5">
          <div
            className={`h-full transition-all duration-300 ease-linear ${done ? "bg-toro-accent" : "bg-toro-primary"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Cabecera: reloj + controles */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="relative shrink-0">
            <CountdownRing progress={progress} done={done} />
            <span
              className={`absolute inset-0 flex items-center justify-center font-display text-base tabular-nums ${
                done ? "text-toro-accent" : "text-toro-foreground"
              }`}
            >
              {done ? "¡YA!" : formatClock(left)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-toro-foreground leading-tight flex items-center gap-1.5">
              <span>{game.emoji}</span> {game.name}
            </p>
            <p className="text-[11px] text-toro-foreground/50 truncate">
              {done ? "Se terminó el descanso. A la próxima serie." : `Puntos: ${score}`}
            </p>
          </div>

          {/* Ajuste de duración */}
          <div className="flex items-center gap-0.5 shrink-0 bg-white rounded-full px-1 py-0.5 border border-black/5">
            <button
              onClick={() => {
                shift(-15000)
                onAdjustDefault?.(Math.max(15, total - 15))
              }}
              aria-label="Quitar 15 segundos"
              className="p-1 rounded-full text-toro-foreground/50 active:scale-90 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold text-toro-foreground/60 tabular-nums w-9 text-center">
              {formatRest(total)}
            </span>
            <button
              onClick={() => {
                shift(15000)
                onAdjustDefault?.(total + 15)
              }}
              aria-label="Sumar 15 segundos"
              className="p-1 rounded-full text-toro-foreground/50 active:scale-90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setExpanded(false)}
            aria-label="Achicar"
            className="shrink-0 p-1.5 rounded-xl text-toro-foreground/40 hover:bg-black/5 active:scale-95 transition"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Juego */}
        <div className="px-3 pb-2">
          {/* La tabla manda sobre el cartel de "terminado": si no, el boton del pie
              queda inerte una vez que se acaba el descanso. */}
          {showLeaders ? (
            <Leaderboard rows={leaders} username={username} onBack={() => setShowLeaders(false)} />
          ) : done ? (
            <DoneCard score={score} onClose={close} />
          ) : (
            <GameComponent addScore={(n) => setScore((s) => s + n)} score={score} />
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-black/5 bg-white/60">
          <button
            onClick={loadLeaders}
            className="flex items-center gap-1.5 text-xs font-semibold text-toro-foreground/60 active:scale-95 transition"
          >
            <Trophy className="w-3.5 h-3.5 text-toro-secondary" />
            Tabla de la semana
          </button>
          <button
            onClick={toggleGames}
            className="ml-auto text-[11px] font-semibold text-toro-foreground/40 underline underline-offset-2"
          >
            Apagar juegos
          </button>
          <button
            onClick={close}
            className="text-xs font-bold text-toro-primary px-2 py-1 rounded-lg active:scale-95 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Anillo de progreso del descanso. */
function CountdownRing({ progress, done }: { progress: number; done: boolean }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={done ? "#06D6A0" : "#FF6B6B"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        className="transition-all duration-300 ease-linear"
      />
    </svg>
  )
}

function DoneCard({ score, onClose }: { score: number; onClose: () => void }) {
  return (
    <div className="min-h-[150px] rounded-2xl bg-white flex flex-col items-center justify-center gap-2 px-6 text-center animate-scale-in">
      <span className="text-4xl animate-pop">💪</span>
      <p className="font-display text-2xl text-toro-foreground">A la próxima serie</p>
      {score > 0 && (
        <p className="text-sm text-toro-foreground/60">
          Hiciste <span className="font-bold text-toro-primary tabular-nums">{score}</span> puntos descansando
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-1 bg-toro-accent text-white font-bold rounded-xl px-5 py-2 active:scale-95 transition"
      >
        Dale
      </button>
    </div>
  )
}

function Leaderboard({
  rows,
  username,
  onBack,
}: {
  rows: RestGameLeaderRow[]
  username: string
  onBack: () => void
}) {
  return (
    <div className="min-h-[150px] rounded-2xl bg-white p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-toro-foreground/70">Descansos de la semana</span>
        <button onClick={onBack} className="text-[11px] font-semibold text-toro-primary">
          Volver
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-toro-foreground/50 text-center flex-1 flex items-center justify-center px-4">
          Todavía no jugó nadie esta semana. Sé el primero.
        </p>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto scrollbar-slim max-h-[140px]">
          {rows.map((r) => (
            <div
              key={r.username}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                r.username === username ? "bg-toro-primary/10 font-bold text-toro-primary" : "text-toro-foreground/80"
              }`}
            >
              <span className="w-4 text-center tabular-nums opacity-60">{r.position}</span>
              <span className="flex-1 min-w-0 truncate">{r.username}</span>
              <span className="tabular-nums opacity-60">{r.daysPlayed}d</span>
              <span className="tabular-nums font-bold">{r.totalScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, "0")
  return `${m}:${s}`
}

/**
 * Aviso de fin de descanso: vibración + beep.
 *
 * El beep se sintetiza con Web Audio para no sumar un archivo de audio al
 * bundle. Puede fallar si el navegador todavía no vio un gesto del usuario:
 * en la práctica siempre lo vio, porque el descanso arranca cuando se marca
 * una serie como hecha.
 */
function notifyDone() {
  try {
    navigator.vibrate?.([180, 90, 180])
  } catch {
    // El navegador no soporta vibración (iOS): no pasa nada.
  }

  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime

    // Dos tonos cortos ascendentes.
    ;[
      { freq: 880, at: 0 },
      { freq: 1320, at: 0.16 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.14)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + at)
      osc.stop(now + at + 0.16)
    })

    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch {
    // Sin audio disponible: el timer igual avisa visualmente.
  }
}

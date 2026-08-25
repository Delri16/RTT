"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw, Timer, Trophy, Dumbbell } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import UserAvatar from "@/components/user-avatar"
import { argDayKey } from "@/lib/date-utils"
import { gameOfTheDay, DAILY_ROUND_SECONDS } from "@/lib/rest-games"
import { getRestGameLeaderboard, saveRestGameScore } from "@/lib/actions"
import type { RestGameLeaderRow } from "@/lib/global-points"
import ReactionGame from "@/components/routine/rest-games/reaction-game"
import MemoryGame from "@/components/routine/rest-games/memory-game"
import TriviaGame from "@/components/routine/rest-games/trivia-game"
import PrecisionGame from "@/components/routine/rest-games/precision-game"
import type { RestGameKey } from "@/lib/rest-games"

/**
 * El juego del día como pantalla propia (`/descanso`).
 *
 * El mismo juego aparece solo en los descansos entre series, pero ahí dura lo
 * que dure el descanso — que cambia según el ejercicio. Acá la ronda es
 * SIEMPRE de DAILY_ROUND_SECONDS, así los puntajes de la tabla se comparan
 * contra la misma vara.
 */

const GAMES: Record<RestGameKey, React.ComponentType<{ addScore: (n: number) => void; score: number }>> = {
  reaccion: ReactionGame,
  memoria: MemoryGame,
  trivia: TriviaGame,
  precision: PrecisionGame,
}

type Phase = "listo" | "jugando" | "terminado"

export default function DailyGame({ username }: { username: string }) {
  const dayKey = useMemo(() => argDayKey(new Date()), [])
  const game = useMemo(() => gameOfTheDay(dayKey), [dayKey])
  const GameComponent = GAMES[game.key]

  const [phase, setPhase] = useState<Phase>("listo")
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DAILY_ROUND_SECONDS)
  const [leaders, setLeaders] = useState<RestGameLeaderRow[]>([])
  const [round, setRound] = useState(0) // remonta el juego en cada partida

  const endsAtRef = useRef(0)
  const savedRef = useRef(false)

  const mondayKey = useMemo(() => {
    const d = new Date(`${dayKey}T00:00:00-03:00`)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return argDayKey(monday)
  }, [dayKey])

  const loadLeaders = useCallback(() => {
    getRestGameLeaderboard(mondayKey).then((res) => {
      if (res.success) setLeaders(res.rows)
    })
  }, [mondayKey])

  useEffect(() => {
    loadLeaders()
  }, [loadLeaders])

  // Cuenta regresiva contra timestamp absoluto: no se atrasa si el navegador
  // frena los timers (mismo criterio que el timer de descanso).
  useEffect(() => {
    if (phase !== "jugando") return
    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) setPhase("terminado")
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [phase])

  // Guardar el puntaje una sola vez al terminar la ronda.
  useEffect(() => {
    if (phase !== "terminado" || savedRef.current) return
    savedRef.current = true
    if (score > 0) {
      saveRestGameScore({ username, day: dayKey, gameKey: game.key, score }).then(loadLeaders)
    }
  }, [phase, score, username, dayKey, game.key, loadLeaders])

  function start() {
    savedRef.current = false
    setScore(0)
    setLeft(DAILY_ROUND_SECONDS)
    endsAtRef.current = Date.now() + DAILY_ROUND_SECONDS * 1000
    setRound((r) => r + 1)
    setPhase("jugando")
  }

  const mine = leaders.find((l) => l.username === username)

  return (
    <div className="bg-toro-background min-h-full pb-24">
      <RoutineHeader title="Juego del día" subtitle="Igual para todo el grupo" />

      <div className="p-4 space-y-4 max-w-xl mx-auto">
        {/* Portada del juego */}
        <div className="rounded-3xl bg-gradient-to-br from-toro-primary/15 via-toro-secondary/15 to-toro-accent/10 border border-black/5 p-5 text-center shadow-soft">
          <div className="text-5xl leading-none mb-2 animate-float">{game.emoji}</div>
          <h2 className="font-display text-2xl text-toro-foreground leading-tight">{game.name}</h2>
          <p className="text-sm text-toro-foreground/60 mt-1 max-w-xs mx-auto">{game.howTo}</p>

          {phase === "jugando" ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-toro-foreground text-white px-4 py-1.5">
              <Timer className="w-4 h-4" />
              <span className="font-bold tabular-nums">0:{String(left).padStart(2, "0")}</span>
              <span className="text-white/60">·</span>
              <span className="font-bold tabular-nums">{score}</span>
            </div>
          ) : (
            <button
              onClick={start}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-toro-primary text-white font-bold px-5 py-2.5 shadow-glow active:scale-95 transition"
            >
              {phase === "listo" ? (
                <>
                  <Play className="w-5 h-5 fill-white" /> Jugar {DAILY_ROUND_SECONDS}s
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" /> Otra vez
                </>
              )}
            </button>
          )}
        </div>

        {/* Cancha */}
        {phase === "jugando" && (
          <div className="rounded-2xl bg-white border border-black/5 p-3 shadow-sm animate-scale-in">
            <GameComponent key={round} addScore={(n) => setScore((s) => s + n)} score={score} />
          </div>
        )}

        {phase === "terminado" && (
          <div className="rounded-2xl bg-white border border-black/5 p-5 text-center shadow-sm animate-scale-in">
            <div className="text-4xl mb-1 animate-pop">{score > 0 ? "🎉" : "🫠"}</div>
            <p className="font-display text-3xl text-toro-foreground tabular-nums leading-none">{score}</p>
            <p className="text-sm text-toro-foreground/55 mt-1">
              {mine && score >= mine.bestDay
                ? "Tu mejor puntaje del día. Va a la tabla."
                : "Cuenta tu mejor puntaje de cada día."}
            </p>
          </div>
        )}

        {/* Tabla de la semana */}
        <section>
          <h3 className="font-display text-lg text-toro-foreground mb-2 px-1 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-toro-secondary" /> La tabla de la semana
          </h3>
          {leaders.length === 0 ? (
            <p className="text-sm text-toro-foreground/50 text-center py-8 bg-white rounded-2xl border border-dashed border-black/10">
              Todavía no jugó nadie esta semana. Estrenala vos.
            </p>
          ) : (
            <div className="space-y-1.5 stagger">
              {leaders.map((l) => (
                <div
                  key={l.username}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
                    l.username === username
                      ? "bg-toro-primary/5 border-toro-primary/30 ring-1 ring-toro-primary/20"
                      : "bg-white border-black/5 shadow-sm"
                  }`}
                >
                  <span className="w-6 text-center font-display text-base text-toro-foreground/40 tabular-nums">
                    {l.position}
                  </span>
                  <UserAvatar avatarId="default" username={l.username} size="sm" showTooltip={false} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold text-sm leading-tight truncate ${
                        l.username === username ? "text-toro-primary" : "text-toro-foreground"
                      }`}
                    >
                      {l.username}
                    </p>
                    <p className="text-[11px] text-toro-foreground/45 tabular-nums">
                      {l.daysPlayed} día{l.daysPlayed === 1 ? "" : "s"} · mejor {l.bestDay}
                    </p>
                  </div>
                  <span className="font-display text-lg text-toro-foreground tabular-nums">{l.totalScore}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-start gap-2 rounded-2xl bg-white/60 border border-black/5 px-4 py-3">
          <Dumbbell className="w-4 h-4 text-toro-accent shrink-0 mt-0.5" />
          <p className="text-xs text-toro-foreground/60 leading-relaxed">
            Este mismo juego aparece solo en los descansos entre series cuando entrenás con una rutina. Acá la ronda
            dura siempre {DAILY_ROUND_SECONDS} segundos, así los puntajes se comparan contra la misma vara. De cada día
            cuenta tu mejor intento.
          </p>
        </div>
      </div>
    </div>
  )
}

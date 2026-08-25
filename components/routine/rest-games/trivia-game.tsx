"use client"

import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"
import { triviaForDay } from "@/lib/rest-games"
import { argDayKey } from "@/lib/date-utils"
import type { RestGameProps } from "./types"

/**
 * Trivia de gimnasio y nutrición.
 *
 * Las preguntas del día son las mismas para todos (triviaForDay usa la fecha
 * como semilla), así se pueden comparar los resultados dentro del grupo.
 * Puntaje: 100 por acierto.
 */
export default function TriviaGame({ addScore }: RestGameProps) {
  const questions = useMemo(() => triviaForDay(argDayKey(new Date()), 12), [])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const q = questions[index % questions.length]

  function pick(i: number) {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) {
      setCorrect((c) => c + 1)
      addScore(100)
    }
    setTimeout(() => {
      setPicked(null)
      setIndex((n) => n + 1)
    }, 900)
  }

  return (
    <div className="w-full h-full min-h-[150px] flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-toro-foreground/60 tabular-nums">
          {Math.min(index + 1, questions.length)}/{questions.length}
        </span>
        <span className="text-xs font-semibold text-toro-accent tabular-nums">{correct} ✓</span>
      </div>

      <p className="text-sm font-bold text-toro-foreground leading-snug px-1 text-balance">{q.q}</p>

      <div className="flex flex-col gap-1.5 flex-1 justify-end">
        {q.options.map((opt, i) => {
          const isRight = i === q.answer
          const isPicked = picked === i
          const reveal = picked !== null
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={reveal}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition flex items-center gap-2 ${
                reveal && isRight
                  ? "bg-toro-accent text-white"
                  : reveal && isPicked
                    ? "bg-toro-primary text-white"
                    : "bg-white text-toro-foreground active:scale-[0.98]"
              }`}
            >
              <span className="flex-1 min-w-0">{opt}</span>
              {reveal && isRight && <Check className="w-4 h-4 shrink-0" />}
              {reveal && isPicked && !isRight && <X className="w-4 h-4 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

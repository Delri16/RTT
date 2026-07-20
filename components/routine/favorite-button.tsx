"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { toggleFavoriteExercise } from "@/lib/actions"

/** Estrella para marcar/desmarcar un ejercicio como favorito (optimista). */
export default function FavoriteButton({
  username,
  exerciseId,
  exerciseName,
  favorited,
  onChange,
  className = "",
}: {
  username: string
  exerciseId: string
  exerciseName: string
  favorited: boolean
  onChange?: (favorited: boolean) => void
  className?: string
}) {
  const [state, setState] = useState(favorited)
  const [pending, setPending] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (pending) return
    const next = !state
    setState(next)
    onChange?.(next)
    setPending(true)
    const res = await toggleFavoriteExercise(username, exerciseId, exerciseName)
    setPending(false)
    if (!res.success || res.favorited !== next) {
      setState(res.favorited ?? !next)
      onChange?.(res.favorited ?? !next)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={state ? "Quitar de favoritos" : "Marcar como favorito"}
      aria-pressed={state}
      className={`shrink-0 flex items-center justify-center transition active:scale-90 ${className}`}
    >
      <Star className={`w-5 h-5 ${state ? "fill-toro-secondary text-toro-secondary" : "text-toro-foreground/25"}`} />
    </button>
  )
}

"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Share2, Check, Loader2, ArrowUp } from "lucide-react"
import { sharePR } from "@/lib/actions"

export type PRData = {
  exerciseId: string
  exerciseName: string
  weight: number
  reps: number
  prevWeight: number | null
}

export default function PRCelebration({
  pr,
  username,
  onClose,
}: {
  pr: PRData | null
  username: string
  onClose: () => void
}) {
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function share() {
    if (!pr) return
    setSharing(true)
    setError(null)
    const res = await sharePR({
      username,
      exercise_id: pr.exerciseId,
      exercise_name: pr.exerciseName,
      weight: pr.weight,
      reps: pr.reps,
      prev_weight: pr.prevWeight,
    })
    setSharing(false)
    if (!res.success) {
      setError(res.error || "No se pudo compartir.")
      return
    }
    setShared(res.sharedTo ?? 0)
  }

  function close() {
    setShared(null)
    setSharing(false)
    setError(null)
    onClose()
  }

  const diff = pr && pr.prevWeight != null ? pr.weight - pr.prevWeight : null

  return (
    <Dialog open={!!pr} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-sm overflow-hidden border-0 p-0 bg-white">
        {/* Confeti / brillos */}
        <div className="relative bg-gradient-to-br from-toro-secondary via-toro-secondary to-toro-accent pt-8 pb-6 px-6 text-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            {["🎉", "⭐", "💥", "🔥", "✨", "🎊"].map((e, i) => (
              <span
                key={i}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${8 + i * 16}%`,
                  top: `${(i % 3) * 18 + 4}%`,
                  animationDelay: `${i * 120}ms`,
                  animationDuration: "1.4s",
                }}
              >
                {e}
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="mx-auto w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg mb-3">
              <Trophy className="w-11 h-11 text-toro-secondary" />
            </div>
            <h2 className="text-2xl font-display text-white drop-shadow">¡Nuevo récord!</h2>
            <p className="text-white/90 font-medium">{pr?.exerciseName}</p>
          </div>
        </div>

        <div className="px-6 pt-5 pb-6">
          <div className="flex items-end justify-center gap-2">
            <span className="text-5xl font-display text-toro-foreground leading-none">{pr?.weight}</span>
            <span className="text-xl font-bold text-toro-foreground/50 mb-1">kg</span>
            <span className="text-base text-toro-foreground/40 mb-1.5">× {pr?.reps}</span>
          </div>

          {diff != null && (
            <div className="mt-2 flex items-center justify-center gap-1 text-toro-accent font-bold">
              <ArrowUp className="w-4 h-4" />
              <span>
                +{Math.round(diff * 10) / 10} kg vs tu anterior ({pr?.prevWeight} kg)
              </span>
            </div>
          )}

          {shared === null ? (
            <div className="mt-5 space-y-2">
              <Button
                onClick={share}
                disabled={sharing}
                className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white h-11"
              >
                {sharing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Share2 className="w-5 h-5 mr-2" /> Compartir en el inicio
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={close} className="w-full text-toro-foreground/60">
                Ahora no
              </Button>
              {error && <p className="text-sm text-toro-primary text-center">{error}</p>}
            </div>
          ) : (
            <div className="mt-5 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-toro-accent font-bold">
                <Check className="w-5 h-5" />
                {shared > 0 ? `¡Compartido en ${shared} grupo${shared > 1 ? "s" : ""}!` : "¡Compartido!"}
              </div>
              <Button onClick={close} className="w-full bg-toro-accent hover:bg-toro-accent/90 text-white">
                Seguir entrenando
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

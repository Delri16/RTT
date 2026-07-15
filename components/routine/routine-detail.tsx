"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Play, Share2, Pencil, Trash2, Dumbbell, Check, Loader2, Users } from "lucide-react"
import RoutineHeader from "@/components/routine/routine-header"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { loadExercises, exerciseThumb, type Exercise } from "@/lib/exercise-catalog"
import { deleteRoutine, shareRoutine, type Routine } from "@/lib/actions"

export default function RoutineDetail({ routine, username }: { routine: Routine; username: string }) {
  const router = useRouter()
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmShare, setConfirmShare] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareResult, setShareResult] = useState<string | null>(null)

  useEffect(() => {
    loadExercises().then((all) => {
      const map = new Map<string, Exercise>()
      for (const ex of routine.exercises) {
        const found = all.find((e) => e.id === ex.exercise_id)
        if (found) map.set(ex.exercise_id, found)
      }
      setCatalog(map)
    })
  }, [routine])

  async function share() {
    setSharing(true)
    const res = await shareRoutine(routine.id, username)
    setSharing(false)
    setConfirmShare(false)
    setShareResult(
      res.success
        ? `Compartida en ${res.sharedTo} grupo${res.sharedTo === 1 ? "" : "s"} 🎉`
        : res.error || "No se pudo compartir.",
    )
    setTimeout(() => setShareResult(null), 3500)
  }

  async function doDelete() {
    setDeleting(true)
    await deleteRoutine(routine.id)
    router.push("/mi-rutina")
  }

  return (
    <div className="bg-toro-background min-h-full pb-28">
      <RoutineHeader
        title={routine.name}
        subtitle={`${routine.exercises.length} ejercicios`}
        back="/mi-rutina"
        right={
          <div className="flex items-center gap-0.5">
            <button onClick={() => setConfirmShare(true)} aria-label="Compartir con mis grupos" className="p-2 rounded-xl text-toro-foreground/60 hover:bg-black/5">
              <Share2 className="w-5 h-5" />
            </button>
            <Link href={`/mi-rutina/${routine.id}/editar`} aria-label="Editar" className="p-2 rounded-xl text-toro-foreground/60 hover:bg-black/5">
              <Pencil className="w-5 h-5" />
            </Link>
            <button onClick={() => setConfirmDel(true)} aria-label="Eliminar" className="p-2 rounded-xl text-toro-foreground/60 hover:bg-black/5">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="p-4 max-w-xl mx-auto">
        {/* Hero */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-toro-primary/10 to-toro-secondary/10 rounded-2xl p-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-4xl shadow-sm shrink-0">
            {routine.emoji}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-display text-toro-foreground leading-tight">{routine.name}</h2>
            {routine.description && <p className="text-sm text-toro-foreground/60 mt-0.5">{routine.description}</p>}
          </div>
        </div>

        {shareResult && (
          <div className="mb-3 text-sm text-toro-accent flex items-center justify-center gap-1.5 text-center">
            <Check className="w-4 h-4 shrink-0" /> {shareResult}
          </div>
        )}

        {/* Ejercicios */}
        <div className="space-y-2">
          {routine.exercises.map((ex, i) => {
            const cat = catalog.get(ex.exercise_id)
            return (
              <div key={ex.exercise_id} className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-2.5 shadow-sm">
                <span className="w-6 text-center font-display text-toro-foreground/30 text-lg shrink-0">{i + 1}</span>
                {cat ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={exerciseThumb(cat) || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-lg object-cover bg-toro-background shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-toro-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-toro-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-toro-foreground text-sm leading-tight truncate">{ex.name}</div>
                  {ex.notes && <div className="text-[11px] text-toro-foreground/50 truncate">{ex.notes}</div>}
                </div>
                {ex.target_sets && ex.target_reps && (
                  <div className="shrink-0 rounded-lg bg-toro-primary/10 text-toro-primary text-xs font-bold px-2.5 py-1.5">
                    {ex.target_sets}×{ex.target_reps}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA fijo: Entrenar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-3 bg-gradient-to-t from-toro-background via-toro-background to-transparent pt-6">
        <div className="max-w-md mx-auto">
          <Link href={`/mi-rutina/${routine.id}/entrenar`}>
            <Button className="w-full py-6 bg-toro-primary hover:bg-toro-primary/90 text-white text-lg font-bold rounded-2xl shadow-lg">
              <Play className="w-6 h-6 mr-2 fill-white" /> Entrenar ahora
            </Button>
          </Link>
        </div>
      </div>

      <AlertDialog open={confirmShare} onOpenChange={setConfirmShare}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-toro-primary" /> ¿Compartir con tus grupos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{routine.name}" va a aparecer en el inicio de tus grupos. Los demás van a poder verla y agregarla como
              rutina propia para editarla a su gusto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sharing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                share()
              }}
              disabled={sharing}
              className="bg-toro-primary hover:bg-toro-primary/90"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Compartir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a borrar "{routine.name}". El historial de series y tus récords no se pierden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={deleting} className="bg-toro-primary hover:bg-toro-primary/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

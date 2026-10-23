"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
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
import { useApp } from "@/app/app-provider"
import { deleteReport } from "@/lib/actions"

/**
 * Tachito para borrar un reporte de peso, con confirmación. Solo se renderiza
 * si el reporte es del usuario logueado (`owner === username`); el server
 * (`deleteReport`) lo vuelve a chequear.
 */
export default function DeleteReportButton({
  reportId,
  owner,
  onDeleted,
  className = "",
}: {
  reportId: string
  owner: string
  onDeleted?: () => void
  className?: string
}) {
  const { username } = useApp()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!username || username !== owner) return null

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setDeleting(true)
    setError(null)
    const res = await deleteReport(reportId, username)
    setDeleting(false)
    if (res.success) {
      setOpen(false)
      onDeleted?.()
    } else {
      setError(res.error || "No se pudo borrar el reporte")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Borrar reporte"
        className={`p-1.5 rounded-lg text-toro-foreground/40 hover:text-red-600 hover:bg-red-50 transition-colors ${className}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <AlertDialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran el peso, las fotos, las reacciones y los comentarios, y se descuentan los puntos que te dio.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel disabled={deleting} className="mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Borrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

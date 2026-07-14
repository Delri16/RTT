"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { compressImage } from "@/lib/image-compression"

interface BodyPhotoCaptureProps {
  onPhotoCapture: (file: File) => void
  isOpen: boolean
  onClose: () => void
}

export function BodyPhotoCapture({ onPhotoCapture, isOpen, onClose }: BodyPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessing(true)
    setError("")

    try {
      // Validar que sea imagen
      if (!file.type.startsWith("image/")) {
        setError("Por favor selecciona una imagen")
        setProcessing(false)
        return
      }

      // Comprimir con error handling robusto
      let compressed: File
      try {
        compressed = await compressImage(file)
      } catch (compressErr) {
        console.error("[compress] error:", compressErr)
        // Si falla compresión, usar el archivo original (ya está comprimido por cámara)
        compressed = file
      }

      // Entregar al padre
      onPhotoCapture(compressed)

      // Limpiar
      if (inputRef.current) {
        inputRef.current.value = ""
      }
      onClose()
    } catch (err) {
      console.error("[camera] error:", err)
      setError("Error al procesar la foto. Intenta de nuevo.")
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
        disabled={processing}
      />

      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-toro-foreground">Foto de Progreso</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setError("")
                inputRef.current?.click()
              }}
              disabled={processing}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-toro-primary hover:bg-toro-primary/90 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {processing ? "Procesando..." : "Tomar Foto"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

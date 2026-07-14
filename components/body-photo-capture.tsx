"use client"

import { useRef, useState } from "react"
import { Camera, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { compressImage } from "@/lib/image-compression"

interface BodyPhotoCaptureProps {
  onPhotoCapture: (file: File) => void
  isOpen: boolean
  onClose: () => void
}

export function BodyPhotoCapture({ onPhotoCapture, isOpen, onClose }: BodyPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const startCamera = async () => {
    try {
      setError("")
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { max: 1280 }, height: { max: 720 } },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.")
      console.error("[camera] getUserMedia error:", err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setCapturedImage(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        setError("No se pudo acceder al canvas")
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL("image/jpeg", 0.9)
      setCapturedImage(imageData)
    } catch (err) {
      setError("Error al capturar foto")
      console.error("[camera] capture error:", err)
    }
  }

  const handleAccept = async () => {
    if (!capturedImage) return

    setLoading(true)
    setError("")

    try {
      const blob = await fetch(capturedImage).then((r) => r.blob())
      const file = new File([blob], "body-photo.jpg", { type: "image/jpeg", lastModified: Date.now() })

      const compressed = await compressImage(file)
      onPhotoCapture(compressed)
      stopCamera()
      onClose()
    } catch (err) {
      setError("Error al procesar la foto. Intenta de nuevo.")
      console.error("[camera] process error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      stopCamera()
      onClose()
    } else if (open && !stream) {
      startCamera()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md p-0 bg-black border-0">
        <DialogTitle className="sr-only">Capturar foto de progreso</DialogTitle>

        <div className="relative w-full bg-black aspect-square overflow-hidden rounded-lg">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {
                      console.warn("[camera] video autoplay blocked")
                    })
                  }
                }}
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 border-2 border-white rounded-lg opacity-50" />
              </div>
            </>
          ) : (
            <img src={capturedImage} alt="preview" className="w-full h-full object-cover" />
          )}
        </div>

        {error && <div className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        <div className="flex gap-3 p-4 bg-gray-900">
          {!capturedImage ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  stopCamera()
                  onClose()
                }}
                className="text-white hover:bg-gray-700"
              >
                <X className="w-6 h-6" />
              </Button>
              <Button
                className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
                onClick={capturePhoto}
              >
                <Camera className="w-5 h-5 mr-2" />
                Capturar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="flex-1 text-white hover:bg-gray-700"
                onClick={() => setCapturedImage(null)}
              >
                Retomar
              </Button>
              <Button
                className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
                onClick={handleAccept}
                disabled={loading}
              >
                <Check className="w-5 h-5 mr-2" />
                {loading ? "Procesando..." : "Aceptar"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

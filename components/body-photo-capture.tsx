"use client"

import { useRef, useState, useEffect } from "react"
import { Camera, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      setError("")
      setCameraReady(false)

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.error("[camera] play error:", e))
          setCameraReady(true)
        }
      }

      setStream(mediaStream)
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Actívalo en configuración."
          : err instanceof Error && err.name === "NotFoundError"
            ? "No se encontró cámara en el dispositivo."
            : "No se pudo acceder a la cámara."

      setError(message)
      console.error("[camera] error:", err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    setCameraReady(false)
    setCapturedImage(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Cámara no lista")
      return
    }

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        setError("Error al acceder al canvas")
        return
      }

      // Usar las dimensiones reales del video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Dibujar el video en el canvas
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

      // Convertir a data URL
      const imageData = canvas.toDataURL("image/jpeg", 0.95)
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
      // Convertir data URL a blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], "body-photo.jpg", { type: "image/jpeg", lastModified: Date.now() })

      // Comprimir
      const compressed = await compressImage(file)

      // Entregar al padre
      onPhotoCapture(compressed)

      // Limpiar y cerrar
      stopCamera()
      onClose()
    } catch (err) {
      setError("Error al procesar la foto. Intenta de nuevo.")
      console.error("[camera] process error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 relative bg-black w-full flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-white text-center">
                  <div className="animate-spin mb-4">
                    <Camera className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-sm">Abriendo cámara...</p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: cameraReady ? "block" : "none" }}
            />

            <canvas ref={canvasRef} className="hidden" />

            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-4/5 border-4 border-toro-primary rounded-2xl opacity-70" />
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="preview" className="w-full h-full object-cover" />
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-900 text-red-100 text-sm">
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-2 p-4 bg-gray-900">
        {!capturedImage ? (
          <>
            <Button
              type="button"
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
              type="button"
              disabled={!cameraReady}
              className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white disabled:opacity-50"
              onClick={capturePhoto}
            >
              <Camera className="w-5 h-5 mr-2" />
              Capturar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              className="flex-1 text-white hover:bg-gray-700"
              onClick={() => setCapturedImage(null)}
            >
              Retomar
            </Button>

            <Button
              type="button"
              disabled={loading}
              className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white disabled:opacity-50"
              onClick={handleAccept}
            >
              <Check className="w-5 h-5 mr-2" />
              {loading ? "Procesando..." : "Aceptar"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

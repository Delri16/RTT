"use client"

import { useRef, useState, useEffect } from "react"
import { Camera, X, Check, RotateCw } from "lucide-react"
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isMirror, setIsMirror] = useState(true)
  const [switchingCamera, setSwitchingCamera] = useState(false)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async (mode: "user" | "environment" = "user") => {
    try {
      setError("")
      setCameraReady(false)

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
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
      setFacingMode(mode)
      setIsMirror(mode === "user")
      setSwitchingCamera(false)
    } catch (err) {
      let message = "No se pudo acceder a la cámara."

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          message = "Permiso de cámara denegado. Actívalo en configuración."
        } else if (err.name === "NotFoundError") {
          message = "No hay cámara disponible en este dispositivo."
        }
      }

      setError(message)
      setSwitchingCamera(false)
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

  const toggleCamera = async () => {
    setSwitchingCamera(true)
    stopCamera()
    await new Promise((r) => setTimeout(r, 300))
    const newMode = facingMode === "user" ? "environment" : "user"
    await startCamera(newMode)
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

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (isMirror) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

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
      const response = await fetch(capturedImage)
      const blob = await response.blob()
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 relative bg-black w-full flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
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
              style={{
                display: cameraReady ? "block" : "none",
                transform: isMirror ? "scaleX(-1)" : "scaleX(1)",
              }}
            />

            <canvas ref={canvasRef} className="hidden" />

            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-4/5 border-4 border-toro-primary rounded-2xl opacity-70" />
              </div>
            )}

            {cameraReady && !capturedImage && (
              <div className="absolute top-4 left-4 z-20">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    stopCamera()
                    onClose()
                  }}
                  className="bg-black/50 text-white hover:bg-black/70 w-12 h-12"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            )}

            {cameraReady && !capturedImage && (
              <div className="absolute top-4 right-4 z-20">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCamera}
                  disabled={switchingCamera}
                  className="bg-black/50 text-white hover:bg-black/70 w-12 h-12 disabled:opacity-50"
                >
                  <RotateCw className="w-6 h-6" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="preview" className="w-full h-full object-cover" />
        )}
      </div>

      {capturedImage && (
        <div className="flex gap-3 p-4 bg-gray-900 z-20">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-white border-white hover:bg-white/10"
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
        </div>
      )}

      {!capturedImage && (
        <div className="flex flex-col gap-4 p-6 bg-gray-900 z-20">
          <button
            type="button"
            disabled={!cameraReady || loading}
            onClick={capturePhoto}
            className="mx-auto w-20 h-20 rounded-full bg-toro-primary hover:bg-toro-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border-4 border-white transition-transform active:scale-95"
            aria-label="Capturar foto"
          />
          <p className="text-white text-center text-sm">Toca el botón para capturar</p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-900 text-red-100 text-sm z-20">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

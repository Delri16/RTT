"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Check, RotateCcw, SwitchCamera, Upload, X } from "lucide-react"
import { compressImage } from "@/lib/image-compression"

interface BodyPhotoCaptureProps {
  onPhotoCapture: (file: File) => void
  isOpen: boolean
  onClose: () => void
}

type Facing = "user" | "environment"

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      // ignore
    }
  })
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || "image/jpeg", lastModified: Date.now() })
}

export function BodyPhotoCapture({ onPhotoCapture, isOpen, onClose }: BodyPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [facing, setFacing] = useState<Facing>("user")
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraFailed, setCameraFailed] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [restartKey, setRestartKey] = useState(0)

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
    setPreviewFile(null)
  }

  const setPreviewFromBlob = (blob: Blob) => {
    const file = blobToFile(blob, `body-${Date.now()}.jpg`)
    const url = URL.createObjectURL(blob)
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = url
    setPreviewUrl(url)
    setPreviewFile(file)
  }

  // Live preview only — Accept never re-decodes a full-res still (that OOM-killed
  // the tab). Capture already scales the video frame to ≤720px JPEG.
  useEffect(() => {
    if (!isOpen) {
      stopStream(streamRef.current)
      streamRef.current = null
      clearPreview()
      setBusy(false)
      setError("")
      setCameraReady(false)
      setCameraFailed(false)
      return
    }

    // Don't restart the stream while reviewing a captured frame
    if (previewUrlRef.current) return

    let cancelled = false
    setError("")
    setCameraReady(false)
    setCameraFailed(false)

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setCameraFailed(true)
        return
      }

      stopStream(streamRef.current)
      streamRef.current = null

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 720, max: 1280 },
            height: { ideal: 960, max: 1280 },
          },
        })

        if (cancelled) {
          stopStream(stream)
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        if (!cancelled) setCameraReady(true)
      } catch (err) {
        console.error("[camera] getUserMedia:", err)
        if (!cancelled) {
          setCameraFailed(true)
          setError("No se pudo abrir la cámara. Subí una foto desde la galería.")
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [isOpen, facing, restartKey])

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const handleClose = () => {
    stopStream(streamRef.current)
    streamRef.current = null
    clearPreview()
    onClose()
  }

  const captureFromVideo = async () => {
    const video = videoRef.current
    if (!video || video.videoWidth < 2) {
      setError("La cámara aún no está lista")
      return
    }

    setBusy(true)
    setError("")

    try {
      const maxSide = 720
      let w = video.videoWidth
      let h = video.videoHeight
      if (w > maxSide || h > maxSide) {
        if (w >= h) {
          h = Math.round((h / w) * maxSide)
          w = maxSide
        } else {
          w = Math.round((w / h) * maxSide)
          h = maxSide
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d", { alpha: false })
      if (!ctx) throw new Error("Canvas unavailable")

      // Mirror selfie so the preview matches what the user saw
      if (facing === "user") {
        ctx.translate(w, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, w, h)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72))
      if (!blob) throw new Error("toBlob failed")

      // Free camera while reviewing — cuts RAM and battery on phones
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraReady(false)

      setPreviewFromBlob(blob)
    } catch (err) {
      console.error("[camera] capture:", err)
      setError("No se pudo capturar. Probá de nuevo.")
    } finally {
      setBusy(false)
    }
  }

  const handleRetake = () => {
    clearPreview()
    setError("")
    setRestartKey((k) => k + 1)
  }

  const handleAccept = () => {
    if (!previewFile || busy) return
    onPhotoCapture(previewFile)
    handleClose()
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Seleccioná una imagen")
      return
    }

    setBusy(true)
    setError("")

    try {
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraReady(false)

      const compressed = await compressImage(file)
      setPreviewFromBlob(compressed)
    } catch (err) {
      console.error("[camera] file pick:", err)
      setError("No se pudo procesar la foto. Probá con otra.")
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white safe-top">
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-semibold">Foto de progreso</h2>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={busy || !!previewUrl || cameraFailed}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"
          aria-label="Cambiar cámara"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Vista previa" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""} ${
                cameraReady ? "opacity-100" : "opacity-0"
              }`}
            />
            {!cameraReady && !cameraFailed && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Abriendo cámara...
              </div>
            )}
            {cameraFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
                <Camera className="w-12 h-12 opacity-60" />
                <p className="text-sm text-white/80">Cámara no disponible en este dispositivo.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-toro-primary text-white font-semibold"
                >
                  <Upload className="w-5 h-5" />
                  Elegir de la galería
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-600/90 text-white text-sm text-center">{error}</div>
      )}

      <div className="px-4 py-5 pb-8 bg-black flex items-center justify-center gap-6">
        {previewUrl ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              disabled={busy}
              className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <RotateCcw className="w-6 h-6" />
              </span>
              <span className="text-xs">Retomar</span>
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy || !previewFile}
              className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-toro-accent text-black">
                <Check className="w-8 h-8" />
              </span>
              <span className="text-xs font-semibold">Usar foto</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <Upload className="w-6 h-6" />
              </span>
              <span className="text-xs">Galería</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <Upload className="w-6 h-6" />
              </span>
              <span className="text-xs">Galería</span>
            </button>
            <button
              type="button"
              onClick={captureFromVideo}
              disabled={busy || !cameraReady}
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
              aria-label="Capturar"
            >
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>
            <div className="w-14" aria-hidden />
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilePick}
        disabled={busy}
      />
    </div>
  )
}

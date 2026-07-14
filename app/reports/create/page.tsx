"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, Scale } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { createReport, getUserGroups } from "@/lib/actions"
import Link from "next/link"
import AchievementToast from "@/components/achievement-toast"
import { checkAndAwardAchievements } from "@/lib/achievements"
import type { Achievement } from "@/lib/achievements"
import { uploadToStorage, makePhotoPath } from "@/lib/upload"
import { BodyPhotoCapture } from "@/components/body-photo-capture"

export default function CreateReportPage() {
  const { username } = useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedGroup = searchParams.get("group")

  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroup || "")
  const [weight, setWeight] = useState("")
  const [bodyPhoto, setBodyPhoto] = useState<File | null>(null)
  const [bodyPreviewUrl, setBodyPreviewUrl] = useState<string | null>(null)
  const bodyPreviewUrlRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null)
  const [uploadStatus, setUploadStatus] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    if (username) {
      loadGroups()
    }
  }, [username])

  useEffect(() => {
    return () => {
      if (bodyPreviewUrlRef.current) URL.revokeObjectURL(bodyPreviewUrlRef.current)
    }
  }, [])

  const loadGroups = async () => {
    if (!username) return

    const result = await getUserGroups(username)
    if (result.success) {
      setGroups(result.groups ?? [])
    }
  }

  const handleBodyPhotoCapture = (file: File) => {
    setBodyPhoto(file)
    if (bodyPreviewUrlRef.current) URL.revokeObjectURL(bodyPreviewUrlRef.current)
    const url = URL.createObjectURL(file)
    bodyPreviewUrlRef.current = url
    setBodyPreviewUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || !weight) {
      setError("Selecciona un grupo e ingresa tu peso")
      return
    }

    setLoading(true)
    setError("")

    try {
      let bodyUrl = ""

      if (bodyPhoto) {
        setUploadStatus("Subiendo foto de progreso...")
        const res = await uploadToStorage(bodyPhoto, "report_photos", makePhotoPath(selectedGroup, username!, "body"))
        if (!res.success) throw new Error(res.error)
        bodyUrl = res.url
      }

      setUploadStatus("Guardando reporte...")
      const result = await createReport({
        username: username!,
        group_id: selectedGroup,
        reported_weight: Number.parseFloat(weight),
        body_photo_url: bodyUrl,
      })

      if (!result.success) {
        setError(result.error || "Error al crear el reporte")
        setUploadStatus("")
        setLoading(false)
        return
      }

      try {
        const newAchievements = await checkAndAwardAchievements(username!, selectedGroup)
        if (newAchievements.length > 0) setNewAchievement(newAchievements[0])
      } catch (err) {
        console.error("Error checking achievements:", err)
      }

      setUploadStatus("¡Listo!")
      setTimeout(() => router.push("/reports"), 700)
    } catch (err) {
      console.error("[report] upload error:", err)
      setError(err instanceof Error ? err.message : "Error inesperado al subir")
      setUploadStatus("")
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-3xl text-toro-foreground font-display">Nuevo Reporte</h1>
      </header>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-toro-primary" />
            Reporte Quincenal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="group">Grupo</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((groupMember) => (
                    <SelectItem key={groupMember.group_id} value={groupMember.group_id}>
                      {groupMember.groups.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weight">Peso Actual (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="body_photo">Foto de Progreso (Opcional)</Label>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition overflow-hidden"
                >
                  {bodyPreviewUrl && bodyPhoto ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bodyPreviewUrl}
                        alt="Vista previa"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="relative z-10 mt-auto w-full bg-black/50 py-2 text-center">
                        <p className="text-sm text-white font-medium">Toca para cambiar</p>
                        <p className="text-xs text-white/80">{(bodyPhoto.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Toca para capturar</span> tu foto de progreso
                      </p>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <BodyPhotoCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onPhotoCapture={handleBodyPhotoCapture} />

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
              disabled={loading}
            >
              {loading ? uploadStatus || "Subiendo..." : "Crear Reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Achievement Toast */}
      <AchievementToast achievement={newAchievement} onClose={() => setNewAchievement(null)} />
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Camera, Scale, Upload } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { createBiWeeklyReport, getUserGroups } from "@/lib/actions"
import Link from "next/link"
import AchievementToast from "@/components/achievement-toast"
import { checkAndAwardAchievements } from "@/lib/achievements"
import type { Achievement } from "@/lib/achievements"
import { compressImage } from "@/lib/image-compression"

export default function CreateReportPage() {
  const { username } = useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedGroup = searchParams.get("group")

  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroup || "")
  const [weight, setWeight] = useState("")
  const [scalePhoto, setScalePhoto] = useState<File | null>(null)
  const [bodyPhoto, setBodyPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    if (username) {
      loadGroups()
    }
  }, [username])

  const loadGroups = async () => {
    if (!username) return

    const result = await getUserGroups(username)
    if (result.success) {
      setGroups(result.groups)
    }
  }

  const handleScalePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScalePhoto(null) // Clear immediately
      setCompressing(true)
      setError("")

      if (e.target) {
        e.target.value = ""
      }

      try {
        const compressed = await compressImage(file, 480, 0.4)
        setScalePhoto(compressed)
      } catch (error) {
        console.error("[v0] Error compressing scale image:", error)
        setError("Error al procesar la imagen. Intenta con una foto más pequeña.")
        setScalePhoto(null)
      } finally {
        setCompressing(false)
      }
    }
  }

  const handleBodyPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBodyPhoto(null) // Clear immediately
      setCompressing(true)
      setError("")

      if (e.target) {
        e.target.value = ""
      }

      try {
        const compressed = await compressImage(file, 480, 0.4)
        setBodyPhoto(compressed)
      } catch (error) {
        console.error("[v0] Error compressing body image:", error)
        setError("Error al procesar la imagen. Intenta con una foto más pequeña.")
        setBodyPhoto(null)
      } finally {
        setCompressing(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || !weight) {
      setError("Selecciona un grupo e ingresa tu peso")
      return
    }

    setLoading(true)
    setError("")

    const uploadId = `upload-${Date.now()}`

    // Emit upload start event
    window.dispatchEvent(
      new CustomEvent("upload:start", {
        detail: { id: uploadId, message: "Subiendo reporte..." },
      }),
    )

    const formData = new FormData()
    formData.append("username", username!)
    formData.append("group_id", selectedGroup)
    formData.append("reported_weight", weight)

    if (scalePhoto) {
      formData.append("scale_photo", scalePhoto)
    }
    if (bodyPhoto) {
      formData.append("body_photo", bodyPhoto)
    }

    // Simulate progress (since we can't track actual upload progress easily)
    const progressInterval = setInterval(() => {
      window.dispatchEvent(
        new CustomEvent("upload:progress", {
          detail: { id: uploadId, progress: Math.min(90, Math.random() * 100) },
        }),
      )
    }, 500)

    try {
      const result = await createBiWeeklyReport(formData)

      clearInterval(progressInterval)

      if (result.success) {
        // Emit upload complete event
        window.dispatchEvent(
          new CustomEvent("upload:complete", {
            detail: { id: uploadId },
          }),
        )

        // Check for new achievements
        try {
          const newAchievements = await checkAndAwardAchievements(username!, selectedGroup)
          if (newAchievements.length > 0) {
            setNewAchievement(newAchievements[0])
          }
        } catch (error) {
          console.error("Error checking achievements:", error)
        }

        // Navigate after a short delay to show success
        setTimeout(() => {
          router.push("/reports")
        }, 1000)
      } else {
        // Emit upload error event
        window.dispatchEvent(
          new CustomEvent("upload:error", {
            detail: { id: uploadId, error: result.error || "Error al crear el reporte" },
          }),
        )
        setError(result.error || "Error al crear el reporte")
      }
    } catch (error) {
      clearInterval(progressInterval)
      window.dispatchEvent(
        new CustomEvent("upload:error", {
          detail: { id: uploadId, error: "Error inesperado al subir" },
        }),
      )
      setError("Error inesperado al subir")
    }

    setLoading(false)
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
              <Label htmlFor="scale_photo">Foto de la Balanza (Opcional)</Label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {compressing ? (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-toro-primary mx-auto mb-2 animate-pulse" />
                        <p className="text-sm text-toro-primary font-medium">Optimizando imagen...</p>
                      </div>
                    ) : scalePhoto ? (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-toro-primary mx-auto mb-2" />
                        <p className="text-sm text-toro-primary font-medium">{scalePhoto.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(scalePhoto.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold">Toca para subir</span> foto de la balanza
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="scale_photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleScalePhotoChange}
                    disabled={compressing}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="body_photo">Foto de Progreso (Opcional)</Label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {compressing ? (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-toro-accent mx-auto mb-2 animate-pulse" />
                        <p className="text-sm text-toro-accent font-medium">Optimizando imagen...</p>
                      </div>
                    ) : bodyPhoto ? (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-toro-accent mx-auto mb-2" />
                        <p className="text-sm text-toro-accent font-medium">{bodyPhoto.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(bodyPhoto.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold">Toca para subir</span> tu foto de progreso
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="body_photo"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleBodyPhotoChange}
                    disabled={compressing}
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
              disabled={loading || compressing}
            >
              {loading ? "Subiendo..." : compressing ? "Optimizando..." : "Crear Reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Achievement Toast */}
      <AchievementToast achievement={newAchievement} onClose={() => setNewAchievement(null)} />
    </div>
  )
}

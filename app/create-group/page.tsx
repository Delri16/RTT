"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Shield, Eye, EyeOff } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { createGroup } from "@/lib/actions"
import Link from "next/link"

export default function CreateGroupPage() {
  const { username } = useApp()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isPublic, setIsPublic] = useState(true)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError("")

    formData.append("created_by", username!)
    formData.append("is_public", isPublic.toString())

    const result = await createGroup(formData)

    if (result.success) {
      router.push("/groups")
    } else {
      setError(result.error || "Error al crear el grupo")
    }

    setLoading(false)
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-3xl text-toro-foreground font-display">Crear Grupo</h1>
      </header>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-toro-primary" />
            Nuevo Grupo de Entrenamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Grupo</Label>
              <Input id="name" name="name" placeholder="Ej: Los Toros del Caribe" required className="mt-1" />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe el objetivo del grupo..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="end_date">Fecha de Finalización (Opcional)</Label>
              <Input id="end_date" name="end_date" type="date" className="mt-1" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? <Eye className="w-5 h-5 text-toro-accent" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
                <div>
                  <Label htmlFor="is_public" className="font-medium">
                    Grupo Público
                  </Label>
                  <p className="text-sm text-gray-600">
                    {isPublic ? "Cualquiera puede ver y unirse a este grupo" : "Solo con código de invitación"}
                  </p>
                </div>
              </div>
              <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

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
              {loading ? "Creando..." : "Crear Grupo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

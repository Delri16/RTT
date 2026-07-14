"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Dumbbell, Clock, Link2, Heart, Zap } from "lucide-react"
import { createGroupActivity } from "@/lib/actions"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function CreateActivityPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activityType, setActivityType] = useState("fixed")
  const [relations, setRelations] = useState<any[]>([])
  const [selectedRelation, setSelectedRelation] = useState("none")
  const [aerobicPct, setAerobicPct] = useState(50)

  useEffect(() => {
    loadActivityRelations()
  }, [])

  const loadActivityRelations = async () => {
    const { data, error } = await supabase.from("activity_relations").select("*").order("name")

    if (!error && data) {
      setRelations(data)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError("")

    formData.append("group_id", groupId)
    formData.append("activity_type", activityType)
    formData.append("aerobic_pct", aerobicPct.toString())

    if (selectedRelation !== "none") {
      formData.append("relation_id", selectedRelation)
    }

    const result = await createGroupActivity(formData)

    if (result.success) {
      router.push(`/groups/${groupId}`)
    } else {
      setError(result.error || "Error al crear la actividad")
    }

    setLoading(false)
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-3xl text-toro-foreground font-display">Nueva Actividad</h1>
      </header>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-toro-primary" />
            Configurar Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la Actividad</Label>
              <Input id="name" name="name" placeholder="Ej: Gym, Cardio, Running..." required className="mt-1" />
            </div>

            <div>
              <Label htmlFor="relation">Actividad Relacionada (Opcional)</Label>
              <Select value={selectedRelation} onValueChange={setSelectedRelation}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona una relación..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Sin relación</span>
                    </div>
                  </SelectItem>
                  {relations.map((relation) => (
                    <SelectItem key={relation.id} value={relation.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        {relation.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                {selectedRelation !== "none"
                  ? "Esta actividad se sincronizará con otros grupos que tengan la misma relación"
                  : "Actividad única de este grupo"}
              </p>
            </div>

            <div>
              <Label htmlFor="activity_type">Tipo de Actividad</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" />
                      Puntos Fijos
                    </div>
                  </SelectItem>
                  <SelectItem value="per_minute">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Por Minutos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                {activityType === "fixed"
                  ? "Actividad tradicional con puntos fijos por completar"
                  : "Actividad que otorga puntos según los minutos realizados"}
              </p>
            </div>

            {activityType === "fixed" ? (
              <div>
                <Label htmlFor="points">Puntos por Actividad</Label>
                <Input id="points" name="points" type="number" placeholder="100" required min="1" className="mt-1" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="points_per_minute">Puntos por Minuto</Label>
                  <Input
                    id="points_per_minute"
                    name="points_per_minute"
                    type="number"
                    step="0.1"
                    placeholder="1.5"
                    required
                    min="0.1"
                    max="10"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">Ejemplo: 1.5 puntos por cada minuto</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_minutes">Mínimo de Minutos</Label>
                    <Input
                      id="min_minutes"
                      name="min_minutes"
                      type="number"
                      placeholder="15"
                      required
                      min="1"
                      max="300"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_minutes">Máximo de Minutos</Label>
                    <Input
                      id="max_minutes"
                      name="max_minutes"
                      type="number"
                      placeholder="120"
                      required
                      min="1"
                      max="600"
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">Define el rango de minutos permitidos para esta actividad</p>
              </div>
            )}

            <div className="pt-2">
              <Label>Composición de la Actividad</Label>
              <div className="flex items-center justify-between text-sm mt-2 mb-2">
                <span className="flex items-center gap-1 text-rose-500 font-medium">
                  <Heart className="w-4 h-4" /> Aeróbico {aerobicPct}%
                </span>
                <span className="flex items-center gap-1 text-indigo-500 font-medium">
                  Fuerza {100 - aerobicPct}% <Zap className="w-4 h-4" />
                </span>
              </div>
              <Slider
                value={[aerobicPct]}
                onValueChange={(v) => setAerobicPct(v[0])}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-sm text-gray-600 mt-2">
                Cuánto de la actividad es cardio vs fuerza. Ej: correr ≈ 90% aeróbico, gym ≈ 10%. Ajusta los puntos
                según el objetivo de cada usuario (bajar/subir/mantener). 50/50 = neutro para todos.
              </p>
            </div>

            {selectedRelation !== "none" && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Actividad Relacionada</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Al registrar esta actividad, se sumará automáticamente en todos tus grupos que tengan actividades
                      relacionadas con "{relations.find((r) => r.id.toString() === selectedRelation)?.name}".
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Para el total en tu dashboard, solo contará el grupo que más puntos otorgue.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
              {loading ? "Creando..." : "Crear Actividad"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

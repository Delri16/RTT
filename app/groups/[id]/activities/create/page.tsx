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
import SportIconPicker from "@/components/sport-icon-picker"
import { isOtherActivityName, sportEmoji, sportLabel } from "@/lib/sport-icons"

export default function CreateActivityPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activityType, setActivityType] = useState("fixed")
  const [relations, setRelations] = useState<any[]>([])
  const [aerobicPct, setAerobicPct] = useState(50)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState<string | null>(null)

  // Las actividades genéricas ("Otros", "Otra actividad"...) no llevan ícono fijo:
  // el deporte se elige al registrar cada vez.
  const isGeneric = isOtherActivityName(name)
  // La relación (y con ella el puntaje de la tabla general) sale del deporte
  // elegido: activity_relations.sport_key es el puente con SPORT_ICONS.
  const relationForIcon = icon ? relations.find((r) => r.sport_key === icon) : undefined

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

    // El deporte es obligatorio salvo en las genéricas ("Otros"), donde se elige
    // al registrar cada vez.
    if (!isGeneric && !icon) {
      setError("Elegí el deporte de la actividad: define cuánto suma en la tabla general")
      setLoading(false)
      return
    }

    formData.append("group_id", groupId)
    formData.append("activity_type", activityType)
    formData.append("aerobic_pct", aerobicPct.toString())
    formData.append("icon", isGeneric ? "" : icon ?? "")

    if (relationForIcon) {
      formData.append("relation_id", relationForIcon.id.toString())
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
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Gym, Cardio, Running..."
                required
                className="mt-1"
              />
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

            <div className="pt-2 border-t">
              <Label>
                Ícono del deporte {!isGeneric && <span className="text-toro-foreground/50">(opcional)</span>}
              </Label>
              {isGeneric ? (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900 font-medium">
                    Esta actividad es genérica: el ícono se elige al registrarla
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Como se llama "{name.trim()}", cada vez que alguien la registre va a tener que elegir de qué
                    deporte se trató (fútbol, tenis, surf...). Ese ícono se ve después en Inicio y en el calendario.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mt-1 mb-2">
                    Define cuánto suma esta actividad en la <strong>tabla general</strong> y con qué actividades de tus
                    otros grupos se sincroniza. Los puntos del grupo los seguís configurando abajo.
                    {icon && (
                      <span className="ml-1 font-medium text-toro-foreground">
                        Elegido: {sportEmoji(icon)} {sportLabel(icon)}
                      </span>
                    )}
                  </p>
                  <SportIconPicker value={icon} onChange={setIcon} allowNone={false} />
                </>
              )}
            </div>

            {relationForIcon && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      {sportEmoji(icon)} {relationForIcon.name} · {relationForIcon.global_points} pts en la general
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Al registrarla se anota automáticamente en todos tus grupos que tengan una actividad de este
                      deporte.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 En la tabla general cuenta una sola vez por día, aunque se registre en varios grupos.
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

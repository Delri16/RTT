"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type VoteValue = "yes" | "no" | "neutral"

type Feature = {
  key: string
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    key: "groups",
    title: "Grupos de entrenamiento",
    description: "Crear grupos, unirte por código de invitación o descubrir grupos públicos.",
  },
  {
    key: "activity_logging",
    title: "Registro de actividades con puntos",
    description: "Cargar actividades físicas y sumar puntos configurados por cada grupo.",
  },
  {
    key: "rankings",
    title: "Rankings semanales y totales",
    description: "Tablas de posiciones por semana y acumuladas históricas dentro del grupo.",
  },
  {
    key: "rodeos",
    title: "Rodeos (duelos 1v1 semanales)",
    description: "Competencias semanales cara a cara con standings, rachas y ganadores.",
  },
  {
    key: "weight_reports",
    title: "Reportes de peso con fotos",
    description: "Reportes bisemanales de peso con foto de la balanza y del cuerpo.",
  },
  {
    key: "achievements",
    title: "Sistema de logros",
    description: "Desbloquear logros a medida que cumplís hitos dentro de tus actividades.",
  },
  {
    key: "tagging",
    title: "Etiquetar a otros en una actividad",
    description: "Sumar a otro miembro a tu actividad, que puede aceptarla o rechazarla.",
  },
  {
    key: "requests",
    title: "Solicitudes de edición/eliminación",
    description: "Pedir editar o borrar una actividad, con aprobación de un admin del grupo.",
  },
  {
    key: "notifications",
    title: "Notificaciones in-app y push",
    description: "Avisos de tags, solicitudes y novedades del grupo en tiempo real.",
  },
  {
    key: "pwa",
    title: "App instalable (PWA) y offline",
    description: "Instalar la app en el celular y que funcione básicamente sin conexión.",
  },
]

const VOTE_OPTIONS: { value: VoteValue; label: string }[] = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
  { value: "neutral", label: "Me da igual" },
]

export function FeatureVoteForm() {
  const [votes, setVotes] = useState<Record<string, VoteValue>>({})
  const [suggestion, setSuggestion] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const handleVote = (key: string, value: VoteValue) => {
    setVotes((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setStatus("sending")

    const featureLabels = Object.fromEntries(FEATURES.map((f) => [f.key, f.title]))

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votes, featureLabels, suggestion }),
      })

      if (!res.ok) throw new Error("request failed")
      setStatus("sent")
    } catch {
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center py-8">
        <p className="text-2xl font-display text-toro-accent mb-2">¡Gracias! 🐂</p>
        <p className="text-toro-foreground/70">Tu opinión ya quedó registrada para RTT2.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="rounded-xl border border-toro-foreground/10 bg-white/60 p-4 shadow-sm"
          >
            <p className="font-semibold text-toro-foreground">{feature.title}</p>
            <p className="text-sm text-toro-foreground/60 mb-3">{feature.description}</p>
            <RadioGroup
              className="flex flex-row gap-4"
              value={votes[feature.key]}
              onValueChange={(value) => handleVote(feature.key, value as VoteValue)}
            >
              {VOTE_OPTIONS.map((option) => {
                const inputId = `${feature.key}-${option.value}`
                return (
                  <div key={option.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={option.value} id={inputId} />
                    <Label htmlFor={inputId} className="text-sm font-medium cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="suggestion" className="text-toro-foreground font-semibold">
          ¿Algo más que te gustaría ver en RTT2?
        </Label>
        <Textarea
          id="suggestion"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Contanos qué agregarías, cambiarías o sacarías..."
          className="mt-2 bg-white"
          rows={4}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={status === "sending"}
        className={cn(
          "w-full bg-toro-primary hover:bg-toro-primary/90 text-white font-semibold h-12 text-base",
        )}
      >
        {status === "sending" ? "Enviando..." : "Enviar mi opinión"}
      </Button>

      {status === "error" && (
        <p className="text-sm text-red-500 text-center">
          Algo falló al enviar. Probá de nuevo en un rato.
        </p>
      )}
    </div>
  )
}

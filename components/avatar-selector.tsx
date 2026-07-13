"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"

interface AvatarSelectorProps {
  currentAvatar: string
  onSelect: (avatarId: string) => void
  disabled?: boolean
}

const AVATARS = [
  { id: "default", emoji: "🐂", name: "Toro Clásico", description: "El toro original y poderoso" },
  { id: "strong", emoji: "💪", name: "Toro Fuerte", description: "Fuerza pura y determinación" },
  { id: "fire", emoji: "🔥", name: "Toro Fuego", description: "Pasión ardiente e imparable" },
  { id: "king", emoji: "👑", name: "Toro Rey", description: "Liderazgo y nobleza" },
  { id: "lightning", emoji: "⚡", name: "Toro Rayo", description: "Velocidad eléctrica" },
  { id: "star", emoji: "⭐", name: "Toro Estrella", description: "Brilla con luz propia" },
  { id: "rocket", emoji: "🚀", name: "Toro Cohete", description: "Hacia el infinito y más allá" },
  { id: "champion", emoji: "🏆", name: "Toro Campeón", description: "Siempre en el podio" },
  { id: "diamond", emoji: "💎", name: "Toro Diamante", description: "Resistencia inquebrantable" },
  { id: "ninja", emoji: "🥷", name: "Toro Ninja", description: "Sigilo y precisión mortal" },
  { id: "robot", emoji: "🤖", name: "Toro Robot", description: "Tecnología y eficiencia" },
  { id: "alien", emoji: "👽", name: "Toro Alien", description: "Poder de otro mundo" },
  { id: "bullet", emoji: "🔫", name: "Toro Bala", description: "Rápido como una bala" },
  { id: "train", emoji: "🚄", name: "Toro Bala Tren", description: "Velocidad supersónica" },
  { id: "shark", emoji: "🦈", name: "Toro Tiburón", description: "Feroz y determinado" },
  { id: "eagle", emoji: "🦅", name: "Toro Águila", description: "Visión de águila" },
  { id: "lion", emoji: "🦁", name: "Toro León", description: "Rey de la selva" },
  { id: "tiger", emoji: "🐅", name: "Toro Tigre", description: "Fuerza y agilidad felina" },
  { id: "dragon", emoji: "🐉", name: "Toro Dragón", description: "Poder legendario" },
  { id: "phoenix", emoji: "🔥", name: "Toro Fénix", description: "Renace de las cenizas" },
]

export default function AvatarSelector({ currentAvatar, onSelect, disabled = false }: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleAvatarClick = (avatarId: string) => {
    if (disabled) return
    setSelectedAvatar(avatarId)
    setIsConfirming(true)
  }

  const handleConfirm = () => {
    onSelect(selectedAvatar)
    setIsConfirming(false)
  }

  const handleCancel = () => {
    setSelectedAvatar(currentAvatar)
    setIsConfirming(false)
  }

  const selectedAvatarData = AVATARS.find((a) => a.id === selectedAvatar)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-toro-primary" />
          Selecciona tu Avatar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview del avatar seleccionado */}
        {selectedAvatarData && (
          <div className="text-center p-4 bg-toro-background/50 rounded-lg border-2 border-toro-primary/20">
            <div className="text-6xl mb-2">{selectedAvatarData.emoji}</div>
            <h3 className="font-bold text-lg text-toro-primary">{selectedAvatarData.name}</h3>
            <p className="text-sm text-gray-600">{selectedAvatarData.description}</p>
          </div>
        )}

        {/* Grid de avatares */}
        <div className="grid grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar.id)}
              disabled={disabled}
              className={`
                relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105
                ${
                  selectedAvatar === avatar.id
                    ? "border-toro-primary bg-toro-primary/10 shadow-lg"
                    : "border-gray-200 hover:border-toro-primary/50 hover:bg-toro-background/30"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              title={`${avatar.name} - ${avatar.description}`}
            >
              <div className="text-2xl md:text-3xl">{avatar.emoji}</div>
              {selectedAvatar === avatar.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-toro-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {currentAvatar === avatar.id && selectedAvatar !== avatar.id && (
                <Badge
                  variant="secondary"
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs px-1 py-0"
                >
                  Actual
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Botones de confirmación */}
        {isConfirming && selectedAvatar !== currentAvatar && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleConfirm} className="flex-1 bg-toro-primary hover:bg-toro-primary/90">
              Confirmar Cambio
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1 bg-transparent">
              Cancelar
            </Button>
          </div>
        )}

        {selectedAvatar === currentAvatar && !isConfirming && (
          <div className="text-center text-sm text-gray-500 pt-2 border-t">Este es tu avatar actual</div>
        )}
      </CardContent>
    </Card>
  )
}

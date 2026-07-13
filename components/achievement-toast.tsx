"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Trophy } from "lucide-react"
import type { Achievement } from "@/lib/achievements"

interface AchievementToastProps {
  achievement: Achievement | null
  onClose: () => void
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setIsVisible(true)
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [achievement])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  if (!achievement) return null

  const getTypeColor = (type: string) => {
    switch (type) {
      case "basic":
        return "from-green-400 to-green-600"
      case "intermediate":
        return "from-blue-400 to-blue-600"
      case "hard":
        return "from-purple-400 to-purple-600"
      case "impossible":
        return "from-yellow-400 to-yellow-600"
      default:
        return "from-gray-400 to-gray-600"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "basic":
        return "Básico"
      case "intermediate":
        return "Intermedio"
      case "hard":
        return "Difícil"
      case "impossible":
        return "Imposible"
      default:
        return ""
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <Card className={`bg-gradient-to-r ${getTypeColor(achievement.type)} text-white shadow-lg max-w-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-3xl">{achievement.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">{getTypeLabel(achievement.type)}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight">{achievement.name}</h3>
                <p className="text-sm opacity-90 mt-1">{achievement.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

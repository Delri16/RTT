"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dumbbell, Clock, Zap, Link2, Heart } from "lucide-react"
import { applyGoalMultiplier } from "@/lib/points"

interface Activity {
  id: string
  name: string
  points: number
  activity_type: "fixed" | "per_minute"
  points_per_minute?: number
  min_minutes?: number
  max_minutes?: number
  aerobic_pct?: number
  relation_id?: number
  activity_relations?: {
    name: string
    icon: string
  }
}

interface ActivitySelectorProps {
  activities: Activity[]
  selectedActivity: string
  onActivitySelect: (activityId: string, minutes?: number) => void
  selectedMinutes?: number
  onMinutesChange?: (minutes: number) => void
  goal?: string
}

const GOAL_LABEL: Record<string, string> = {
  lose: "bajar de peso",
  gain: "subir de peso",
  maintain: "mantener",
}

export default function ActivitySelector({
  activities,
  selectedActivity,
  onActivitySelect,
  selectedMinutes,
  onMinutesChange,
  goal = "maintain",
}: ActivitySelectorProps) {
  const [minutesInput, setMinutesInput] = useState<{ [key: string]: number }>({})

  const handleActivityClick = (activity: Activity) => {
    if (activity.activity_type === "per_minute") {
      const defaultMinutes = activity.min_minutes || 15
      setMinutesInput({ ...minutesInput, [activity.id]: defaultMinutes })
      onActivitySelect(activity.id, defaultMinutes)
      onMinutesChange?.(defaultMinutes)
    } else {
      onActivitySelect(activity.id)
    }
  }

  const handleMinutesChange = (activityId: string, minutes: number) => {
    setMinutesInput({ ...minutesInput, [activityId]: minutes })
    onActivitySelect(activityId, minutes)
    onMinutesChange?.(minutes)
  }

  const calculatePoints = (activity: Activity, minutes: number) => {
    if (activity.activity_type === "per_minute" && activity.points_per_minute) {
      return Math.floor(minutes * activity.points_per_minute)
    }
    return activity.points
  }

  // Puntos ya ajustados por el objetivo del usuario (lo que realmente se guarda).
  const finalPoints = (activity: Activity, minutes: number) =>
    applyGoalMultiplier(calculatePoints(activity, minutes), activity.aerobic_pct, goal)

  const aerobic = (activity: Activity) => (typeof activity.aerobic_pct === "number" ? activity.aerobic_pct : 50)

  // Diferencia en puntos que aporta el objetivo (0 si es neutro).
  const goalDelta = (activity: Activity, minutes: number) => finalPoints(activity, minutes) - calculatePoints(activity, minutes)

  const getActivityIcon = (activity: Activity) => {
    return activity.activity_type === "per_minute" ? <Clock className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />
  }

  const getActivityBadge = (activity: Activity, minutes?: number) => {
    if (activity.activity_type === "per_minute" && minutes) {
      const points = finalPoints(activity, minutes)
      return (
        <Badge className="bg-toro-accent text-white flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {points} pts ({minutes} min)
        </Badge>
      )
    }
    return <Badge className="bg-toro-accent text-white">+{finalPoints(activity, 0)} pts</Badge>
  }

  // Línea con la composición (aeróbico/fuerza) y el efecto del objetivo.
  const compositionInfo = (activity: Activity, minutes: number) => {
    const aero = aerobic(activity)
    const delta = goalDelta(activity, minutes)
    const base = calculatePoints(activity, minutes)
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1 text-rose-500">
          <Heart className="w-3 h-3" /> {aero}% aeróbico
        </span>
        <span className="flex items-center gap-1 text-indigo-500">
          <Zap className="w-3 h-3" /> {100 - aero}% fuerza
        </span>
        {goal !== "maintain" && delta !== 0 && (
          <span className={`font-medium ${delta > 0 ? "text-toro-accent" : "text-toro-foreground/50"}`}>
            {delta > 0 ? `+${delta}` : delta} pts por tu objetivo ({GOAL_LABEL[goal]}) · base {base}
          </span>
        )}
        {goal !== "maintain" && delta === 0 && aero === 50 && (
          <span className="text-toro-foreground/50">neutro para tu objetivo</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const isSelected = selectedActivity === activity.id
        const currentMinutes = minutesInput[activity.id] || activity.min_minutes || 15
        const hasRelation = activity.relation_id && activity.activity_relations

        return (
          <Card
            key={activity.id}
            className={`cursor-pointer transition-all ${
              isSelected ? "ring-2 ring-toro-primary bg-toro-primary/5" : "hover:bg-gray-50"
            }`}
            onClick={() => handleActivityClick(activity)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      activity.activity_type === "per_minute"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-toro-primary/20 text-toro-primary"
                    }`}
                  >
                    {getActivityIcon(activity)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-toro-foreground">{activity.name}</span>
                      {hasRelation && (
                        <div className="flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-blue-500" />
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {activity.activity_relations.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {activity.activity_type === "per_minute" ? (
                        <span>
                          {activity.points_per_minute} pts/min • {activity.min_minutes}-{activity.max_minutes} min
                        </span>
                      ) : (
                        <span>{hasRelation ? "Actividad relacionada" : "Actividad del grupo"}</span>
                      )}
                    </div>
                  </div>
                </div>
                {getActivityBadge(activity, isSelected ? currentMinutes : undefined)}
              </div>

              {compositionInfo(activity, activity.activity_type === "per_minute" ? currentMinutes : 0)}

              {hasRelation && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Link2 className="w-3 h-3" />
                    <span>Se registrará en todos tus grupos con "{activity.activity_relations.name}"</span>
                  </div>
                </div>
              )}

              {/* Minutes selector for per_minute activities */}
              {isSelected && activity.activity_type === "per_minute" && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Minutos realizados</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={currentMinutes}
                        onChange={(e) => {
                          const value = Math.max(
                            activity.min_minutes || 1,
                            Math.min(activity.max_minutes || 600, Number.parseInt(e.target.value) || 0),
                          )
                          handleMinutesChange(activity.id, value)
                        }}
                        min={activity.min_minutes}
                        max={activity.max_minutes}
                        className="w-20 h-8 text-center"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                  </div>

                  <div className="px-2">
                    <Slider
                      value={[currentMinutes]}
                      onValueChange={([value]) => handleMinutesChange(activity.id, value)}
                      min={activity.min_minutes || 1}
                      max={activity.max_minutes || 600}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{activity.min_minutes} min</span>
                      <span>{activity.max_minutes} min</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Puntos a obtener:</span>
                      <span className="font-bold text-toro-primary text-lg">
                        {finalPoints(activity, currentMinutes)} pts
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {currentMinutes} min × {activity.points_per_minute} pts/min ={" "}
                      {(currentMinutes * (activity.points_per_minute || 0)).toFixed(1)} →{" "}
                      {calculatePoints(activity, currentMinutes)} pts base
                      {goal !== "maintain" && goalDelta(activity, currentMinutes) !== 0 && (
                        <>
                          {" "}
                          {goalDelta(activity, currentMinutes) > 0 ? "+" : ""}
                          {goalDelta(activity, currentMinutes)} objetivo → {finalPoints(activity, currentMinutes)} pts
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

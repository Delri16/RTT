"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dumbbell, Clock, Zap, Link2 } from "lucide-react"

interface Activity {
  id: string
  name: string
  points: number
  activity_type: "fixed" | "per_minute"
  points_per_minute?: number
  min_minutes?: number
  max_minutes?: number
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
}

export default function ActivitySelector({
  activities,
  selectedActivity,
  onActivitySelect,
  selectedMinutes,
  onMinutesChange,
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

  const getActivityIcon = (activity: Activity) => {
    return activity.activity_type === "per_minute" ? <Clock className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />
  }

  const getActivityBadge = (activity: Activity, minutes?: number) => {
    if (activity.activity_type === "per_minute" && minutes) {
      const points = calculatePoints(activity, minutes)
      return (
        <Badge className="bg-toro-accent text-white flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {points} pts ({minutes} min)
        </Badge>
      )
    }
    return <Badge className="bg-toro-accent text-white">+{activity.points} pts</Badge>
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
                        {calculatePoints(activity, currentMinutes)} pts
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {currentMinutes} min × {activity.points_per_minute} pts/min ={" "}
                      {(currentMinutes * (activity.points_per_minute || 0)).toFixed(1)} →{" "}
                      {calculatePoints(activity, currentMinutes)} pts
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

"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PlusCircle, Dumbbell, Link2, ChevronDown, ChevronUp } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserGroups, logActivity } from "@/lib/actions"
import { supabase } from "@/lib/supabase"
import ActivitySelector from "@/components/activity-selector"
import AchievementToast from "@/components/achievement-toast"
import { checkAndAwardAchievements } from "@/lib/achievements"
import type { Achievement } from "@/lib/achievements"
import MemberTagSelector from "@/components/member-tag-selector"

type GroupRankingUser = {
  username: string
  points: number
}

export default function LogActivityPage() {
  const { username } = useApp()
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState("")
  const [activities, setActivities] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState("")
  const [selectedMinutes, setSelectedMinutes] = useState<number>(0)
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [showMemberSelector, setShowMemberSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null)
  const [groupRanking, setGroupRanking] = useState<GroupRankingUser[]>([])

  const loadGroupRanking = useCallback(async () => {
    if (!selectedGroup) return

    try {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const { data: activities, error } = await supabase
        .from("user_activities")
        .select("username, points_earned")
        .eq("group_id", selectedGroup)
        .gte("completed_at", monday.toISOString())
        .lte("completed_at", sunday.toISOString())

      if (error) {
        console.error("Error loading group ranking:", error)
        setGroupRanking([])
        return
      }

      const userPointsMap = new Map<string, number>()
      activities?.forEach((activity) => {
        const currentPoints = userPointsMap.get(activity.username) || 0
        userPointsMap.set(activity.username, currentPoints + activity.points_earned)
      })

      const ranking = Array.from(userPointsMap.entries())
        .map(([username, points]) => ({ username, points }))
        .sort((a, b) => b.points - a.points)

      setGroupRanking(ranking)
    } catch (error) {
      console.error("Error loading group ranking:", error)
      setGroupRanking([])
    }
  }, [selectedGroup])

  useEffect(() => {
    if (username) {
      loadGroups()
    }
  }, [username])

  useEffect(() => {
    if (selectedGroup) {
      loadActivities()
      // Load initial ranking only when group changes
      loadGroupRanking()
    } else {
      setActivities([])
      setSelectedActivity("")
      setSelectedMinutes(0)
      setGroupRanking([])
    }
  }, [selectedGroup])

  const loadGroups = async () => {
    if (!username) return

    setLoadingGroups(true)

    try {
      const result = await getUserGroups(username)

      if (result.success && result.groups.length > 0) {
        setGroups(result.groups)
        const firstGroupId = result.groups[0].group_id
        setSelectedGroup(firstGroupId)
      } else {
        setGroups([])
      }
    } catch (error) {
      setGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  const loadActivities = async () => {
    if (!selectedGroup) return

    setLoadingActivities(true)

    try {
      const { data, error } = await supabase.from("group_activities").select("*").eq("group_id", selectedGroup)

      if (error) {
        setActivities([])
      } else {
        setActivities(data || [])
      }
    } catch (error) {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }

    setSelectedActivity("")
    setSelectedMinutes(0)
  }

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId)
    setSelectedActivity("")
    setSelectedMinutes(0)
    setTaggedMembers([])
    setShowMemberSelector(false)
  }

  const handleActivitySelect = (activityId: string, minutes?: number) => {
    setSelectedActivity(activityId)
    setSelectedMinutes(minutes || 0)
  }

  const calculateOptimisticRanking = (pointsEarned: number) => {
    if (!username) return null

    const updatedRanking = [...groupRanking]

    const userIndex = updatedRanking.findIndex((u) => u.username === username)

    if (userIndex >= 0) {
      updatedRanking[userIndex] = {
        ...updatedRanking[userIndex],
        points: updatedRanking[userIndex].points + pointsEarned,
      }
    } else {
      updatedRanking.push({ username, points: pointsEarned })
    }

    updatedRanking.sort((a, b) => b.points - a.points)

    const newPosition = updatedRanking.findIndex((u) => u.username === username) + 1
    const userPoints = updatedRanking[newPosition - 1].points

    const firstPlaceUser = updatedRanking[0]
    const thirdPlaceUser = updatedRanking[2]

    const pointsToFirst = newPosition > 1 ? firstPlaceUser.points - userPoints : 0
    const pointsToPodium = newPosition > 3 && thirdPlaceUser ? thirdPlaceUser.points - userPoints + 1 : 0

    return {
      position: newPosition,
      pointsToFirst,
      pointsToPodium,
      firstPlaceUsername: firstPlaceUser.username,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || !selectedActivity) {
      setError("Selecciona un grupo y una actividad")
      return
    }

    const selectedActivityData = activities.find((a) => a.id === selectedActivity)
    if (selectedActivityData?.activity_type === "per_minute") {
      if (!selectedMinutes || selectedMinutes < (selectedActivityData.min_minutes || 1)) {
        setError(`Debes completar al menos ${selectedActivityData.min_minutes} minutos`)
        return
      }
      if (selectedMinutes > (selectedActivityData.max_minutes || 600)) {
        setError(`No puedes registrar más de ${selectedActivityData.max_minutes} minutos`)
        return
      }
    }

    let pointsEarned = 0
    if (selectedActivityData?.activity_type === "per_minute") {
      pointsEarned = selectedMinutes * (selectedActivityData.points_per_minute || 0)
    } else {
      pointsEarned = selectedActivityData?.points || 0
    }

    console.log("[v0] Submitting activity with points:", pointsEarned)

    const optimisticRanking = calculateOptimisticRanking(pointsEarned)

    let successMessage = "¡Actividad registrada exitosamente!"

    if (optimisticRanking) {
      const { position, pointsToFirst, pointsToPodium, firstPlaceUsername } = optimisticRanking

      if (position === 1) {
        successMessage = "🐂 ¡Excelente, sos el toro de la semana, seguí así!"
      } else if (position === 2 || position === 3) {
        successMessage = `💪 ¡Ánimo, estás en el podio pero te faltan ${pointsToFirst} puntos para alcanzar a ${firstPlaceUsername}!`
      } else if (position > 3) {
        successMessage = `🔥 ¡Ponete las pilas, te faltan ${pointsToPodium} puntos para entrar en el podio!`
      }
    }

    if (taggedMembers.length > 0) {
      successMessage += ` Se notificó a ${taggedMembers.length} miembro${taggedMembers.length > 1 ? "s" : ""}.`
    }

    console.log("[v0] Showing instant success message:", successMessage)
    setSuccess(successMessage)
    setSelectedActivity("")
    setSelectedMinutes(0)
    setTaggedMembers([])
    setShowMemberSelector(false)

    const formData = new FormData()
    formData.append("username", username!)
    formData.append("group_id", selectedGroup)
    formData.append("activity_id", selectedActivity)

    if (selectedActivityData?.activity_type === "per_minute") {
      formData.append("minutes_performed", selectedMinutes.toString())
    }

    if (taggedMembers.length > 0) {
      formData.append("tagged_members", JSON.stringify(taggedMembers))
    }

    console.log("[v0] Executing logActivity in background")

    logActivity(formData)
      .then((result) => {
        console.log("[v0] Background logActivity completed:", result)
        if (!result.success) {
          setError(result.error || "Error al registrar la actividad")
          setSuccess("")
        }
        // Ranking will update naturally when user refreshes or navigates
      })
      .catch((error) => {
        console.error("[v0] Background logActivity error:", error)
        setError("Error al registrar la actividad")
        setSuccess("")
      })

    checkAndAwardAchievements(username!, selectedGroup)
      .then((newAchievements) => {
        if (newAchievements.length > 0) {
          setNewAchievement(newAchievements[0])
        }
      })
      .catch((error) => {
        console.error("[v0] Error checking achievements:", error)
      })

    setTimeout(() => setSuccess(""), 5000)
  }

  if (loadingGroups) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="animate-spin w-8 h-8 text-toro-primary mx-auto mb-2" />
          <p className="text-toro-foreground">Cargando grupos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl text-toro-foreground font-display">Registrar Actividad</h1>
        <p className="text-toro-foreground/70">Suma puntos a tu grupo favorito</p>
      </header>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-toro-primary" />
            Nueva Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="group">Seleccionar Grupo</Label>
              <Select value={selectedGroup} onValueChange={handleGroupChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elige un grupo..." />
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

            {selectedGroup && (
              <div>
                <Label>Seleccionar Actividad</Label>
                <div className="mt-2">
                  {loadingActivities ? (
                    <div className="text-center py-4 text-gray-500">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
                      <p>Cargando actividades...</p>
                    </div>
                  ) : activities.length > 0 ? (
                    <ActivitySelector
                      activities={activities}
                      selectedActivity={selectedActivity}
                      onActivitySelect={handleActivitySelect}
                      selectedMinutes={selectedMinutes}
                      onMinutesChange={setSelectedMinutes}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Dumbbell className="w-16 h-16 text-toro-foreground/30 mx-auto mb-4" />
                      <p className="text-toro-foreground/70">No hay actividades disponibles en este grupo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedGroup && selectedActivity && (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-3 bg-transparent"
                  onClick={() => setShowMemberSelector(!showMemberSelector)}
                >
                  <span className="flex items-center gap-2 flex-1 justify-center">
                    {showMemberSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>Etiquetar miembros (opcional)</span>
                    {taggedMembers.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-toro-primary text-white text-xs rounded-full">
                        {taggedMembers.length}
                      </span>
                    )}
                  </span>
                </Button>

                {showMemberSelector && (
                  <MemberTagSelector
                    groupId={selectedGroup}
                    currentUsername={username || ""}
                    selectedMembers={taggedMembers}
                    onMembersChange={setTaggedMembers}
                  />
                )}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-md">
                <p className="text-green-700 text-sm">{success}</p>
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
              disabled={loading || !selectedGroup || !selectedActivity}
            >
              {loading ? (
                <>
                  <Dumbbell className="animate-spin w-5 h-5 mr-2" />
                  Registrando...
                </>
              ) : (
                "Registrar Actividad"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {groups.length === 0 && !loadingGroups && (
        <Card className="bg-white shadow-sm mt-6">
          <CardContent className="p-6 text-center">
            <Dumbbell className="w-16 h-16 text-toro-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-toro-foreground mb-2">No tienes grupos</h3>
            <p className="text-toro-foreground/70">Únete a un grupo para empezar a registrar actividades</p>
            <Button className="mt-4 bg-toro-primary hover:bg-toro-primary/90 text-white">
              <Link2 className="w-5 h-5 mr-2" />
              Unirse a un Grupo
            </Button>
          </CardContent>
        </Card>
      )}

      <AchievementToast achievement={newAchievement} onClose={() => setNewAchievement(null)} />
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trophy, ArrowLeft, Lock, CheckCircle } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserGroups } from "@/lib/actions"
import { generateGroupAchievements, getUserAchievements, checkAchievement } from "@/lib/achievements"
import type { Achievement, UserAchievement } from "@/lib/achievements"

export default function AchievementsPage() {
  const { username } = useApp()
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState("")
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [completedAchievements, setCompletedAchievements] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadGroups()
    }
  }, [username])

  useEffect(() => {
    if (selectedGroup) {
      loadAchievements()
    }
  }, [selectedGroup])

  const loadGroups = async () => {
    if (!username) return

    const result = await getUserGroups(username)
    if (result.success && result.groups.length > 0) {
      setGroups(result.groups)
      setSelectedGroup(result.groups[0].group_id)
    }
    setLoading(false)
  }

  const loadAchievements = async () => {
    if (!selectedGroup || !username) return

    setLoading(true)

    try {
      // Get all achievements for this group
      const allAchievements = await generateGroupAchievements(selectedGroup)
      setAchievements(allAchievements)

      // Get user's completed achievements
      const userAchs = await getUserAchievements(username, selectedGroup)
      setUserAchievements(userAchs)

      // Check which achievements are completed
      const completed = new Set<string>()
      for (const achievement of allAchievements) {
        const isCompleted = await checkAchievement(username, selectedGroup, achievement)
        if (isCompleted) {
          completed.add(achievement.key)
        }
      }
      setCompletedAchievements(completed)
    } catch (error) {
      console.error("Error loading achievements:", error)
    }

    setLoading(false)
  }

  const getAchievementsByType = (type: string) => {
    return achievements.filter((achievement) => achievement.type === type)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "basic":
        return "border-green-200 bg-green-50"
      case "intermediate":
        return "border-blue-200 bg-blue-50"
      case "hard":
        return "border-purple-200 bg-purple-50"
      case "impossible":
        return "border-yellow-200 bg-yellow-50"
      default:
        return "border-gray-200 bg-gray-50"
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

  const getCompletedCount = (type: string) => {
    const typeAchievements = getAchievementsByType(type)
    return typeAchievements.filter((achievement) => completedAchievements.has(achievement.key)).length
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <LoadingSplash />
      </div>
    )
  }

  const selectedGroupData = groups.find((g) => g.group_id === selectedGroup)

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl text-toro-foreground font-display">Logros</h1>
          <p className="text-toro-foreground/70">Tus conquistas como Toro</p>
        </div>
      </header>

      {/* Group Selector */}
      {groups.length > 1 && (
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-4">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
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
          </CardContent>
        </Card>
      )}

      {selectedGroupData && (
        <div className="space-y-6">
          {/* Achievement Categories */}
          {["basic", "intermediate", "hard", "impossible"].map((type) => {
            const typeAchievements = getAchievementsByType(type)
            const completedCount = getCompletedCount(type)

            return (
              <Card key={type} className={`shadow-sm ${getTypeColor(type)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-toro-primary" />
                      <span>{getTypeLabel(type)}</span>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {completedCount}/{typeAchievements.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {typeAchievements.map((achievement) => {
                      const isCompleted = completedAchievements.has(achievement.key)

                      return (
                        <Link
                          key={achievement.key}
                          href={`/achievements/${selectedGroup}/${achievement.key}`}
                          className="block"
                        >
                          <Card
                            className={`transition-all hover:shadow-md ${
                              isCompleted
                                ? "bg-white border-toro-accent shadow-sm"
                                : "bg-gray-100 border-gray-300 opacity-60"
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">{achievement.icon}</div>
                                  <div>
                                    <h3
                                      className={`font-bold ${isCompleted ? "text-toro-foreground" : "text-gray-500"}`}
                                    >
                                      {achievement.name}
                                    </h3>
                                    <p
                                      className={`text-sm ${isCompleted ? "text-toro-foreground/70" : "text-gray-400"}`}
                                    >
                                      {achievement.description}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 text-toro-accent" />
                                  ) : (
                                    <Lock className="w-6 h-6 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {groups.length === 0 && (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No tienes grupos</h3>
            <p className="text-gray-500">Únete a un grupo para empezar a desbloquear logros</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

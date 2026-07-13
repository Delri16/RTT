"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, CheckCircle, Lock, Calendar } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getGroupDetails } from "@/lib/actions"
import { generateGroupAchievements, getUserAchievements, checkAchievement } from "@/lib/achievements"
import type { Achievement, UserAchievement } from "@/lib/achievements"

export default function AchievementDetailPage() {
  const { username } = useApp()
  const params = useParams()
  const groupId = params.groupId as string
  const achievementKey = params.achievementKey as string

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [achievement, setAchievement] = useState<Achievement | null>(null)
  const [completedMembers, setCompletedMembers] = useState<string[]>([])
  const [memberAchievements, setMemberAchievements] = useState<{ [key: string]: UserAchievement[] }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (groupId && achievementKey && username) {
      loadAchievementDetail()
    }
  }, [groupId, achievementKey, username])

  const loadAchievementDetail = async () => {
    setLoading(true)

    try {
      // Get group details
      const groupResult = await getGroupDetails(groupId)
      if (groupResult.success) {
        setGroup(groupResult.group)
        setMembers(groupResult.members)
      }

      // Get all achievements for this group
      const allAchievements = await generateGroupAchievements(groupId)
      const targetAchievement = allAchievements.find((a) => a.key === achievementKey)
      setAchievement(targetAchievement || null)

      if (targetAchievement && groupResult.success) {
        // Check which members have completed this achievement
        const completed: string[] = []
        const memberAchs: { [key: string]: UserAchievement[] } = {}

        for (const member of groupResult.members) {
          const memberUsername = member.username

          // Get member's achievements
          const userAchs = await getUserAchievements(memberUsername, groupId)
          memberAchs[memberUsername] = userAchs

          // Check if member completed this specific achievement
          const isCompleted = await checkAchievement(memberUsername, groupId, targetAchievement)
          if (isCompleted) {
            completed.push(memberUsername)
          }
        }

        setCompletedMembers(completed)
        setMemberAchievements(memberAchs)
      }
    } catch (error) {
      console.error("Error loading achievement detail:", error)
    }

    setLoading(false)
  }

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

  const getCompletionDate = (memberUsername: string): string | null => {
    const userAchs = memberAchievements[memberUsername] || []
    const completedAch = userAchs.find((ach) => ach.achievement_key === achievementKey)
    return completedAch ? completedAch.completed_at : null
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <Trophy className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  if (!achievement || !group) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">Logro no encontrado</h3>
          <Link href="/achievements">
            <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">Volver a Logros</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isCurrentUserCompleted = completedMembers.includes(username!)
  const completionPercentage = Math.round((completedMembers.length / members.length) * 100)

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/achievements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl text-toro-foreground font-display">Detalle del Logro</h1>
          <p className="text-toro-foreground/70">{group.name}</p>
        </div>
      </header>

      {/* Achievement Header */}
      <Card className={`bg-gradient-to-r ${getTypeColor(achievement.type)} text-white shadow-lg mb-6`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{achievement.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30">{getTypeLabel(achievement.type)}</Badge>
                {isCurrentUserCompleted && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completado
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold mb-2">{achievement.name}</h2>
              <p className="text-white/90 mb-4">{achievement.description}</p>
              {achievement.activityName && (
                <p className="text-white/80 text-sm">
                  Actividad: <span className="font-medium">{achievement.activityName}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Stats */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6 text-toro-accent" />
            Estadísticas de Completado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-toro-accent/10 rounded-lg">
              <div className="text-3xl font-bold text-toro-accent">{completedMembers.length}</div>
              <div className="text-sm text-toro-foreground/70">Miembros completaron</div>
            </div>
            <div className="text-center p-4 bg-toro-primary/10 rounded-lg">
              <div className="text-3xl font-bold text-toro-primary">{completionPercentage}%</div>
              <div className="text-sm text-toro-foreground/70">Del grupo</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-toro-secondary" />
            Miembros del Grupo ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const isCompleted = completedMembers.includes(member.username)
              const completionDate = getCompletionDate(member.username)
              const isCurrentUser = member.username === username

              return (
                <div
                  key={member.username}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    isCompleted ? "bg-green-50 border-2 border-green-200" : "bg-gray-50 border-2 border-gray-200"
                  } ${isCurrentUser ? "ring-2 ring-toro-primary" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-green-200" : "bg-gray-200"
                      }`}
                    >
                      <span className={`font-bold text-lg ${isCompleted ? "text-green-700" : "text-gray-500"}`}>
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isCompleted ? "text-green-800" : "text-gray-700"}`}>
                          {member.username}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Tú
                          </Badge>
                        )}
                        {member.is_admin && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Admin
                          </Badge>
                        )}
                      </div>
                      {completionDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">
                            Completado el {new Date(completionDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

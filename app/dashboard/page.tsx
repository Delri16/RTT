"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, Target, Trophy, PlusCircle, User, History } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getWeeklyPoints, getRecentActivities } from "@/lib/actions"
import { supabase } from "@/lib/supabase"
import MotivationalQuote from "@/components/motivational-quote"
import NotificationPrompt from "@/components/notification-prompt"
import { formatActivityDate, formatTime } from "@/lib/date-utils"
import DebugPanel from "@/components/debug-panel"

export default function DashboardPage() {
  const { username } = useApp()
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadDashboardData()
    }
  }, [username])

  const loadDashboardData = async () => {
    if (!username) return

    setLoading(true)

    // Load profile data
    const { data: profileData } = await supabase.from("profiles").select("*").eq("username", username).single()
    setProfile(profileData)

    // Load other data
    const [points, activities] = await Promise.all([getWeeklyPoints(username), getRecentActivities(username)])

    setWeeklyPoints(points)
    setRecentActivities(activities)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <Dumbbell className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  const weightDifference =
    profile?.current_weight && profile?.target_weight ? profile.current_weight - profile.target_weight : null

  const hasWeightGoal = profile?.target_weight && profile?.current_weight

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <p className="text-md text-toro-foreground/80">Bienvenido de nuevo,</p>
          <h1 className="text-3xl text-toro-foreground font-display">{username}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon">
              <User className="w-6 h-6" />
            </Button>
          </Link>
          <Image src="/logo-header.png" alt="Road to Toro Logo" width={60} height={60} className="rounded-lg" />
        </div>
      </header>

      {/* Notification Prompt */}
      <NotificationPrompt />

      {/* Motivational Quote */}
      <MotivationalQuote />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-toro-accent/20 border-toro-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-toro-accent" /> Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-toro-foreground">{weeklyPoints}</p>
            <p className="text-sm text-toro-foreground/70">esta semana</p>
          </CardContent>
        </Card>

        <Card className="bg-toro-secondary/20 border-toro-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-toro-secondary" /> Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasWeightGoal ? (
              <>
                {Math.abs(weightDifference) < 0.1 ? (
                  <>
                    <p className="text-4xl font-bold text-green-600">✓</p>
                    <p className="text-sm text-toro-foreground/70">meta alcanzada</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-toro-foreground">{Math.abs(weightDifference).toFixed(1)}</p>
                    <p className="text-sm text-toro-foreground/70">
                      kg {profile.target_weight > profile.current_weight ? "por subir" : "por bajar"}
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-toro-foreground">--</p>
                <p className="text-sm text-toro-foreground/70">
                  <Link href="/profile" className="text-toro-secondary underline">
                    Configurar meta
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress Card */}
      {hasWeightGoal && (
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Peso Actual → Objetivo</p>
                <p className="text-xl font-bold text-toro-foreground">
                  {profile.current_weight} kg → {profile.target_weight} kg
                </p>
              </div>
              <div className="text-right">
                {Math.abs(weightDifference) < 0.1 ? (
                  <div className="text-green-600">
                    <p className="text-2xl font-bold">🎯</p>
                    <p className="text-sm">¡Perfecto!</p>
                  </div>
                ) : profile.target_weight > profile.current_weight ? (
                  // Necesita SUBIR de peso
                  <div className="text-toro-primary">
                    <p className="text-2xl font-bold">+{Math.abs(weightDifference).toFixed(1)}</p>
                    <p className="text-sm">kg por subir</p>
                  </div>
                ) : (
                  // Necesita BAJAR de peso
                  <div className="text-toro-primary">
                    <p className="text-2xl font-bold">-{weightDifference.toFixed(1)}</p>
                    <p className="text-sm">kg por bajar</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl text-toro-foreground font-display">Actividad Reciente</h2>
          <Link href="/activities/history">
            <Button variant="outline" size="sm" className="bg-transparent">
              <History className="w-4 h-4 mr-1" />
              Ver Todo
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <Card key={index} className="bg-white shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Dumbbell className="w-6 h-6 text-toro-primary" />
                      <div>
                        <span className="font-bold text-toro-foreground block">{activity.group_activities?.name}</span>
                        <span className="text-sm text-toro-foreground/70">{activity.groups?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-toro-accent block">+{activity.points_earned} pts</span>
                      <div className="text-xs text-toro-foreground/60 mt-1">
                        <span className="block">{formatActivityDate(activity.completed_at)}</span>
                        <span className="text-toro-foreground/50">{formatTime(activity.completed_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-toro-foreground/70">No hay actividades registradas aún</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Link href="/log">
        <Button className="w-full h-16 text-xl bg-toro-primary hover:bg-toro-primary/90 text-white font-display flex items-center gap-2">
          <PlusCircle className="w-8 h-8" />
          Registrar Actividad
        </Button>
      </Link>

      {/* Debug Panel - Solo para Santi */}
      {username === "Santi" && (
        <Card className="bg-red-50 border-red-200 shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="text-red-700 text-sm">🐛 Panel Debug - Solo Santi</CardTitle>
          </CardHeader>
          <CardContent>
            <DebugPanel />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

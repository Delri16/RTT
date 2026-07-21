"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Activity, Users, TrendingUp, Calendar, Scale, Dumbbell } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApp } from "@/app/app-provider"
import { getUserProfile, getUserGroups, getUserActivities, getUserWeightReports } from "@/lib/actions"
import UserAvatar from "@/components/user-avatar"
import PublicRoutineTab from "@/components/routine/public-routine-tab"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default function UserProfilePage() {
  const { username: currentUser } = useApp()
  const params = useParams()
  const username = decodeURIComponent(params.username as string)

  const [profile, setProfile] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [weightReports, setWeightReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadUserData()
    }
  }, [username])

  const loadUserData = async () => {
    try {
      // Load user profile
      const profileResult = await getUserProfile(username)
      if (profileResult.success) {
        setProfile(profileResult.profile)
      }

      // Load user groups
      const groupsResult = await getUserGroups(username)
      if (groupsResult.success) {
        setGroups(groupsResult.groups)
      }

      // Load user activities (last 10)
      const activitiesResult = await getUserActivities(username, 10)
      if (activitiesResult.success) {
        setActivities(activitiesResult.activities)
      }

      // Load weight reports
      const reportsResult = await getUserWeightReports(username)
      if (reportsResult.success) {
        setWeightReports(reportsResult.reports)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <LoadingSplash />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <p className="text-center text-toro-foreground">Usuario no encontrado</p>
      </div>
    )
  }

  const isOwnProfile = currentUser === username

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl text-toro-foreground font-display">
            {isOwnProfile ? "Mi Perfil" : `Perfil de ${username}`}
          </h1>
        </div>
      </header>

      {/* Profile Header */}
      <Card className="bg-white shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <UserAvatar avatarId={profile.avatar_url} username={username} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-toro-foreground">{username}</h2>
              <div className="flex gap-4 mt-2 text-sm text-toro-foreground/70">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{groups.length} grupos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>{activities.length} actividades recientes</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="perfil" className="flex items-center gap-1.5">
            <User className="w-4 h-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="rutina" className="flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4" /> Rutina
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rutina" className="mt-0">
          <PublicRoutineTab username={username} />
        </TabsContent>

        <TabsContent value="perfil" className="mt-0 space-y-6">
      {/* Weight Info */}
      {(profile.current_weight || profile.target_weight) && (
        <Card className="bg-white shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-toro-accent" />
              Información de Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {profile.current_weight && (
                <div className="text-center p-4 bg-toro-background rounded-lg">
                  <div className="text-2xl font-bold text-toro-primary">{profile.current_weight} kg</div>
                  <div className="text-sm text-toro-foreground/70">Peso Actual</div>
                </div>
              )}
              {profile.target_weight && (
                <div className="text-center p-4 bg-toro-background rounded-lg">
                  <div className="text-2xl font-bold text-toro-secondary">{profile.target_weight} kg</div>
                  <div className="text-sm text-toro-foreground/70">Objetivo</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-toro-accent" />
            Grupos ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((groupMember) => (
                <Link key={groupMember.group_id} href={`/groups/${groupMember.group_id}`}>
                  <div className="flex items-center justify-between p-3 bg-toro-background rounded-lg hover:bg-toro-background/80 transition-colors">
                    <div>
                      <div className="font-medium text-toro-foreground">{groupMember.groups.name}</div>
                      <div className="text-sm text-toro-foreground/70">{groupMember.groups.description}</div>
                    </div>
                    <div className="flex gap-2">
                      {groupMember.is_admin && <Badge className="bg-toro-accent text-white text-xs">Admin</Badge>}
                      {groupMember.groups.created_by === username && (
                        <Badge className="bg-toro-secondary text-white text-xs">Creador</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-toro-foreground/70">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pertenece a ningún grupo aún</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-toro-primary" />
            Actividades Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-toro-background rounded-lg">
                  <div>
                    <div className="font-medium text-toro-foreground">{activity.group_activities?.name}</div>
                    <div className="text-sm text-toro-foreground/70">
                      {activity.groups?.name} •{" "}
                      {formatDistanceToNow(new Date(activity.completed_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-toro-primary/10 text-toro-primary">
                    +{activity.points_earned} pts
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-toro-foreground/70">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividades registradas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight Reports History */}
      {weightReports.length > 0 && (
        <Card className="bg-white shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-toro-secondary" />
              Historial de Reportes de Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weightReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-toro-foreground/70" />
                      <span className="font-medium">{new Date(report.report_date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-lg font-bold text-toro-primary">{report.reported_weight} kg</div>
                  </div>

                  {(report.scale_photo_url || report.body_photo_url) && (
                    <div className="grid grid-cols-2 gap-4">
                      {report.scale_photo_url && (
                        <div>
                          <p className="text-sm text-toro-foreground/70 mb-2">Foto de Báscula</p>
                          <img
                            src={report.scale_photo_url || "/placeholder.svg"}
                            alt="Foto de báscula"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      {report.body_photo_url && (
                        <div>
                          <p className="text-sm text-toro-foreground/70 mb-2">Foto de Progreso</p>
                          <img
                            src={report.body_photo_url || "/placeholder.svg"}
                            alt="Foto de progreso"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

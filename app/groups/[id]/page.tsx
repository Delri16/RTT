"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Users, Plus, Settings, Copy, Check, LogOut, Trophy, Share2 } from 'lucide-react'
import { useApp } from "@/app/app-provider"
import { getGroupDetails, leaveGroup, getWeeklyWinners, getGroupWeeklyRecords } from "@/lib/actions"
import ActivityManager from "@/components/activity-manager"
import RankingSelector from "@/components/ranking-selector"
import DownloadApp from "@/components/download-app"
import GroupActivityHistory from "@/components/group-activity-history"
import RodeosTab from "@/components/rodeos-tab"

export default function GroupDetailPage() {
  const { username } = useApp()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupId = params.id as string

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general")

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [weeklyWinners, setWeeklyWinners] = useState<any[]>([])
  const [weeklyRecords, setWeeklyRecords] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (groupId && username) {
      loadGroupData()
    }
  }, [groupId, username])

  const loadGroupData = async () => {
    const result = await getGroupDetails(groupId)
    if (result.success) {
      setGroup(result.group)
      setMembers(result.members)
      setActivities(result.activities)

      const userMember = result.members.find((m) => m.username === username)
      setIsAdmin(userMember?.is_admin || false)
      setIsMember(!!userMember)

      const winners = await getWeeklyWinners(groupId)
      setWeeklyWinners(winners)
      
      const records = await getGroupWeeklyRecords(groupId)
      setWeeklyRecords(records)
    }

    setLoading(false)
  }

  const handleCopyInviteCode = async () => {
    if (group?.invite_code) {
      await navigator.clipboard.writeText(group.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareInvite = async () => {
    if (!group?.invite_code) return
    const link = `${window.location.origin}/join/${group.invite_code}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Unite a ${group.name} en Road to Toro`,
          text: `Te invito a sumarte al grupo "${group.name}" en Road to Toro`,
          url: link,
        })
      } catch {
        // Usuario canceló el share, no hacer nada
      }
      return
    }

    await navigator.clipboard.writeText(link)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const handleLeaveGroup = async () => {
    const result = await leaveGroup(groupId, username!)
    if (result.success) {
      window.location.href = "/groups"
    }
  }

  const handleActivityUpdate = () => {
    loadGroupData()
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/groups/${groupId}?tab=${value}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <Users className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <p className="text-center text-toro-foreground">Grupo no encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/groups">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl text-toro-foreground font-display">{group.name}</h1>
            <p className="text-toro-foreground/70">{group.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isMember && !isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowLeaveConfirm(true)}>
              <LogOut className="w-4 h-4 mr-1" />
              Salir
            </Button>
          )}
          {isAdmin && (
            <Link href={`/groups/${groupId}/manage`}>
              <Button variant="outline" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Group Info */}
      <Card className="bg-white shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="w-6 h-6 text-toro-accent" />
              <span className="font-bold">{members.length} miembros</span>
              {group.is_public && <Badge className="bg-green-100 text-green-700">Público</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {group.end_date && <Badge variant="outline">Hasta {new Date(group.end_date).toLocaleDateString()}</Badge>}
              <Button variant="outline" size="sm" onClick={handleCopyInviteCode}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copiado!" : group.invite_code}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareInvite}>
                {shared ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                {shared ? "Copiado!" : "Compartir"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Record Display */}
      {weeklyRecords.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Trophy className="w-5 h-5 text-amber-600" />
              Récord Semanal del Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {weeklyRecords.map((record, index) => {
                const firstWeek = 29
                const relativeWeek = record.week_number - firstWeek + 1
                
                return (
                  <div
                    key={`${record.username}-${record.week_number}`}
                    className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-amber-100"
                  >
                    <Link
                      href={`/profile/${encodeURIComponent(record.username)}`}
                      className="font-bold text-amber-900 hover:text-amber-700"
                    >
                      {record.username}
                    </Link>
                    <span className="text-amber-600 font-semibold">{record.points} pts</span>
                    <span className="text-amber-500 text-sm">Semana {relativeWeek}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="rodeos" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Rodeos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Download App */}
          <DownloadApp />

          {/* Recent Activity History */}
          <GroupActivityHistory
            groupId={groupId}
            members={members}
            activities={activities}
            currentUsername={username!}
            isAdmin={isAdmin}
          />

          {/* Activities */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Actividades</CardTitle>
              {isAdmin && (
                <Link href={`/groups/${groupId}/activities/create`}>
                  <Button size="sm" className="bg-toro-secondary hover:bg-toro-secondary/90">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <ActivityManager activities={activities} isAdmin={isAdmin} onActivityUpdate={handleActivityUpdate} />
            </CardContent>
          </Card>

          {/* Ranking with Week Filter */}
          <RankingSelector groupId={groupId} currentUsername={username!} />

          {/* Weekly Winners */}
          {weeklyWinners.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Semanas Ganadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold text-toro-foreground">Jugador</th>
                        <th className="text-center py-2 px-3 font-semibold text-toro-foreground">Semanas Ganadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyWinners.map((winner, index) => (
                        <tr key={winner.username} className="border-b border-gray-100">
                          <td className="py-3 px-3">
                            <Link
                              href={`/profile/${encodeURIComponent(winner.username)}`}
                              className="text-toro-primary hover:text-toro-primary/80 font-medium"
                            >
                              {winner.username}
                            </Link>
                          </td>
                          <td className="text-center py-3 px-3">
                            <Badge
                              className={`${
                                index === 0 ? "bg-toro-primary text-white" : "bg-toro-accent/20 text-toro-accent"
                              }`}
                            >
                              {winner.wins}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rodeos">
          <RodeosTab groupId={groupId} username={username!} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Abandonar el grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a dejar de ser miembro de {group.name}. Podés volver a unirte más tarde con el código de invitación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup}>Salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowLeft, Dumbbell, Filter, Calendar, TrendingUp, MoreVertical, Trash2, Edit3, Loader2 } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getAllUserActivities, getUserGroups, createActivityRequest } from "@/lib/actions"
import { formatTime, getRelativeDate, formatFullDate } from "@/lib/date-utils"
import { useToast } from "@/hooks/use-toast"

export default function ActivityHistoryPage() {
  const { username } = useApp()
  const { toast } = useToast()
  const [activities, setActivities] = useState<any[]>([])
  const [filteredActivities, setFilteredActivities] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("all")

  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState<"delete" | "edit_date">("delete")
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [requestReason, setRequestReason] = useState("")
  const [newDate, setNewDate] = useState("")
  const [submittingRequest, setSubmittingRequest] = useState(false)

  useEffect(() => {
    if (username) {
      loadData()
    }
  }, [username])

  useEffect(() => {
    filterActivities()
  }, [activities, selectedGroup, selectedPeriod])

  const loadData = async () => {
    if (!username) return

    setLoading(true)

    const [activitiesResult, groupsResult] = await Promise.all([
      getAllUserActivities(username),
      getUserGroups(username),
    ])

    if (activitiesResult.success) {
      setActivities(activitiesResult.activities)
    }

    if (groupsResult.success) {
      setGroups(groupsResult.groups)
    }

    setLoading(false)
  }

  const filterActivities = () => {
    let filtered = [...activities]

    if (selectedGroup !== "all") {
      filtered = filtered.filter((activity) => activity.group_id === selectedGroup)
    }

    if (selectedPeriod !== "all") {
      const now = new Date()
      const startDate = new Date()

      switch (selectedPeriod) {
        case "today":
          startDate.setHours(0, 0, 0, 0)
          break
        case "week":
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate.setMonth(now.getMonth() - 1)
          break
        case "quarter":
          startDate.setMonth(now.getMonth() - 3)
          break
      }

      filtered = filtered.filter((activity) => new Date(activity.completed_at) >= startDate)
    }

    setFilteredActivities(filtered)
  }

  const handleOpenRequestDialog = (activity: any, type: "delete" | "edit_date") => {
    setSelectedActivity(activity)
    setRequestType(type)
    setRequestReason("")
    setNewDate(activity.completed_at.split("T")[0]) // Set current date as default
    setRequestDialogOpen(true)
  }

  const handleSubmitRequest = async () => {
    if (!selectedActivity) return

    setSubmittingRequest(true)

    try {
      const result = await createActivityRequest(
        selectedActivity.id,
        selectedActivity.group_id,
        requestType,
        requestType === "edit_date" ? newDate : undefined,
        requestReason || undefined,
      )

      if (result.success) {
        toast({
          title: "Solicitud enviada",
          description: `Tu solicitud para ${requestType === "delete" ? "eliminar" : "cambiar la fecha de"} la actividad ha sido enviada al administrador.`,
        })
        setRequestDialogOpen(false)
        setSelectedActivity(null)
        setRequestReason("")
        setNewDate("")
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo enviar la solicitud",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting request:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  const getTotalPoints = () => {
    return filteredActivities.reduce((total, activity) => total + activity.points_earned, 0)
  }

  const getActivityCountByGroup = () => {
    const counts: { [key: string]: number } = {}
    filteredActivities.forEach((activity) => {
      const groupName = activity.groups?.name || "Sin grupo"
      counts[groupName] = (counts[groupName] || 0) + 1
    })
    return counts
  }

  const groupActivitiesByDate = () => {
    const grouped: { [key: string]: any[] } = {}

    filteredActivities.forEach((activity) => {
      const dateKey = activity.completed_at.split("T")[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(activity)
    })

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return sortedDates.map((date) => ({
      date,
      activities: grouped[date].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
    }))
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <Dumbbell className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  const activityCounts = getActivityCountByGroup()
  const groupedByDate = groupActivitiesByDate()

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl text-toro-foreground font-display">Historial de Actividades</h1>
          <p className="text-toro-foreground/70">Tu progreso completo</p>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-toro-accent/20 border-toro-accent">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-toro-accent" />
              <span className="font-bold text-toro-foreground">Total Puntos</span>
            </div>
            <p className="text-3xl font-bold text-toro-foreground">{getTotalPoints()}</p>
            <p className="text-sm text-toro-foreground/70">
              {selectedPeriod === "all" ? "histórico" : "en período seleccionado"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-toro-primary/20 border-toro-primary">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Dumbbell className="w-5 h-5 text-toro-primary" />
              <span className="font-bold text-toro-foreground">Actividades</span>
            </div>
            <p className="text-3xl font-bold text-toro-foreground">{filteredActivities.length}</p>
            <p className="text-sm text-toro-foreground/70">{selectedPeriod === "all" ? "registradas" : "en período"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-toro-secondary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Grupo</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  {groups.map((groupMember) => (
                    <SelectItem key={groupMember.group_id} value={groupMember.group_id}>
                      {groupMember.groups.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Últimos 3 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {Object.keys(activityCounts).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Actividades por grupo:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(activityCounts).map(([groupName, count]) => (
                  <Badge key={groupName} variant="outline" className="text-xs">
                    {groupName}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities by Date */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map(({ date, activities: dayActivities }) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-toro-secondary" />
                <h3 className="text-lg font-bold text-toro-foreground">{getRelativeDate(date)}</h3>
                <span className="text-sm text-toro-foreground/60">{formatFullDate(date)}</span>
              </div>

              <div className="space-y-3 ml-8">
                {dayActivities.map((activity, index) => (
                  <Card key={index} className="bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-toro-primary/20 rounded-full flex items-center justify-center">
                            <Dumbbell className="w-6 h-6 text-toro-primary" />
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-toro-foreground block">
                              {activity.group_activities?.name}
                            </span>
                            <span className="text-sm text-toro-foreground/70">{activity.groups?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-bold text-toro-accent text-lg block">
                              +{activity.points_earned} pts
                            </span>
                            <span className="text-sm text-toro-foreground/60">{formatTime(activity.completed_at)}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenRequestDialog(activity, "edit_date")}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Solicitar cambiar fecha
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenRequestDialog(activity, "delete")}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Solicitar eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No hay actividades</h3>
            <p className="text-gray-500 mb-4">
              {selectedGroup !== "all" || selectedPeriod !== "all"
                ? "No hay actividades que coincidan con los filtros seleccionados"
                : "Aún no has registrado ninguna actividad"}
            </p>
            <Link href="/log">
              <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">
                <Dumbbell className="w-5 h-5 mr-2" />
                Registrar Primera Actividad
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === "delete" ? "Solicitar eliminar actividad" : "Solicitar cambiar fecha"}
            </DialogTitle>
            <DialogDescription>
              {requestType === "delete"
                ? "Esta solicitud será enviada al administrador del grupo para su aprobación."
                : "Solicita cambiar la fecha de esta actividad. El administrador del grupo deberá aprobar el cambio."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedActivity && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedActivity.group_activities?.name}</p>
                <p className="text-sm text-gray-600">{selectedActivity.groups?.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatFullDate(selectedActivity.completed_at.split("T")[0])} -{" "}
                  {formatTime(selectedActivity.completed_at)}
                </p>
              </div>
            )}

            {requestType === "edit_date" && (
              <div>
                <Label htmlFor="new-date">Nueva fecha</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">Razón (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Explica por qué necesitas este cambio..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={submittingRequest}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submittingRequest}>
              {submittingRequest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar solicitud"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

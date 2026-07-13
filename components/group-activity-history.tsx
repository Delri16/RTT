"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import UserAvatar from "@/components/user-avatar"
import {
  getAllGroupActivities,
  createActivityRequest,
  deleteActivityDirectly,
  editActivityDateDirectly,
} from "@/lib/actions"
import {
  Search,
  Filter,
  Calendar,
  User,
  Trophy,
  Activity,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface GroupActivityHistoryProps {
  groupId: string
  members: any[]
  activities: any[]
  currentUsername: string
  isAdmin: boolean
}

export default function GroupActivityHistory({
  groupId,
  members,
  activities,
  currentUsername,
  isAdmin,
}: GroupActivityHistoryProps) {
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [filteredActivities, setFilteredActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState("all")
  const [selectedActivity, setSelectedActivity] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [activitiesToShow, setActivitiesToShow] = useState(3)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState<"delete" | "edit_date">("delete")
  const [selectedActivityForRequest, setSelectedActivityForRequest] = useState<any>(null)
  const [requestReason, setRequestReason] = useState("")
  const [newDate, setNewDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadActivities()
  }, [groupId])

  useEffect(() => {
    applyFilters()
  }, [allActivities, searchTerm, selectedMember, selectedActivity, dateFilter])

  const loadActivities = async () => {
    try {
      const result = await getAllGroupActivities(groupId)
      if (result.success) {
        setAllActivities(result.activities)
      }
    } catch (error) {
      console.error("Error loading activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allActivities]

    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.group_activities?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedMember !== "all") {
      filtered = filtered.filter((activity) => activity.username === selectedMember)
    }

    if (selectedActivity !== "all") {
      filtered = filtered.filter((activity) => activity.activity_id === selectedActivity)
    }

    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter((activity) => new Date(activity.completed_at) >= filterDate)
    }

    setFilteredActivities(filtered)
    setActivitiesToShow(3)
  }

  const getStats = () => {
    const totalActivities = filteredActivities.length
    const totalPoints = filteredActivities.reduce((sum, activity) => sum + activity.points_earned, 0)
    const uniqueMembers = new Set(filteredActivities.map((activity) => activity.username)).size
    const mostPopularActivity = activities.reduce((prev, current) => {
      const prevCount = filteredActivities.filter((a) => a.activity_id === prev.id).length
      const currentCount = filteredActivities.filter((a) => a.activity_id === current.id).length
      return currentCount > prevCount ? current : prev
    }, activities[0])

    return {
      totalActivities,
      totalPoints,
      uniqueMembers,
      mostPopularActivity: mostPopularActivity?.name || "N/A",
    }
  }

  const stats = getStats()

  const displayedActivities = filteredActivities.slice(0, activitiesToShow)
  const hasMoreActivities = filteredActivities.length > activitiesToShow
  const remainingActivities = filteredActivities.length - activitiesToShow

  const loadMore = () => {
    setActivitiesToShow((prev) => prev + 10)
  }

  const showLess = () => {
    setActivitiesToShow(3)
  }

  const handleSubmitRequest = async () => {
    if (!selectedActivityForRequest) return

    setSubmitting(true)
    try {
      const result = await createActivityRequest(
        currentUsername,
        selectedActivityForRequest.id,
        groupId,
        requestType,
        requestType === "edit_date" ? newDate : undefined,
        requestReason || undefined,
      )

      if (result.success) {
        toast({
          title: "Solicitud enviada",
          description: "El administrador revisará tu solicitud pronto.",
        })
        setRequestDialogOpen(false)
        setRequestReason("")
        setNewDate("")
        setSelectedActivityForRequest(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo enviar la solicitud",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminAction = async (activity: any, action: "delete" | "edit_date") => {
    if (action === "delete") {
      if (!confirm("¿Estás seguro de que quieres eliminar esta actividad?")) return

      const result = await deleteActivityDirectly(activity.id, groupId, currentUsername)
      if (result.success) {
        toast({
          title: "Actividad eliminada",
          description: "La actividad ha sido eliminada correctamente.",
        })
        loadActivities()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar la actividad",
          variant: "destructive",
        })
      }
    } else if (action === "edit_date") {
      setSelectedActivityForRequest(activity)
      setRequestType("edit_date")
      setNewDate(activity.completed_at.split("T")[0])
      setRequestDialogOpen(true)
    }
  }

  const handleAdminDateChange = async () => {
    if (!selectedActivityForRequest || !newDate) return

    setSubmitting(true)
    try {
      const result = await editActivityDateDirectly(selectedActivityForRequest.id, groupId, currentUsername, newDate)
      if (result.success) {
        toast({
          title: "Fecha actualizada",
          description: "La fecha de la actividad ha sido actualizada correctamente.",
        })
        setRequestDialogOpen(false)
        setNewDate("")
        setSelectedActivityForRequest(null)
        loadActivities()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar la fecha",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar la fecha",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openRequestDialog = (activity: any, type: "delete" | "edit_date") => {
    setSelectedActivityForRequest(activity)
    setRequestType(type)
    if (type === "edit_date") {
      setNewDate(activity.completed_at.split("T")[0])
    }
    setRequestDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-toro-primary" />
            <div className="text-2xl font-bold">{stats.totalActivities}</div>
            <div className="text-sm text-gray-600">Actividades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-toro-secondary" />
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <div className="text-sm text-gray-600">Puntos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="w-6 h-6 mx-auto mb-2 text-toro-accent" />
            <div className="text-2xl font-bold">{stats.uniqueMembers}</div>
            <div className="text-sm text-gray-600">Miembros Activos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-sm font-bold truncate">{stats.mostPopularActivity}</div>
            <div className="text-sm text-gray-600">Más Popular</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los miembros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los miembros</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.username} value={member.username}>
                    {member.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las actividades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las actividades</SelectItem>
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las fechas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Historial de Actividades ({filteredActivities.length})
            {activitiesToShow < filteredActivities.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - Mostrando {activitiesToShow} de {filteredActivities.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron actividades con los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${encodeURIComponent(activity.username)}`}>
                      <UserAvatar avatarId={activity.profiles?.avatar_url} username={activity.username} size="md" />
                    </Link>
                    <div>
                      <Link
                        href={`/profile/${encodeURIComponent(activity.username)}`}
                        className="font-medium hover:text-toro-primary transition-colors"
                      >
                        {activity.username}
                      </Link>
                      <div className="text-sm text-gray-600">{activity.group_activities?.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.completed_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-toro-primary/10 text-toro-primary">
                      +{activity.points_earned} pts
                    </Badge>
                    {/* Dropdown menu for activity options */}
                    {(activity.username === currentUsername || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin ? (
                            <>
                              <DropdownMenuItem onClick={() => handleAdminAction(activity, "edit_date")}>
                                <Edit className="mr-2 h-4 w-4" />
                                Cambiar fecha
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAdminAction(activity, "delete")}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => openRequestDialog(activity, "edit_date")}>
                                <Edit className="mr-2 h-4 w-4" />
                                Solicitar cambiar fecha
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openRequestDialog(activity, "delete")}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Solicitar eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}

              {/* Show More/Less Buttons */}
              {(hasMoreActivities || activitiesToShow > 3) && (
                <div className="flex justify-center gap-2 pt-4">
                  {hasMoreActivities && (
                    <Button variant="outline" onClick={loadMore} className="flex items-center gap-2 bg-transparent">
                      <ChevronDown className="w-4 h-4" />
                      Ver 10 más ({remainingActivities > 10 ? "10" : remainingActivities} de {remainingActivities})
                    </Button>
                  )}
                  {activitiesToShow > 3 && (
                    <Button variant="outline" onClick={showLess} className="flex items-center gap-2 bg-transparent">
                      <ChevronUp className="w-4 h-4" />
                      Mostrar menos
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAdmin
                ? requestType === "delete"
                  ? "Eliminar actividad"
                  : "Cambiar fecha de actividad"
                : requestType === "delete"
                  ? "Solicitar eliminar actividad"
                  : "Solicitar cambiar fecha"}
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? requestType === "delete"
                  ? "Esta acción no se puede deshacer."
                  : "Selecciona la nueva fecha para esta actividad."
                : requestType === "delete"
                  ? "El administrador revisará tu solicitud para eliminar esta actividad."
                  : "El administrador revisará tu solicitud para cambiar la fecha de esta actividad."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {requestType === "edit_date" && (
              <div className="space-y-2">
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

            {!isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="reason">Razón (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Explica por qué necesitas este cambio..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={isAdmin && requestType === "edit_date" ? handleAdminDateChange : handleSubmitRequest}
              disabled={submitting || (requestType === "edit_date" && !newDate)}
            >
              {submitting ? "Procesando..." : isAdmin ? "Confirmar" : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

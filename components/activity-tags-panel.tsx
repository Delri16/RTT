"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { UserCheck, Clock, Dumbbell, CheckCircle, XCircle, Users } from "lucide-react"
import { getPendingActivityTags, acceptActivityTag, rejectActivityTag } from "@/lib/actions"
import { useApp } from "@/app/app-provider"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface ActivityTag {
  id: string
  activity_id: string
  group_id: string
  tagged_by: string
  tagged_user: string
  status: string
  created_at: string
  activity?: any
  group?: any
  tagger_profile?: any
}

export default function ActivityTagsPanel() {
  const { username } = useApp()
  const [tags, setTags] = useState<ActivityTag[]>([])
  const [loading, setLoading] = useState(true)
  const [processingTag, setProcessingTag] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<ActivityTag | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    if (username) {
      loadPendingTags()
    }
  }, [username])

  const loadPendingTags = async () => {
    if (!username) return

    setLoading(true)
    const result = await getPendingActivityTags(username)

    if (result.success) {
      setTags(result.tags)
    }
    setLoading(false)
  }

  const handleAccept = async (tag: ActivityTag) => {
    if (!username) return

    setProcessingTag(tag.id)
    const result = await acceptActivityTag(tag.id, username)

    if (result.success) {
      setTags(tags.filter((t) => t.id !== tag.id))
    } else {
      alert(result.error || "Error al aceptar la solicitud")
    }
    setProcessingTag(null)
  }

  const handleRejectClick = (tag: ActivityTag) => {
    setSelectedTag(tag)
    setRejectionReason("")
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!username || !selectedTag) return

    setProcessingTag(selectedTag.id)
    const result = await rejectActivityTag(selectedTag.id, username, rejectionReason)

    if (result.success) {
      setTags(tags.filter((t) => t.id !== selectedTag.id))
      setRejectDialogOpen(false)
      setSelectedTag(null)
    } else {
      alert(result.error || "Error al rechazar la solicitud")
    }
    setProcessingTag(null)
  }

  const formatActivityDetails = (tag: ActivityTag) => {
    const activity = tag.activity
    if (!activity) return "Actividad desconocida"

    const activityName = activity.name || activity.activity_name || "Actividad"
    const points = activity.points_earned || activity.points || 0
    const minutes = activity.minutes_performed || activity.minutes || 0

    if (minutes > 0) {
      return `${activityName} (${minutes} min, ${points} pts)`
    }
    return `${activityName} (${points} pts)`
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es,
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Clock className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tags.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-toro-primary" />
            Solicitudes de Actividades Compartidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tienes solicitudes pendientes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-toro-primary" />
            Solicitudes de Actividades Compartidas
            <Badge variant="secondary" className="ml-auto">
              {tags.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tags.map((tag) => (
              <Card key={tag.id} className="border-2 border-blue-100 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-toro-primary/10 rounded-full flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-toro-primary" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-toro-foreground">
                            {tag.tagged_by} te ha etiquetado en una actividad
                          </p>
                          <p className="text-sm text-gray-600">{tag.group?.name || "Grupo desconocido"}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(tag.created_at)}
                        </Badge>
                      </div>

                      <div className="bg-white rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Dumbbell className="w-4 h-4 text-toro-primary" />
                          <span className="font-medium">{formatActivityDetails(tag)}</span>
                        </div>
                        {tag.activity?.completed_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Realizada:{" "}
                            {new Date(tag.activity.completed_at).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleAccept(tag)}
                          disabled={processingTag === tag.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {processingTag === tag.id ? "Aceptando..." : "Aceptar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleRejectClick(tag)}
                          disabled={processingTag === tag.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que quieres rechazar esta solicitud de actividad compartida?
            </p>
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Explica por qué rechazas esta solicitud..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={processingTag === selectedTag?.id}>
              {processingTag === selectedTag?.id ? "Rechazando..." : "Rechazar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

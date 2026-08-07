"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import UserAvatar from "@/components/user-avatar"
import { UserCheck, Clock, Dumbbell, CheckCircle, XCircle, Users, Trophy, Timer, CalendarDays } from "lucide-react"
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
  activity?: {
    name?: string
    points?: number
    minutes?: number | null
    completed_at?: string
    aerobic_pct?: number
  }
  group?: { id?: string; name?: string }
  taggedBy?: { username?: string; avatar?: string }
  goal?: string
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
      setTags(result.tags as ActivityTag[])
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

  const formatCompletedAt = (dateString?: string) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return null
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-toro-primary shrink-0" />
            Solicitudes pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tenés solicitudes pendientes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-toro-primary shrink-0" />
            <span className="flex-1">Solicitudes pendientes</span>
            <Badge variant="secondary" className="shrink-0">
              {tags.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-4">
            {tags.map((tag) => {
              const completedAt = formatCompletedAt(tag.activity?.completed_at)
              const minutes = tag.activity?.minutes

              return (
                <Card key={tag.id} className="border-2 border-toro-primary/20 bg-toro-background/60 overflow-hidden">
                  <CardContent className="p-3 space-y-3">
                    {/* Quién te etiquetó */}
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarId={tag.taggedBy?.avatar}
                        username={tag.tagged_by}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-toro-foreground leading-snug">
                          <Link
                            href={`/profile/${encodeURIComponent(tag.tagged_by)}`}
                            className="font-bold text-toro-primary hover:underline break-words"
                          >
                            {tag.tagged_by}
                          </Link>{" "}
                          te etiquetó en una actividad
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatDate(tag.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* En qué grupo */}
                    {tag.group?.name && (
                      <Link href={`/groups/${tag.group_id}`}>
                        <Badge
                          variant="outline"
                          className="bg-white border-toro-accent/40 text-toro-foreground max-w-full"
                        >
                          <Users className="w-3 h-3 mr-1 shrink-0" />
                          <span className="truncate">{tag.group.name}</span>
                        </Badge>
                      </Link>
                    )}

                    {/* Qué actividad */}
                    <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-100">
                      <div className="flex items-start gap-2">
                        <Dumbbell className="w-4 h-4 text-toro-primary shrink-0 mt-0.5" />
                        <span className="font-semibold text-sm break-words">{tag.activity?.name || "Actividad"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 bg-toro-accent/10 text-toro-accent font-bold rounded-full px-2 py-1">
                          <Trophy className="w-3 h-3" />
                          {tag.activity?.points ?? 0} pts para vos
                        </span>
                        {minutes ? (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2 py-1">
                            <Timer className="w-3 h-3" />
                            {minutes} min
                          </span>
                        ) : null}
                      </div>
                      {completedAt && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 shrink-0" />
                          Realizada el {completedAt}
                        </p>
                      )}
                      {tag.goal && tag.goal !== "maintain" && (
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Puntos ya ajustados a tu objetivo de {tag.goal === "lose" ? "bajar" : "subir"} de peso.
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                        onClick={() => handleAccept(tag)}
                        disabled={processingTag === tag.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1 shrink-0" />
                        <span className="truncate">{processingTag === tag.id ? "Aceptando..." : "Aceptar"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent w-full"
                        onClick={() => handleRejectClick(tag)}
                        disabled={processingTag === tag.id}
                      >
                        <XCircle className="w-4 h-4 mr-1 shrink-0" />
                        <span className="truncate">Rechazar</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
              ¿Estás seguro de que querés rechazar esta solicitud de actividad compartida?
            </p>
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Explicá por qué rechazás esta solicitud..."
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

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import UserAvatar from "@/components/user-avatar"
import { getPendingRequests, approveActivityRequest, rejectActivityRequest } from "@/lib/actions"
import { Bell, Check, X, Loader2, Calendar, Trash2, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { useApp } from "@/app/app-provider"

interface ActivityRequestsPanelProps {
  groupId: string
}

export default function ActivityRequestsPanel({ groupId }: ActivityRequestsPanelProps) {
  const { username } = useApp()
  const { toast } = useToast()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (username && groupId) {
      loadRequests()
    }
  }, [groupId, username])

  const loadRequests = async () => {
    if (!username) return

    setLoading(true)
    try {
      const result = await getPendingRequests(username, groupId)
      if (result.success) {
        setRequests(result.requests || [])
      } else {
        console.error("Error loading requests:", result.error)
      }
    } catch (error) {
      console.error("Error loading requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReviewDialog = (request: any, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setReviewAction(action)
    setAdminNotes("")
    setReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedRequest || !username) return

    setSubmitting(true)
    try {
      const result =
        reviewAction === "approve"
          ? await approveActivityRequest(username, selectedRequest.id, adminNotes || undefined)
          : await rejectActivityRequest(username, selectedRequest.id, adminNotes || undefined)

      if (result.success) {
        toast({
          title: reviewAction === "approve" ? "Solicitud aprobada" : "Solicitud rechazada",
          description: `La solicitud ha sido ${reviewAction === "approve" ? "aprobada" : "rechazada"} exitosamente.`,
        })
        setReviewDialogOpen(false)
        setSelectedRequest(null)
        setAdminNotes("")
        // Reload requests
        await loadRequests()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo procesar la solicitud",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Solicitudes Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600">No hay solicitudes pendientes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Solicitudes Pendientes
            <Badge variant="destructive" className="ml-2">
              {requests.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarId={request.requester_profile?.avatar_url}
                      username={request.requester_username}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium">{request.requester_username}</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={request.request_type === "delete" ? "destructive" : "secondary"}>
                    {request.request_type === "delete" ? (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3 h-3 mr-1" />
                        Cambiar fecha
                      </>
                    )}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium">{request.activity_name || "Actividad"}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {request.user_activities?.points_earned} puntos •{" "}
                    {new Date(request.user_activities?.completed_at).toLocaleDateString("es-AR")}
                  </p>
                  {request.request_type === "edit_date" && request.new_date && (
                    <p className="text-xs text-toro-primary mt-2">
                      Nueva fecha: {new Date(request.new_date).toLocaleDateString("es-AR")}
                    </p>
                  )}
                </div>

                {request.reason && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-gray-600 italic">{request.reason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                    onClick={() => handleOpenReviewDialog(request, "approve")}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => handleOpenReviewDialog(request, "reject")}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}</DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "Esta acción ejecutará el cambio solicitado inmediatamente."
                : "La solicitud será rechazada y no se realizarán cambios."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedRequest.requester_username}</p>
                <p className="text-sm text-gray-600">{selectedRequest.activity_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedRequest.request_type === "delete" ? "Solicita eliminar" : "Solicita cambiar fecha"}
                </p>
                {selectedRequest.request_type === "edit_date" && selectedRequest.new_date && (
                  <p className="text-xs text-toro-primary mt-1">
                    Nueva fecha: {new Date(selectedRequest.new_date).toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="admin-notes">Notas (opcional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Agrega una nota para el usuario..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting}
              variant={reviewAction === "approve" ? "default" : "destructive"}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : reviewAction === "approve" ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Aprobar
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

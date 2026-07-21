"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft,
  Settings,
  Save,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Copy,
  Check,
  UserMinus,
  Crown,
  Shield,
  RefreshCw,
} from "lucide-react"
import { useApp } from "@/app/app-provider"
import {
  getGroupDetails,
  updateGroup,
  deleteGroup,
  removeGroupMember,
  promoteToAdmin,
  syncRodeoHistory,
} from "@/lib/actions"
import ActivityRequestsPanel from "@/components/activity-requests-panel"

export default function ManageGroupPage() {
  const { username } = useApp()
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<any>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

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

      // Set form values
      setName(result.group.name)
      setDescription(result.group.description || "")
      setEndDate(result.group.end_date || "")
      setIsPublic(result.group.is_public)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    const formData = new FormData()
    formData.append("name", name)
    formData.append("description", description)
    formData.append("end_date", endDate)
    formData.append("is_public", isPublic.toString())

    const result = await updateGroup(groupId, formData)

    if (result.success) {
      setGroup(result.group)
      alert("Grupo actualizado exitosamente")
    } else {
      alert(result.error || "Error al actualizar el grupo")
    }

    setSaving(false)
  }

  const handleDeleteGroup = async () => {
    const result = await deleteGroup(groupId)

    if (result.success) {
      router.push("/groups")
    } else {
      alert(result.error || "Error al eliminar el grupo")
    }

    setDeleteDialogOpen(false)
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    const result = await removeGroupMember(groupId, memberToRemove.username)

    if (result.success) {
      await loadGroupData()
      setRemoveDialogOpen(false)
      setMemberToRemove(null)
    } else {
      alert(result.error || "Error al remover miembro")
    }
  }

  const handlePromoteToAdmin = async (memberUsername: string) => {
    const result = await promoteToAdmin(groupId, memberUsername)

    if (result.success) {
      await loadGroupData()
    } else {
      alert(result.error || "Error al promover miembro")
    }
  }

  const handleCopyInviteCode = async () => {
    if (group?.invite_code) {
      await navigator.clipboard.writeText(group.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSyncHistory = async () => {
    if (
      !confirm(
        "¿Quieres sincronizar el historial de rodeos? Esto agregará los partidos cerrados que faltan en el historial.",
      )
    ) {
      return
    }

    setSyncing(true)

    const result = await syncRodeoHistory(groupId)

    if (result.success) {
      alert(result.message || "Historial sincronizado exitosamente")
    } else {
      alert(result.error || "Error al sincronizar historial")
    }

    setSyncing(false)
  }

  const isCreator = group?.created_by === username
  const userMember = members.find((m) => m.username === username)
  const isAdmin = userMember?.is_admin || false

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isPublic, setIsPublic] = useState(true)

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <LoadingSplash />
      </div>
    )
  }

  if (!group || !isAdmin) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <p className="text-center text-toro-foreground">No tienes permisos para gestionar este grupo</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl text-toro-foreground font-display">Gestionar Grupo</h1>
          <p className="text-toro-foreground/70">{group.name}</p>
        </div>
      </header>

      <div className="mb-6">
        <ActivityRequestsPanel groupId={groupId} />
      </div>

      {/* Group Settings */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-toro-primary" />
            Configuración del Grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Grupo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="end_date">Fecha de Finalización</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? <Eye className="w-5 h-5 text-toro-accent" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
              <div>
                <Label htmlFor="is_public" className="font-medium">
                  Grupo Público
                </Label>
                <p className="text-sm text-gray-600">
                  {isPublic ? "Cualquiera puede ver y unirse a este grupo" : "Solo con código de invitación"}
                </p>
              </div>
            </div>
            <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <Label className="font-medium">Código de Invitación</Label>
              <p className="text-sm text-gray-600">Comparte este código para invitar miembros</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyInviteCode}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : group.invite_code}
            </Button>
          </div>

          <Button
            onClick={handleSave}
            className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
            disabled={saving}
          >
            {saving ? (
              <>
                <Save className="animate-spin w-5 h-5 mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Members Management */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6 text-toro-accent" />
            Miembros del Grupo ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.username} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${encodeURIComponent(member.username)}`}>
                    <div className="w-10 h-10 bg-toro-primary/20 rounded-full flex items-center justify-center hover:bg-toro-primary/30 transition-colors">
                      <span className="font-bold text-toro-primary">{member.username.charAt(0).toUpperCase()}</span>
                    </div>
                  </Link>
                  <div>
                    <Link
                      href={`/profile/${encodeURIComponent(member.username)}`}
                      className="font-medium hover:text-toro-primary transition-colors"
                    >
                      {member.username}
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {member.username === group.created_by && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Creador
                        </Badge>
                      )}
                      {member.is_admin && member.username !== group.created_by && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {member.username !== username && member.username !== group.created_by && (
                  <div className="flex gap-2">
                    {!member.is_admin && isCreator && (
                      <Button size="sm" variant="outline" onClick={() => handlePromoteToAdmin(member.username)}>
                        <Shield className="w-4 h-4 mr-1" />
                        Hacer Admin
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMemberToRemove(member)
                        setRemoveDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rodeo History Sync Card for admins */}
      <Card className="bg-blue-50 border-blue-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <RefreshCw className="w-6 h-6" />
            Sincronizar Historial de Rodeos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-600 mb-4">
            Si algunos partidos cerrados no aparecen en el historial de rodeos, usa este botón para sincronizarlos
            manualmente.
          </p>
          <Button onClick={handleSyncHistory} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 text-white">
            {syncing ? (
              <>
                <RefreshCw className="animate-spin w-5 h-5 mr-2" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Sincronizar Historial
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isCreator && (
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-6 h-6" />
              Zona de Peligro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              Eliminar el grupo es una acción permanente. Todos los datos, actividades y reportes se perderán.
            </p>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-5 h-5 mr-2" />
              Eliminar Grupo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Group Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Estás seguro de que quieres eliminar el grupo <strong>"{group.name}"</strong>?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer. Se eliminarán todos los datos, actividades, reportes y miembros.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteGroup}>
                Eliminar Grupo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Estás seguro de que quieres remover a <strong>{memberToRemove?.username}</strong> del grupo?
            </p>
            <p className="text-sm text-gray-600">
              El usuario podrá volver a unirse si el grupo es público o tiene el código de invitación.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRemoveMember}>
                Remover Miembro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

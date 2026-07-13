"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2, Save, X, Dumbbell, Clock } from "lucide-react"
import { updateGroupActivity, deleteGroupActivity } from "@/lib/actions"

interface Activity {
  id: string
  name: string
  points: number
  activity_type: "fixed" | "per_minute"
  points_per_minute?: number
  min_minutes?: number
  max_minutes?: number
}

interface ActivityManagerProps {
  activities: Activity[]
  isAdmin: boolean
  onActivityUpdate: () => void
}

export default function ActivityManager({ activities, isAdmin, onActivityUpdate }: ActivityManagerProps) {
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)

  const startEdit = (activity: Activity) => {
    setEditingActivity(activity.id)
    setEditData({
      name: activity.name,
      points: activity.points.toString(),
      activity_type: activity.activity_type,
      points_per_minute: activity.points_per_minute?.toString() || "",
      min_minutes: activity.min_minutes?.toString() || "",
      max_minutes: activity.max_minutes?.toString() || "",
    })
  }

  const cancelEdit = () => {
    setEditingActivity(null)
    setEditData({})
  }

  const saveEdit = async (activityId: string) => {
    if (!editData.name?.trim()) return

    setLoading(true)
    const formData = new FormData()
    formData.append("name", editData.name.trim())
    formData.append("activity_type", editData.activity_type)

    if (editData.activity_type === "fixed") {
      formData.append("points", editData.points)
    } else {
      formData.append("points_per_minute", editData.points_per_minute)
      formData.append("min_minutes", editData.min_minutes)
      formData.append("max_minutes", editData.max_minutes)
    }

    const result = await updateGroupActivity(activityId, formData)

    if (result.success) {
      setEditingActivity(null)
      setEditData({})
      onActivityUpdate()
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!activityToDelete) return

    setLoading(true)
    const result = await deleteGroupActivity(activityToDelete.id)

    if (result.success) {
      setDeleteDialogOpen(false)
      setActivityToDelete(null)
      onActivityUpdate()
    } else {
      alert(result.error)
    }

    setLoading(false)
  }

  const openDeleteDialog = (activity: Activity) => {
    setActivityToDelete(activity)
    setDeleteDialogOpen(true)
  }

  const getActivityDisplay = (activity: Activity) => {
    if (activity.activity_type === "per_minute") {
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{activity.name}</span>
          <Badge variant="outline" className="text-xs">
            {activity.points_per_minute} pts/min
          </Badge>
          <Badge variant="outline" className="text-xs">
            {activity.min_minutes}-{activity.max_minutes} min
          </Badge>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-toro-primary" />
        <span className="font-medium">{activity.name}</span>
        <Badge className="bg-toro-accent text-white">+{activity.points} pts</Badge>
      </div>
    )
  }

  if (activities.length === 0) {
    return <p className="text-toro-foreground/70 text-center py-4">No hay actividades configuradas aún</p>
  }

  return (
    <>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            {editingActivity === activity.id ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex flex-col gap-2 flex-1">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Nombre de actividad"
                  />

                  <Select
                    value={editData.activity_type}
                    onValueChange={(value) => setEditData({ ...editData, activity_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Puntos Fijos</SelectItem>
                      <SelectItem value="per_minute">Por Minutos</SelectItem>
                    </SelectContent>
                  </Select>

                  {editData.activity_type === "fixed" ? (
                    <Input
                      type="number"
                      value={editData.points}
                      onChange={(e) => setEditData({ ...editData, points: e.target.value })}
                      placeholder="Puntos"
                      min="1"
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={editData.points_per_minute}
                        onChange={(e) => setEditData({ ...editData, points_per_minute: e.target.value })}
                        placeholder="Pts/min"
                        min="0.1"
                      />
                      <Input
                        type="number"
                        value={editData.min_minutes}
                        onChange={(e) => setEditData({ ...editData, min_minutes: e.target.value })}
                        placeholder="Min"
                        min="1"
                      />
                      <Input
                        type="number"
                        value={editData.max_minutes}
                        onChange={(e) => setEditData({ ...editData, max_minutes: e.target.value })}
                        placeholder="Max"
                        min="1"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => saveEdit(activity.id)} disabled={loading}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {getActivityDisplay(activity)}
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(activity)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(activity)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Actividad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Estás seguro de que quieres eliminar la actividad <strong>"{activityToDelete?.name}"</strong>?
            </p>
            <p className="text-sm text-gray-600">
              Esta acción no se puede deshacer. Si ya hay registros de usuarios para esta actividad, no podrá ser
              eliminada.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

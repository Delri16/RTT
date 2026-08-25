"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2, Save, X, Dumbbell, Clock, Heart, Zap } from "lucide-react"
import { updateGroupActivity, deleteGroupActivity } from "@/lib/actions"
import SportIconPicker from "@/components/sport-icon-picker"
import { isOtherActivityName, sportEmoji, sportLabel } from "@/lib/sport-icons"

interface Activity {
  id: string
  name: string
  points: number
  activity_type: "fixed" | "per_minute"
  points_per_minute?: number
  min_minutes?: number
  max_minutes?: number
  aerobic_pct?: number
  icon?: string | null
}

interface ActivityManagerProps {
  activities: Activity[]
  isAdmin: boolean
  onActivityUpdate: () => void
}

export default function ActivityManager({ activities, isAdmin, onActivityUpdate }: ActivityManagerProps) {
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  // Error de validación del formulario de edición (deporte obligatorio).
  const [editError, setEditError] = useState("")
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
      aerobic_pct: typeof activity.aerobic_pct === "number" ? activity.aerobic_pct : 50,
      icon: activity.icon ?? null,
    })
  }

  const cancelEdit = () => {
    setEditError("")
    setEditingActivity(null)
    setEditData({})
  }

  const saveEdit = async (activityId: string) => {
    if (!editData.name?.trim()) return

    // El deporte define la relación de la actividad y con ella su puntaje en la
    // tabla general. Antes este formulario no mandaba nada de eso y cada edición
    // dejaba la actividad sin relación, sacándola del ranking global en silencio.
    if (!isOtherActivityName(editData.name) && !editData.icon) {
      setEditError("Elegí el deporte: define cuánto suma en la tabla general")
      return
    }
    setEditError("")

    setLoading(true)
    const formData = new FormData()
    formData.append("name", editData.name.trim())
    formData.append("activity_type", editData.activity_type)
    formData.append("aerobic_pct", (editData.aerobic_pct ?? 50).toString())
    // Las actividades genéricas ("Otros") no llevan ícono fijo: se elige al registrar.
    formData.append("icon", isOtherActivityName(editData.name) ? "" : editData.icon ?? "")

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

  const aerobicBadge = (activity: Activity) => {
    const pct = activity.aerobic_pct
    if (typeof pct !== "number" || pct === 50) return null
    return (
      <Badge variant="outline" className="text-xs flex items-center gap-1">
        {pct > 50 ? <Heart className="w-3 h-3 text-rose-500" /> : <Zap className="w-3 h-3 text-indigo-500" />}
        {pct}% aeró
      </Badge>
    )
  }

  // Emoji del deporte si la actividad tiene uno; si no, el ícono genérico de siempre.
  const activityLeadIcon = (activity: Activity, fallback: React.ReactNode) => {
    const emoji = sportEmoji(activity.icon)
    if (emoji) return <span className="text-base leading-none">{emoji}</span>
    return fallback
  }

  const getActivityDisplay = (activity: Activity) => {
    if (activity.activity_type === "per_minute") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {activityLeadIcon(activity, <Clock className="w-4 h-4 text-blue-600" />)}
          <span className="font-medium">{activity.name}</span>
          <Badge variant="outline" className="text-xs">
            {activity.points_per_minute} pts/min
          </Badge>
          <Badge variant="outline" className="text-xs">
            {activity.min_minutes}-{activity.max_minutes} min
          </Badge>
          {aerobicBadge(activity)}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {activityLeadIcon(activity, <Dumbbell className="w-4 h-4 text-toro-primary" />)}
        <span className="font-medium">{activity.name}</span>
        <Badge className="bg-toro-accent text-white">+{activity.points} pts</Badge>
        {aerobicBadge(activity)}
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

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-rose-500 font-medium">
                        <Heart className="w-3 h-3" /> Aeróbico {editData.aerobic_pct ?? 50}%
                      </span>
                      <span className="flex items-center gap-1 text-indigo-500 font-medium">
                        Fuerza {100 - (editData.aerobic_pct ?? 50)}% <Zap className="w-3 h-3" />
                      </span>
                    </div>
                    <Slider
                      value={[editData.aerobic_pct ?? 50]}
                      onValueChange={(v) => setEditData({ ...editData, aerobic_pct: v[0] })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="pt-1 border-t">
                    {isOtherActivityName(editData.name) ? (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Actividad genérica: el ícono del deporte se elige cada vez que se registra.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] text-gray-500 mb-1.5">
                          Deporte <span className="text-toro-primary">*</span> — define los puntos de la tabla general
                          {editData.icon ? (
                            <span className="ml-1 font-medium text-toro-foreground">
                              — {sportEmoji(editData.icon)} {sportLabel(editData.icon)}
                            </span>
                          ) : (
                            <span className="ml-1 font-medium text-toro-primary">— elegí uno</span>
                          )}
                        </p>
                        <SportIconPicker
                          value={editData.icon ?? null}
                          onChange={(icon) => setEditData({ ...editData, icon })}
                          allowNone={false}
                          compact
                        />
                      </>
                    )}
                    {editError && <p className="text-[11px] text-toro-primary mt-1.5 font-medium">{editError}</p>}
                  </div>
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

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/app/app-provider"
import { getUserProfile, updateProfile, getWeeklyPoints } from "@/lib/actions"
import AvatarSelector from "@/components/avatar-selector"
import UserAvatar from "@/components/user-avatar"
import MotivationalQuote from "@/components/motivational-quote"
import { User, Weight, Target, Save, CheckCircle, Trophy, LogOut, Mail, TrendingDown, TrendingUp, Minus } from "lucide-react"

const GOALS = [
  { value: "lose", label: "Bajar de peso", desc: "Suman más las actividades aeróbicas (cardio)", icon: TrendingDown },
  { value: "maintain", label: "Mantener", desc: "Puntos normales, sin ajuste", icon: Minus },
  { value: "gain", label: "Subir de peso", desc: "Suman más las actividades de fuerza (gym)", icon: TrendingUp },
] as const

export default function ProfilePage() {
  const { username, logout } = useApp()
  const [profile, setProfile] = useState<any>(null)
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [currentWeight, setCurrentWeight] = useState("")
  const [targetWeight, setTargetWeight] = useState("")
  const [goal, setGoal] = useState("maintain")

  useEffect(() => {
    if (username) loadProfile()
  }, [username])

  const loadProfile = async () => {
    if (!username) return
    try {
      const [result, points] = await Promise.all([getUserProfile(username), getWeeklyPoints(username)])
      if (result.success) {
        setProfile(result.profile)
        setCurrentWeight(result.profile.current_weight?.toString() || "")
        setTargetWeight(result.profile.target_weight?.toString() || "")
        setGoal(result.profile.goal || "maintain")
      } else {
        setError(result.error || "Error al cargar perfil")
      }
      setWeeklyPoints(points)
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (newAvatarId: string) => {
    if (!username) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const result = await updateProfile(username, { avatar: newAvatarId })
      if (result.success) {
        setProfile(result.profile)
        setSuccess("Avatar actualizado correctamente")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al actualizar avatar")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleGoalChange = async (newGoal: string) => {
    if (!username || newGoal === goal) return
    const prevGoal = goal
    setGoal(newGoal) // optimista
    setError("")
    setSuccess("")
    try {
      const result = await updateProfile(username, { goal: newGoal })
      if (result.success) {
        setProfile(result.profile)
        setSuccess("Objetivo actualizado")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setGoal(prevGoal)
        setError(result.error || "Error al actualizar objetivo")
      }
    } catch (err) {
      setGoal(prevGoal)
      setError("Error de conexión")
    }
  }

  const handleWeightUpdate = async () => {
    if (!username) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const updates: any = {}
      if (currentWeight) {
        const weight = Number.parseFloat(currentWeight)
        if (isNaN(weight) || weight <= 0) {
          setError("El peso actual debe ser un número válido")
          setSaving(false)
          return
        }
        updates.current_weight = weight
      }
      if (targetWeight) {
        const weight = Number.parseFloat(targetWeight)
        if (isNaN(weight) || weight <= 0) {
          setError("El peso objetivo debe ser un número válido")
          setSaving(false)
          return
        }
        updates.target_weight = weight
      }
      if (Object.keys(updates).length === 0) {
        setError("No hay cambios para guardar")
        setSaving(false)
        return
      }
      const result = await updateProfile(username, updates)
      if (result.success) {
        setProfile(result.profile)
        setSuccess("Pesos actualizados correctamente")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al actualizar pesos")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🐂</div>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el perfil</AlertDescription>
        </Alert>
      </div>
    )
  }

  const hasGoal = profile.current_weight && profile.target_weight
  const diff = hasGoal ? profile.current_weight - profile.target_weight : 0

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <UserAvatar avatarId={profile.avatar || profile.avatar_url} username={username!} size="xl" />
        <div>
          <h1 className="text-2xl font-display text-toro-foreground">{username}</h1>
          {profile.email && (
            <p className="text-sm text-toro-foreground/50 flex items-center gap-1 justify-center">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-toro-accent/10 border-toro-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-toro-foreground/70 text-sm mb-1">
              <Trophy className="w-4 h-4 text-toro-accent" /> Puntos
            </div>
            <p className="text-3xl font-bold text-toro-foreground">{weeklyPoints}</p>
            <p className="text-xs text-toro-foreground/60">esta semana</p>
          </CardContent>
        </Card>
        <Card className="bg-toro-secondary/15 border-toro-secondary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-toro-foreground/70 text-sm mb-1">
              <Target className="w-4 h-4 text-toro-secondary" /> Meta
            </div>
            {hasGoal ? (
              Math.abs(diff) < 0.1 ? (
                <>
                  <p className="text-3xl font-bold text-green-600">✓</p>
                  <p className="text-xs text-toro-foreground/60">meta alcanzada</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-toro-foreground">{Math.abs(diff).toFixed(1)}</p>
                  <p className="text-xs text-toro-foreground/60">kg {diff > 0 ? "por bajar" : "por subir"}</p>
                </>
              )
            ) : (
              <>
                <p className="text-2xl font-bold text-toro-foreground/40">--</p>
                <p className="text-xs text-toro-foreground/60">configurá tu meta</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <MotivationalQuote />

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Objetivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-toro-foreground/70 -mt-1 mb-2">
            Según tu objetivo, algunas actividades te suman más o menos puntos. El ajuste es leve (máx. ±15%) para que
            siga siendo parejo.
          </p>
          {GOALS.map((g) => {
            const Icon = g.icon
            const active = goal === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGoalChange(g.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  active
                    ? "border-toro-primary bg-toro-primary/10"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-toro-primary" : "text-toro-foreground/50"}`} />
                <div className="flex-1">
                  <p className={`font-medium ${active ? "text-toro-primary" : "text-toro-foreground"}`}>{g.label}</p>
                  <p className="text-xs text-toro-foreground/60">{g.desc}</p>
                </div>
                {active && <CheckCircle className="w-5 h-5 text-toro-primary shrink-0" />}
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Weight Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="w-5 h-5" />
            Gestión de Peso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentWeight">Peso Actual (kg)</Label>
              <Input
                id="currentWeight"
                type="number"
                step="0.1"
                placeholder="70.5"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="targetWeight">Peso Objetivo (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                placeholder="65.0"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {hasGoal && (
            <div className="p-3 bg-toro-background/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-toro-primary" />
                <span>
                  Progreso: {profile.current_weight}kg → {profile.target_weight}kg
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {diff > 0
                  ? `Faltan ${diff.toFixed(1)}kg por perder`
                  : diff < 0
                    ? `Faltan ${Math.abs(diff).toFixed(1)}kg por ganar`
                    : "¡Meta alcanzada!"}
              </div>
            </div>
          )}

          <Button
            onClick={handleWeightUpdate}
            disabled={saving}
            className="w-full bg-toro-secondary hover:bg-toro-secondary/90"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Guardando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Actualizar Pesos
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Avatar */}
      <AvatarSelector
        currentAvatar={profile.avatar || profile.avatar_url || "default"}
        onSelect={handleAvatarChange}
        disabled={saving}
      />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-toro-foreground/70">Usuario</span>
            <Badge variant="secondary">{username}</Badge>
          </div>
          <Link href="/logout" className="block">
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

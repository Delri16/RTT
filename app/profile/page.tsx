"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/app/app-provider"
import { getUserProfile, updateProfile } from "@/lib/actions"
import AvatarSelector from "@/components/avatar-selector"
import UserAvatar from "@/components/user-avatar"
import { User, Lock, Weight, Target, Save, Eye, EyeOff, CheckCircle } from "lucide-react"

export default function ProfilePage() {
  const { username } = useApp()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [currentWeight, setCurrentWeight] = useState("")
  const [targetWeight, setTargetWeight] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (username) {
      loadProfile()
    }
  }, [username])

  const loadProfile = async () => {
    if (!username) return

    try {
      const result = await getUserProfile(username)
      if (result.success) {
        setProfile(result.profile)
        setCurrentWeight(result.profile.current_weight?.toString() || "")
        setTargetWeight(result.profile.target_weight?.toString() || "")
      } else {
        setError(result.error || "Error al cargar perfil")
      }
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

  const handlePasswordUpdate = async () => {
    if (!username) return

    if (!password.trim()) {
      setError("La contraseña no puede estar vacía")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const result = await updateProfile(username, { password })
      if (result.success) {
        setProfile(result.profile)
        setPassword("")
        setConfirmPassword("")
        setSuccess("Contraseña actualizada correctamente")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al actualizar contraseña")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
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
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el perfil</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <UserAvatar avatarId={profile.avatar || profile.avatar_url} username={username!} size="xl" />
        <div>
          <h1 className="text-3xl font-bold text-toro-primary">Mi Perfil</h1>
          <p className="text-toro-foreground/70">Personaliza tu experiencia en Road to Toro</p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Selector */}
        <div className="space-y-6">
          <AvatarSelector
            currentAvatar={profile.avatar || profile.avatar_url || "default"}
            onSelect={handleAvatarChange}
            disabled={saving}
          />
        </div>

        {/* Profile Settings */}
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre de usuario</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {username}
                  </Badge>
                  <span className="text-sm text-gray-500">(No se puede cambiar)</span>
                </div>
              </div>

              <div>
                <Label>Estado de la cuenta</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={profile.password ? "default" : "secondary"}>
                    {profile.password ? "🔒 Protegida con contraseña" : "🔓 Sin contraseña"}
                  </Badge>
                </div>
              </div>
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

              {profile.current_weight && profile.target_weight && (
                <div className="p-3 bg-toro-background/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-toro-primary" />
                    <span>
                      Progreso: {profile.current_weight}kg → {profile.target_weight}kg
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {profile.current_weight > profile.target_weight
                      ? `Faltan ${(profile.current_weight - profile.target_weight).toFixed(1)}kg por perder`
                      : profile.current_weight < profile.target_weight
                        ? `Faltan ${(profile.target_weight - profile.current_weight).toFixed(1)}kg por ganar`
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

          {/* Password Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {profile.password ? "Cambiar Contraseña" : "Establecer Contraseña"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="password">{profile.password ? "Nueva contraseña" : "Contraseña"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={saving}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={saving}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">💡 Sobre las contraseñas:</p>
                <ul className="space-y-1">
                  <li>• Si estableces una contraseña, se requerirá para iniciar sesión</li>
                  <li>• Si no estableces contraseña, el login será automático</li>
                  <li>• Puedes cambiar o quitar la contraseña cuando quieras</li>
                </ul>
              </div>

              <Button
                onClick={handlePasswordUpdate}
                disabled={saving || !password.trim() || password !== confirmPassword}
                className="w-full bg-toro-accent hover:bg-toro-accent/90"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Guardando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {profile.password ? "Cambiar Contraseña" : "Establecer Contraseña"}
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

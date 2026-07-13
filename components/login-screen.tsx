"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useApp } from "@/app/app-provider"
import { loginWithPassword, createOrGetProfile } from "@/lib/actions"
import { Eye, EyeOff, User, Lock, LogIn } from "lucide-react"

export default function LoginScreen() {
  const { login } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError("")

    try {
      // First, try to get or create the profile
      const profileResult = await createOrGetProfile(username.trim())

      if (profileResult.success) {
        // Check if user has a password
        const loginResult = await loginWithPassword(username.trim())

        if (loginResult.success) {
          if (loginResult.hasPassword) {
            // User has password, show password field
            setNeedsPassword(true)
            setIsNewUser(false)
          } else {
            // User doesn't have password, login directly
            login(username.trim())
          }
        } else {
          setError(loginResult.error || "Error al verificar usuario")
        }
      } else {
        setError(profileResult.error || "Error al crear perfil")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError("")

    try {
      const result = await loginWithPassword(username.trim(), password.trim())

      if (result.success) {
        login(username.trim())
      } else {
        setError(result.error || "Contraseña incorrecta")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setNeedsPassword(false)
    setPassword("")
    setError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toro-background via-toro-secondary/10 to-toro-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-4">
          <div className="text-8xl">🐂</div>
          <div>
            <h1 className="text-4xl font-bold text-toro-primary font-display">Road to Toro</h1>
            <p className="text-toro-foreground/70 mt-2">Tu camino hacia la transformación</p>
          </div>
        </div>

        <Card className="shadow-xl border-toro-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {needsPassword ? (
                <>
                  <Lock className="w-5 h-5" />
                  Ingresa tu contraseña
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  {isNewUser ? "Crear cuenta" : "Iniciar sesión"}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!needsPassword ? (
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingresa tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="text-center text-lg"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
                  disabled={loading || !username.trim()}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Verificando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Continuar
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="text-center p-3 bg-toro-background/50 rounded-lg">
                  <div className="text-2xl mb-1">👋</div>
                  <p className="text-sm text-toro-foreground/70">
                    ¡Hola <strong>{username}</strong>!
                  </p>
                  <p className="text-xs text-toro-foreground/60">Tu cuenta está protegida con contraseña</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pr-10"
                      autoFocus
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex-1 bg-transparent"
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
                    disabled={loading || !password.trim()}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Verificando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Entrar
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="text-center text-xs text-toro-foreground/60 pt-4 border-t">
              {needsPassword
                ? "Si olvidaste tu contraseña, contacta al administrador"
                : "Si no tienes cuenta, se creará automáticamente"}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-toro-foreground/50">
          Road to Toro © 2024 - Tu transformación comienza aquí
        </div>
      </div>
    </div>
  )
}

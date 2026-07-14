"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useApp } from "@/app/app-provider"
import { supabase } from "@/lib/supabase"
import {
  ensurePasswordAuthUser,
  findProfileByUsername,
  linkProfileToAuthUser,
} from "@/lib/actions"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { KeyRound, LogIn, Mail, ShieldCheck, User } from "lucide-react"

type AuthMode = "password" | "otp"
type Step = "form" | "verify"

export default function LoginScreen() {
  const { login } = useApp()
  const [mode, setMode] = useState<AuthMode>("password")
  const [step, setStep] = useState<Step>("form")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const finishLogin = async (authUserId: string, trimmedUsername: string, normalizedEmail: string) => {
    const linkResult = await linkProfileToAuthUser(trimmedUsername, normalizedEmail, authUserId)
    if (!linkResult.success) {
      await supabase.auth.signOut()
      return linkResult.error || "No pudimos vincular tu cuenta."
    }
    login(linkResult.profile.username)
    return null
  }

  const validateUsernameEmail = async (trimmedUsername: string, normalizedEmail: string) => {
    const existing = await findProfileByUsername(trimmedUsername)
    if (existing.success && existing.profile?.email && existing.profile.email.toLowerCase() !== normalizedEmail) {
      return "Ese nombre de usuario ya está registrado con otro email."
    }
    return null
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const pwd = password
    if (!trimmedUsername || !normalizedEmail || !pwd) return

    if (pwd.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const mismatch = await validateUsernameEmail(trimmedUsername, normalizedEmail)
      if (mismatch) {
        setError(mismatch)
        setLoading(false)
        return
      }

      let sessionUserId: string | undefined

      const signIn = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pwd,
      })

      if (signIn.data.session?.user) {
        sessionUserId = signIn.data.session.user.id
      } else {
        // No session yet — create Auth user (confirmed) then sign in again
        const ensured = await ensurePasswordAuthUser(normalizedEmail, pwd)
        if (!ensured.success && "exists" in ensured && ensured.exists) {
          setError(
            "Contraseña incorrecta. Si todavía entrabas con código, usá «Entrar con código» abajo.",
          )
          setLoading(false)
          return
        }
        if (!ensured.success) {
          setError(ensured.error || "No pudimos crear la cuenta.")
          setLoading(false)
          return
        }

        const retry = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pwd,
        })
        if (retry.error || !retry.data.session) {
          setError(retry.error?.message || "No pudimos iniciar sesión.")
          setLoading(false)
          return
        }
        sessionUserId = retry.data.session.user.id
      }

      const linkError = await finishLogin(sessionUserId, trimmedUsername, normalizedEmail)
      if (linkError) {
        setError(linkError)
        setLoading(false)
      }
    } catch {
      setError("Error de conexión")
      setLoading(false)
    }
  }

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()
    if (!trimmedUsername || !normalizedEmail) return

    setLoading(true)
    setError("")

    try {
      const mismatch = await validateUsernameEmail(trimmedUsername, normalizedEmail)
      if (mismatch) {
        setError(mismatch)
        setLoading(false)
        return
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      })

      if (otpError) {
        setError(otpError.message || "No pudimos enviar el código. Probá de nuevo.")
        setLoading(false)
        return
      }

      setStep("verify")
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) return

    setLoading(true)
    setError("")

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const trimmedUsername = username.trim()

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code.trim(),
        type: "email",
      })

      if (verifyError || !data.session) {
        setError(verifyError?.message || "Código inválido o vencido.")
        setLoading(false)
        return
      }

      const linkError = await finishLogin(data.session.user.id, trimmedUsername, normalizedEmail)
      if (linkError) {
        setError(linkError)
        setStep("form")
        setLoading(false)
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setStep("form")
    setCode("")
    setError("")
    setPassword("")
  }

  const handleBackFromOtp = () => {
    setStep("form")
    setCode("")
    setError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toro-background via-toro-secondary/10 to-toro-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="text-8xl">🐂</div>
          <div>
            <h1 className="text-4xl font-bold text-toro-primary font-display">Road to Toro</h1>
            <p className="text-toro-foreground/70 mt-2">Tu camino hacia la transformación</p>
          </div>
        </div>

        <Card className="shadow-xl border-toro-primary/20">
          <CardHeader className="text-center space-y-3">
            <CardTitle className="flex items-center justify-center gap-2">
              {step === "verify" ? (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Ingresá el código
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  Iniciar sesión
                </>
              )}
            </CardTitle>

            {step === "form" && (
              <div className="flex rounded-lg border border-toro-primary/20 p-1 bg-toro-background/40">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                    mode === "password" ? "bg-toro-primary text-white" : "text-toro-foreground/70 hover:text-toro-foreground"
                  }`}
                >
                  Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("otp")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                    mode === "otp" ? "bg-toro-primary text-white" : "text-toro-foreground/70 hover:text-toro-foreground"
                  }`}
                >
                  Código por email
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "form" && mode === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="pl-9"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pl-9"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
                  disabled={loading || !username.trim() || !email.trim() || !password}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Entrando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Entrar
                    </div>
                  )}
                </Button>
              </form>
            )}

            {step === "form" && mode === "otp" && (
              <form onSubmit={handleOtpRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username-otp">Nombre de usuario</Label>
                  <Input
                    id="username-otp"
                    type="text"
                    placeholder="Ingresa tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="text-center text-lg"
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-otp">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email-otp"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="pl-9"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white"
                  disabled={loading || !username.trim() || !email.trim()}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Enviando código...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Enviar código
                    </div>
                  )}
                </Button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="text-center p-3 bg-toro-background/50 rounded-lg">
                  <div className="text-2xl mb-1">📧</div>
                  <p className="text-sm text-toro-foreground/70">
                    Te mandamos un código a <strong>{email}</strong>
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackFromOtp}
                    disabled={loading}
                    className="flex-1 bg-transparent"
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
                    disabled={loading || code.trim().length < 6}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
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
              {step === "verify"
                ? "Revisá también la carpeta de spam si no lo ves."
                : mode === "password"
                  ? "Si no tenés cuenta, se crea al entrar. La sesión queda guardada."
                  : "Te mandamos un código de 6 dígitos al email."}
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

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
import { findProfileByUsername, linkProfileToAuthUser } from "@/lib/actions"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Mail, User, LogIn, ShieldCheck } from "lucide-react"

export default function LoginScreen() {
  const { login } = useApp()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"identify" | "verify">("identify")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleIdentifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()
    if (!trimmedUsername || !normalizedEmail) return

    setLoading(true)
    setError("")

    try {
      const existing = await findProfileByUsername(trimmedUsername)
      if (existing.success && existing.profile?.email && existing.profile.email.toLowerCase() !== normalizedEmail) {
        setError("Ese nombre de usuario ya está registrado con otro email.")
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

  const handleVerifySubmit = async (e: React.FormEvent) => {
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

      const linkResult = await linkProfileToAuthUser(trimmedUsername, normalizedEmail, data.session.user.id)

      if (!linkResult.success) {
        await supabase.auth.signOut()
        setError(linkResult.error || "No pudimos vincular tu cuenta.")
        setStep("identify")
        setLoading(false)
        return
      }

      login(trimmedUsername)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep("identify")
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
          <CardHeader className="text-center">
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
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "identify" ? (
              <form onSubmit={handleIdentifySubmit} className="space-y-4">
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
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Enviando código...
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
              <form onSubmit={handleVerifySubmit} className="space-y-4">
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
                    onClick={handleBack}
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
              {step === "verify"
                ? "Revisá también la carpeta de spam si no lo ves."
                : "Si no tienes cuenta, se creará automáticamente."}
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

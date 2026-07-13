"use client"

import { useEffect } from "react"
import { useApp } from "@/app/app-provider"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LogoutPage() {
  const { logout } = useApp()
  const router = useRouter()

  useEffect(() => {
    // Ejecutar logout
    logout()

    // Redirigir a la página principal después de un breve delay
    const timer = setTimeout(() => {
      router.push("/")
    }, 500)

    return () => clearTimeout(timer)
  }, [logout, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-toro-background">
      <Loader2 className="w-12 h-12 text-toro-primary animate-spin mb-4" />
      <p className="font-display text-xl text-toro-foreground">Cerrando sesión...</p>
    </div>
  )
}

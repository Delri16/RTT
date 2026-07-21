"use client"

import { useEffect } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import { useApp } from "@/app/app-provider"
import { useRouter } from "next/navigation"

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
    <div className="min-h-screen bg-toro-background">
      <LoadingSplash label="Cerrando sesión" />
    </div>
  )
}

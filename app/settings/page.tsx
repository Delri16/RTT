"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, User } from "lucide-react"
import { useApp } from "@/app/app-provider"
import NotificationManager from "@/components/notification-manager"

export default function SettingsPage() {
  const { username, logout } = useApp()

  const handleLogout = () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      logout()
    }
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl text-toro-foreground font-display">Configuración</h1>
        <p className="text-toro-foreground/70">Gestiona tu cuenta y notificaciones</p>
      </header>

      {/* Notification Settings */}
      <div className="mb-6">
        <NotificationManager />
      </div>

      <Card className="bg-white shadow-sm mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-toro-accent" />
            Opciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/profile">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <User className="w-5 h-5 mr-2" />
              Mi Perfil y Meta de Peso
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-toro-primary" />
            Información de Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-toro-foreground/70">Usuario:</span>
              <p className="font-bold text-toro-foreground">{username}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardContent className="p-4">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="w-5 h-5 mr-2" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

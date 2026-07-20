"use client"

import { Users } from "lucide-react"

// El join real lo hace app-provider.tsx (necesita disparar después del login,
// incluso si esta página nunca llega a montarse porque el usuario no estaba logueado).
// Esta pantalla es solo el estado intermedio mientras eso resuelve y redirige.
export default function JoinGroupPage() {
  return (
    <div className="p-4 bg-toro-background min-h-full flex flex-col items-center justify-center gap-3">
      <Users className="animate-spin w-8 h-8 text-toro-primary" />
      <p className="text-toro-foreground/70">Uniéndote al grupo...</p>
    </div>
  )
}

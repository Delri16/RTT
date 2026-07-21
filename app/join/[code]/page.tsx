"use client"

import LoadingSplash from "@/components/ui/loading-splash"

// El join real lo hace app-provider.tsx (necesita disparar después del login,
// incluso si esta página nunca llega a montarse porque el usuario no estaba logueado).
// Esta pantalla es solo el estado intermedio mientras eso resuelve y redirige.
export default function JoinGroupPage() {
  return (
    <div className="bg-toro-background min-h-full">
      <LoadingSplash label="Uniéndote al grupo" />
    </div>
  )
}

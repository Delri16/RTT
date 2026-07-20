"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppProvider, PENDING_INVITE_KEY } from "@/app/app-provider"
import UploadProgressIndicator from "@/components/upload-progress-indicator"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Capturado acá (antes de que AppProvider decida si muestra login) porque
    // si el usuario no está logueado, AppProvider reemplaza el árbol entero
    // por LoginScreen y la página /join/[code] nunca llega a montarse.
    const match = pathname?.match(/^\/join\/([^/]+)$/)
    if (match) {
      localStorage.setItem(PENDING_INVITE_KEY, match[1])
    }
  }, [pathname])

  return (
    <AppProvider>
      <div className="w-full max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-2xl">
        {children}
        <UploadProgressIndicator />
      </div>
    </AppProvider>
  )
}

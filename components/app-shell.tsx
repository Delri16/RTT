"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppProvider } from "@/app/app-provider"
import UploadProgressIndicator from "@/components/upload-progress-indicator"

/**
 * While RTT is in landing-only mode, the root route ("/") renders standalone —
 * no auth gate, no Supabase-backed listeners/badges. Every other route keeps
 * the original AppProvider behavior untouched.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === "/"

  if (isLanding) {
    return <>{children}</>
  }

  return (
    <AppProvider>
      <div className="w-full max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-2xl">
        {children}
        <UploadProgressIndicator />
      </div>
    </AppProvider>
  )
}

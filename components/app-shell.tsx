"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppProvider } from "@/app/app-provider"
import UploadProgressIndicator from "@/components/upload-progress-indicator"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="w-full max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-2xl">
        {children}
        <UploadProgressIndicator />
      </div>
    </AppProvider>
  )
}

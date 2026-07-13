"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import LoginScreen from "@/components/login-screen"
import BottomNav from "@/components/bottom-nav"
import { ActivityTagsBadge } from "@/components/activity-tags-badge"
import { NotificationListener } from "@/components/notification-listener"

type AppContextType = {
  username: string | null
  login: (user: string) => void
  logout: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("toro_username")
    if (storedUser) {
      setUsername(storedUser)
    }
    setLoading(false)
  }, [])

  const login = (user: string) => {
    localStorage.setItem("toro_username", user)
    setUsername(user)
  }

  const logout = () => {
    localStorage.removeItem("toro_username")
    setUsername(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-toro-background">
        <div className="font-display text-4xl text-toro-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ username, login, logout }}>
      {username ? (
        <div className="flex flex-col h-screen">
          <NotificationListener />
          <ActivityTagsBadge username={username} />
          <main className="flex-1 overflow-y-auto pb-16">{children}</main>
          <BottomNav />
        </div>
      ) : (
        <LoginScreen />
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import LoginScreen from "@/components/login-screen"
import BottomNav from "@/components/bottom-nav"
import { ActivityTagsBadge } from "@/components/activity-tags-badge"
import { NotificationListener } from "@/components/notification-listener"
import { supabase } from "@/lib/supabase"
import { getProfileByAuthUserId } from "@/lib/actions"

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
    let active = true

    async function hydrateFromSession(userId: string | undefined) {
      if (!userId) {
        if (active) setUsername(null)
        return
      }
      const result = await getProfileByAuthUserId(userId)
      if (active) setUsername(result.success ? result.profile.username : null)
    }

    supabase.auth.getSession().then(({ data }) => {
      hydrateFromSession(data.session?.user.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateFromSession(session?.user.id)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Session persistence (never expires until signOut) is handled by supabase-js
  // itself: it keeps the refresh token in localStorage and auto-refreshes it.
  // Once verifyOtp succeeds client-side, the session already exists — this just
  // updates local state so the rest of the app renders immediately.
  const login = (user: string) => {
    setUsername(user)
  }

  const logout = () => {
    supabase.auth.signOut()
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

"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import LoginScreen from "@/components/login-screen"
import BottomNav from "@/components/bottom-nav"
import { ActivityTagsBadge } from "@/components/activity-tags-badge"
import { NotificationListener } from "@/components/notification-listener"
import { supabase } from "@/lib/supabase"
import { getProfileByAuthUserId, joinGroupByInviteCode } from "@/lib/actions"

export const PENDING_INVITE_KEY = "rtt_pending_invite_code"

type AppContextType = {
  username: string | null
  login: (user: string) => void
  logout: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!username) return

    const inviteCode = localStorage.getItem(PENDING_INVITE_KEY)
    if (!inviteCode) return

    localStorage.removeItem(PENDING_INVITE_KEY)
    joinGroupByInviteCode(inviteCode, username).then((result) => {
      if (result.success && "groupId" in result) {
        router.replace(`/groups/${result.groupId}`)
      } else {
        router.replace("/groups")
      }
    })
  }, [username, router])

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

  // Session stays alive via persistSession + autoRefreshToken in lib/supabase.ts:
  // refresh tokens are stored in localStorage and renewed until explicit signOut.
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
          <main className="flex-1 overflow-y-auto overscroll-contain pb-16">{children}</main>
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

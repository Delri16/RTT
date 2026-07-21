"use client"

import { useEffect, useState } from "react"
import { ListSkeleton } from "@/components/ui/skeletons"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Plus, Users, Calendar, Search } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserGroups } from "@/lib/actions"

export default function GroupsPage() {
  const { username } = useApp()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadGroups()
    }
  }, [username])

  const loadGroups = async () => {
    if (!username) return

    const result = await getUserGroups(username)
    if (result.success) {
      setGroups(result.groups)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-toro-foreground font-display">Mis Grupos</h1>
        </div>
        <ListSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl text-toro-foreground font-display">Mis Grupos</h1>
        <Link href="/create-group">
          <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Crear
          </Button>
        </Link>
      </header>

      <Link href="/discover">
        <Card className="bg-gradient-to-br from-toro-accent to-toro-primary text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Search className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Descubrir Grupos</h3>
                  <p className="text-white/90 text-sm">Únete a nuevos grupos de entrenamiento</p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="space-y-4">
        {groups.length > 0 ? (
          groups.map((groupMember) => (
            <Link key={groupMember.group_id} href={`/groups/${groupMember.group_id}`}>
              <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-toro-foreground">{groupMember.groups.name}</span>
                    {groupMember.is_admin && (
                      <span className="text-xs bg-toro-accent text-white px-2 py-1 rounded-full">Admin</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-toro-foreground/70 mb-2">{groupMember.groups.description}</p>
                  <div className="flex items-center gap-4 text-sm text-toro-foreground/60">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>Miembro desde {new Date(groupMember.joined_at).toLocaleDateString()}</span>
                    </div>
                    {groupMember.groups.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Hasta {new Date(groupMember.groups.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-toro-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-toro-foreground mb-2">No tienes grupos aún</h3>
              <p className="text-toro-foreground/70 mb-4">
                Crea tu primer grupo o únete a uno existente para empezar a competir
              </p>
              <Link href="/create-group">
                <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Crear mi primer grupo
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Calendar, UserPlus, Check } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getPublicGroups, joinGroup, joinGroupByInviteCode } from "@/lib/actions"

export default function DiscoverPage() {
  const { username } = useApp()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadGroups()
  }, [username])

  const loadGroups = async () => {
    const result = await getPublicGroups(username!)
    if (result.success) {
      setGroups(result.groups)
    }
    setLoading(false)
  }

  const handleJoinGroup = async (groupId: string) => {
    const result = await joinGroup(groupId, username!)
    if (result.success) {
      await loadGroups() // Refresh the list
    }
  }

  const handleJoinByInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setInviteLoading(true)
    setInviteMessage("")

    const result = await joinGroupByInviteCode(inviteCode.trim(), username!)

    if (result.success) {
      setInviteMessage("¡Te has unido al grupo exitosamente!")
      setInviteCode("")
      await loadGroups()
    } else {
      setInviteMessage(result.error || "Error al unirse al grupo")
    }

    setInviteLoading(false)
  }

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <Search className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl text-toro-foreground font-display">Descubrir Grupos</h1>
        <p className="text-toro-foreground/70">Únete a grupos de entrenamiento</p>
      </header>

      {/* Invite Code Section */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Código de Invitación</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinByInvite} className="flex gap-2">
            <Input
              placeholder="Ingresa el código (ej: ABC123)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="flex-1"
              maxLength={6}
            />
            <Button type="submit" disabled={inviteLoading || !inviteCode.trim()}>
              {inviteLoading ? "..." : "Unirse"}
            </Button>
          </form>
          {inviteMessage && (
            <p className={`text-sm mt-2 ${inviteMessage.includes("exitosamente") ? "text-green-600" : "text-red-600"}`}>
              {inviteMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Buscar grupos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <Card key={group.id} className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-toro-foreground">{group.name}</CardTitle>
                    <p className="text-toro-foreground/70 text-sm mt-1">{group.description}</p>
                  </div>
                  {group.is_member ? (
                    <Badge className="bg-toro-accent text-white">
                      <Check className="w-3 h-3 mr-1" />
                      Miembro
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoinGroup(group.id)}
                      className="bg-toro-primary hover:bg-toro-primary/90 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Unirse
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-toro-foreground/60">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.member_count} miembros</span>
                    </div>
                    {group.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Hasta {new Date(group.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">por {group.created_by}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-8 text-center">
              <Search className="w-16 h-16 text-toro-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-toro-foreground mb-2">
                {searchTerm ? "No se encontraron grupos" : "No hay grupos públicos"}
              </h3>
              <p className="text-toro-foreground/70">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Sé el primero en crear un grupo público"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

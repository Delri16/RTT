"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Trophy, Flame, Zap, TrendingUp, History, BarChart3 } from "lucide-react"
import { useApp } from "@/app/app-provider"
import {
  getGroupDetails,
  getRodeoStandings,
  getCurrentWeekFixtures,
  getRodeoHistory,
  getRodeoStats,
  initializeRodeo,
  generateWeeklyFixtures,
  closeWeeklyFixtures,
  syncRodeoHistory,
} from "@/lib/actions"

export default function RodeosPage() {
  const { username } = useApp()
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<any>(null)
  const [standings, setStandings] = useState<any[]>([])
  const [currentFixtures, setCurrentFixtures] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (groupId && username) {
      loadRodeoData()
    }
  }, [groupId, username])

  const loadRodeoData = async () => {
    const groupResult = await getGroupDetails(groupId)
    if (groupResult.success) {
      setGroup(groupResult.group)
      const userMember = groupResult.members.find((m: any) => m.username === username)
      setIsAdmin(userMember?.is_admin || false)
    }

    const standingsResult = await getRodeoStandings(groupId)
    if (standingsResult.success && standingsResult.standings.length > 0) {
      setInitialized(true)
      setStandings(standingsResult.standings)

      const fixturesResult = await getCurrentWeekFixtures(groupId)
      if (fixturesResult.success) {
        setCurrentFixtures(fixturesResult.fixtures)

        if (fixturesResult.fixtures.length === 0) {
          console.log("[v0] No current fixtures, checking for past week pending fixtures to auto-close")
          await checkAndClosePastWeekFixtures(groupId)
        }
      }

      const historyResult = await getRodeoHistory(groupId)
      if (historyResult.success) {
        setHistory(historyResult.history)
      }

      const statsResult = await getRodeoStats(groupId)
      if (statsResult.success) {
        setStats(statsResult.stats)
      }
    }

    setLoading(false)
  }

  const checkAndClosePastWeekFixtures = async (groupId: string) => {
    try {
      console.log("[v0] Attempting to auto-close past week fixtures...")
      const result = await closeWeeklyFixtures(groupId)
      if (result.success) {
        console.log("[v0] Successfully auto-closed past week fixtures")
        await loadRodeoData()
      } else {
        console.log("[v0] No past week fixtures to close:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error auto-closing past week fixtures:", error)
    }
  }

  const handleInitializeRodeo = async () => {
    const result = await initializeRodeo(groupId)
    if (result.success) {
      await loadRodeoData()
    } else {
      alert(result.error || "Error al inicializar rodeo")
    }
  }

  const handleGenerateFixtures = async () => {
    const closeResult = await closeWeeklyFixtures(groupId)

    if (closeResult.success) {
      console.log("[v0] Previous week closed successfully")
    } else {
      console.log("[v0] No pending fixtures to close or error:", closeResult.error)
    }

    console.log("[v0] Running automatic sync before generating new fixtures")
    const syncResult = await syncRodeoHistory(groupId)
    if (syncResult.success && syncResult.count > 0) {
      console.log(`[v0] Auto-synced ${syncResult.count} fixtures to history`)
    }

    const result = await generateWeeklyFixtures(groupId)
    if (result.success) {
      await loadRodeoData()
      alert("Fixtures generados exitosamente")
    } else {
      alert(result.error || "Error al generar fixtures")
    }
  }

  const handleCloseWeek = async () => {
    if (
      confirm(
        "¿Estás seguro de que quieres cerrar la semana actual? Esto calculará los ganadores y otorgará recompensas.",
      )
    ) {
      const result = await closeWeeklyFixtures(groupId)
      if (result.success) {
        await loadRodeoData()
        alert("Semana cerrada exitosamente")
      } else {
        alert(result.error || "Error al cerrar semana")
      }
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <LoadingSplash />
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="p-4 bg-toro-background min-h-full">
        <header className="flex items-center gap-4 mb-6">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl text-toro-foreground font-display">Rodeos</h1>
            <p className="text-toro-foreground/70">{group?.name}</p>
          </div>
        </header>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-toro-primary/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-toro-foreground mb-2">Rodeos no iniciado</h3>
            <p className="text-toro-foreground/70 mb-4">
              Los Rodeos son mini-ligas internas donde cada semana se generan enfrentamientos 1 vs 1 entre los miembros
              del grupo.
            </p>
            {isAdmin && (
              <Button onClick={handleInitializeRodeo} className="bg-toro-primary hover:bg-toro-primary/90 text-white">
                <Trophy className="w-5 h-5 mr-2" />
                Iniciar Rodeos
              </Button>
            )}
            {!isAdmin && (
              <p className="text-sm text-toro-foreground/60">Solo los administradores pueden iniciar los Rodeos</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full pb-24">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl text-toro-foreground font-display">Rodeos</h1>
            <p className="text-toro-foreground/70">{group?.name}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerateFixtures}>
              Generar Semana
            </Button>
            <Button size="sm" variant="outline" onClick={handleCloseWeek} className="text-red-600 bg-transparent">
              Cerrar Semana
            </Button>
          </div>
        )}
      </header>

      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="standings">
            <Trophy className="w-4 h-4 mr-1" />
            Posiciones
          </TabsTrigger>
          <TabsTrigger value="fixtures">
            <Flame className="w-4 h-4 mr-1" />
            Duelos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-1" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-toro-primary" />
                Tabla de Posiciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-semibold text-toro-foreground">Pos</th>
                      <th className="text-left py-2 px-3 font-semibold text-toro-foreground">Jugador</th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">
                        <Zap className="w-4 h-4 inline" />
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">
                        <Flame className="w-4 h-4 inline" />
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">G</th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">P</th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">E</th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">Racha</th>
                      <th className="text-center py-2 px-3 font-semibold text-toro-foreground">Byes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing, index) => (
                      <tr key={standing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-bold text-toro-foreground">{index + 1}</td>
                        <td className="py-3 px-3">
                          <Link
                            href={`/profile/${encodeURIComponent(standing.player_username)}`}
                            className="text-toro-primary hover:text-toro-primary/80 font-medium flex items-center gap-2"
                          >
                            <div className="w-8 h-8 bg-toro-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-toro-primary">
                                {standing.player_username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {standing.player_username}
                          </Link>
                        </td>
                        <td className="text-center py-3 px-3">
                          <Badge className="bg-toro-accent text-white">{standing.proteins}</Badge>
                        </td>
                        <td className="text-center py-3 px-3">
                          <Badge className="bg-toro-primary text-white">{standing.current_streak}</Badge>
                        </td>
                        <td className="text-center py-3 px-3 text-green-600 font-semibold">{standing.wins}</td>
                        <td className="text-center py-3 px-3 text-red-600 font-semibold">{standing.losses}</td>
                        <td className="text-center py-3 px-3 text-gray-600 font-semibold">{standing.draws}</td>
                        <td className="text-center py-3 px-3">
                          <Badge
                            className={`${
                              standing.current_streak > 0
                                ? "bg-green-100 text-green-700"
                                : standing.current_streak < 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {standing.current_streak > 0 ? `+${standing.current_streak}` : standing.current_streak}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-3 text-gray-600">{standing.bye_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-toro-background rounded-lg">
                <p className="text-sm text-toro-foreground/70">
                  <Zap className="w-4 h-4 inline text-toro-accent" /> = Proteínas |{" "}
                  <Flame className="w-4 h-4 inline text-toro-primary" /> = Racha de Victorias
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fixtures">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-toro-primary" />
                Duelos de la Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentFixtures.length > 0 ? (
                <div className="space-y-4">
                  {currentFixtures.map((fixture) => (
                    <div
                      key={fixture.id}
                      className={`p-4 rounded-lg border-2 ${
                        fixture.status === "closed" ? "bg-gray-50 border-gray-200" : "bg-white border-toro-accent/30"
                      }`}
                    >
                      {fixture.is_bye ? (
                        <div className="text-center">
                          <p className="font-bold text-toro-foreground">{fixture.player_a_username}</p>
                          <Badge className="mt-2 bg-blue-100 text-blue-700">Semana Libre (Bye)</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-center">
                            <Link
                              href={`/profile/${encodeURIComponent(fixture.player_a_username)}`}
                              className="font-bold text-toro-foreground hover:text-toro-primary"
                            >
                              {fixture.player_a_username}
                            </Link>
                            <p className="text-2xl font-bold text-toro-primary mt-1">
                              {fixture.status === "closed" ? fixture.score_a : fixture.current_score_a}
                            </p>
                          </div>
                          <div className="px-4">
                            <div className="text-2xl font-bold text-toro-foreground">VS</div>
                            {fixture.status === "pending" && (
                              <Badge className="mt-2 bg-toro-accent text-white">En Curso</Badge>
                            )}
                            {fixture.status === "closed" && fixture.winner_username && (
                              <Badge className="mt-2 bg-green-100 text-green-700">Finalizado</Badge>
                            )}
                            {fixture.status === "closed" && !fixture.winner_username && (
                              <Badge className="mt-2 bg-gray-100 text-gray-700">Empate</Badge>
                            )}
                          </div>
                          <div className="flex-1 text-center">
                            <Link
                              href={`/profile/${encodeURIComponent(fixture.player_b_username)}`}
                              className="font-bold text-toro-foreground hover:text-toro-primary"
                            >
                              {fixture.player_b_username}
                            </Link>
                            <p className="text-2xl font-bold text-toro-primary mt-1">
                              {fixture.status === "closed" ? fixture.score_b : fixture.current_score_b}
                            </p>
                          </div>
                        </div>
                      )}
                      {fixture.status === "closed" && fixture.winner_username && (
                        <div className="mt-3 pt-3 border-t text-center">
                          <p className="text-sm text-green-600 font-semibold">
                            <Trophy className="w-4 h-4 inline mr-1" />
                            Ganador: {fixture.winner_username} (+1 Proteína)
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Flame className="w-12 h-12 text-toro-foreground/30 mx-auto mb-3" />
                  <p className="text-toro-foreground/70">No hay duelos programados para esta semana</p>
                  {isAdmin && (
                    <Button
                      onClick={handleGenerateFixtures}
                      className="mt-4 bg-toro-primary hover:bg-toro-primary/90 text-white"
                    >
                      Generar Duelos
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-6 h-6 text-toro-primary" />
                Historial de Semanas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-6">
                  {history.map((week: any) => (
                    <div key={week.weekNumber} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-toro-foreground">Semana {week.weekNumber}</h3>
                        <Badge variant="outline">
                          {new Date(week.weekStart).toLocaleDateString()} -{" "}
                          {new Date(week.weekEnd).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {week.fixtures.map((fixture: any) => (
                          <div key={fixture.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            {fixture.is_bye ? (
                              <span className="text-sm text-toro-foreground">
                                {fixture.player_a_username}{" "}
                                <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">Bye</Badge>
                              </span>
                            ) : (
                              <>
                                <span className="text-sm text-toro-foreground">
                                  {fixture.player_a_username}{" "}
                                  <span className="font-bold">({fixture.player_a_points || 0})</span> vs{" "}
                                  <span className="font-bold">({fixture.player_b_points || 0})</span>{" "}
                                  {fixture.player_b_username}
                                </span>
                                {fixture.winner_username && (
                                  <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                                    Ganador:{" "}
                                    {fixture.player_b_username ? (
                                      <Link
                                        href={`/profile/${encodeURIComponent(fixture.winner_username)}`}
                                        className="underline hover:text-green-900"
                                      >
                                        {fixture.winner_username}
                                      </Link>
                                    ) : (
                                      fixture.winner_username
                                    )}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-toro-foreground/30 mx-auto mb-3" />
                  <p className="text-toro-foreground/70">No hay historial de semanas aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-4">
            {stats && (
              <>
                <Card className="bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-toro-primary" />
                      Estadísticas Destacadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-toro-accent/10 rounded-lg">
                      <p className="text-sm text-toro-foreground/70 mb-1">Más Proteínas</p>
                      <p className="text-2xl font-bold text-toro-foreground">
                        {stats.mostProteins.username}
                        <Badge className="ml-3 bg-toro-accent text-white">{stats.mostProteins.count} Proteínas</Badge>
                      </p>
                    </div>

                    <div className="p-4 bg-toro-primary/10 rounded-lg">
                      <p className="text-sm text-toro-foreground/70 mb-1">Mejor Racha</p>
                      <p className="text-2xl font-bold text-toro-foreground">
                        {stats.bestStreak.username}
                        <Badge className="ml-3 bg-toro-primary text-white">{stats.bestStreak.streak} victorias</Badge>
                      </p>
                    </div>

                    <div className="p-4 bg-toro-secondary/10 rounded-lg">
                      <p className="text-sm text-toro-foreground/70 mb-1">Más Victorias</p>
                      <p className="text-2xl font-bold text-toro-foreground">
                        {stats.mostWins.username}
                        <Badge className="ml-3 bg-toro-secondary text-white">{stats.mostWins.wins} victorias</Badge>
                      </p>
                    </div>

                    {stats.mostDominated && (
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-toro-foreground/70 mb-1">Rival Más Dominado</p>
                        <p className="text-lg font-bold text-toro-foreground">
                          {stats.mostDominated.dominator} domina a {stats.mostDominated.dominated}
                        </p>
                        <p className="text-sm text-toro-foreground/60 mt-1">
                          {stats.mostDominated.wins} - {stats.mostDominated.losses}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-toro-primary/10 to-toro-accent/10 border-toro-primary/20">
                  <CardContent className="p-6 text-center">
                    <Trophy className="w-12 h-12 text-toro-primary mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-toro-foreground mb-2">Corte de Asado Semanal</h3>
                    <p className="text-toro-foreground/70 text-sm">
                      El jugador con mejor diferencial de puntos esta semana gana el badge especial
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

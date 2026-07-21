"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Flame, Award } from 'lucide-react'
import Link from "next/link"
import {
  getRodeoStandings,
  getCurrentWeekFixtures,
  getRodeoHistory,
  initializeRodeo,
  generateWeeklyFixtures,
  regenerateWeeklyFixtures, // Importar nueva función
} from "@/lib/actions"

interface RodeosTabProps {
  groupId: string
  username: string
  isAdmin: boolean
}

export default function RodeosTab({ groupId, username, isAdmin }: RodeosTabProps) {
  const [standings, setStandings] = useState<any[]>([])
  const [currentFixtures, setCurrentFixtures] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRodeoData()
  }, [groupId])

  const loadRodeoData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [standingsResult, fixturesResult, historyResult] = await Promise.all([
        getRodeoStandings(groupId),
        getCurrentWeekFixtures(groupId),
        getRodeoHistory(groupId),
      ])

      console.log("[v0] Rodeo data loaded:", { standingsResult, fixturesResult, historyResult })

      const standingsData = standingsResult.success ? standingsResult.standings : []
      const fixturesData = fixturesResult.success ? fixturesResult.fixtures : []
      const historyData = historyResult.success ? historyResult.history : []

      setStandings(standingsData)
      setCurrentFixtures(fixturesData)
      setHistory(historyData)
      setInitialized(standingsData.length > 0 || fixturesData.length > 0)
    } catch (err) {
      console.error("[v0] Error loading rodeo data:", err)
      setError("Error al cargar datos de Rodeos")
    }

    setLoading(false)
  }

  const handleInitialize = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await initializeRodeo(groupId)
      console.log("[v0] Initialize result:", result)

      if (result.success) {
        await loadRodeoData()
      } else {
        setError(result.error || "Error al inicializar Rodeos")
        setLoading(false)
      }
    } catch (err) {
      console.error("[v0] Error initializing rodeo:", err)
      setError("Error al inicializar Rodeos")
      setLoading(false)
    }
  }

  const handleGenerateFixtures = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await generateWeeklyFixtures(groupId)
      console.log("[v0] Generate fixtures result:", result)

      if (result.success) {
        await loadRodeoData()
      } else {
        setError(result.error || "Error al generar fixtures")
        setLoading(false)
      }
    } catch (err) {
      console.error("[v0] Error generating fixtures:", err)
      setError("Error al generar fixtures")
      setLoading(false)
    }
  }

  const handleRegenerateFixtures = async () => {
    if (!confirm("¿Estás seguro de que quieres regenerar los duelos de esta semana? Esto eliminará los existentes.")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await regenerateWeeklyFixtures(groupId)
      console.log("[v0] Regenerate fixtures result:", result)

      if (result.success) {
        await loadRodeoData()
      } else {
        setError(result.error || "Error al regenerar fixtures")
        setLoading(false)
      }
    } catch (err) {
      console.error("[v0] Error regenerating fixtures:", err)
      setError("Error al regenerar fixtures")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSplash />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-red-800 text-sm">{error}</p>
          <Button onClick={loadRodeoData} variant="outline" className="mt-4 bg-transparent">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!initialized) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <Trophy className="w-16 h-16 text-toro-accent mx-auto mb-4" />
          <h3 className="text-xl font-bold text-toro-foreground mb-2">Rodeos no iniciado</h3>
          <p className="text-toro-foreground/70 mb-6">
            Inicia el sistema de Rodeos para comenzar con los duelos semanales y el sistema de recompensas.
          </p>
          {isAdmin && (
            <Button onClick={handleInitialize} className="bg-toro-primary hover:bg-toro-primary/90">
              Iniciar Rodeos
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const topPlayer = standings[0]
  const userStanding = standings.find((s) => s.player_username === username)

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-toro-primary to-toro-primary/80 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tus Proteínas</p>
                <p className="text-3xl font-bold">{userStanding?.proteins || 0}</p>
              </div>
              <Award className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-toro-accent to-toro-accent/80 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tu Racha</p>
                <p className="text-3xl font-bold">{userStanding?.current_streak || 0}</p>
              </div>
              <Flame className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standings">Posiciones</TabsTrigger>
          <TabsTrigger value="fixtures">Duelos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Standings Tab */}
        <TabsContent value="standings" className="space-y-4">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-toro-primary" />
                Tabla de Posiciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {standings.map((player, index) => (
                  <div
                    key={player.player_username}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.player_username === username ? "bg-toro-accent/10 border border-toro-accent" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : index === 1
                              ? "bg-gray-300 text-gray-700"
                              : index === 2
                                ? "bg-orange-400 text-orange-900"
                                : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <Link
                        href={`/profile/${encodeURIComponent(player.player_username)}`}
                        className="font-semibold text-toro-foreground hover:text-toro-primary"
                      >
                        {player.player_username}
                      </Link>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-toro-foreground/60">V-D-E</p>
                        <p className="font-bold text-sm">
                          {player.wins}-{player.losses}-{player.draws}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-toro-primary/10">
                          <Award className="w-3 h-3 mr-1" />
                          {player.proteins}
                        </Badge>
                        <Badge variant="outline" className="bg-toro-accent/10">
                          <Flame className="w-3 h-3 mr-1" />
                          {player.current_streak}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Special Badges */}
          {topPlayer && (
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="font-bold text-toro-foreground">Corte de Asado Semanal</p>
                    <p className="text-sm text-toro-foreground/70">
                      {topPlayer.player_username} lidera con {topPlayer.proteins} proteínas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fixtures Tab */}
        <TabsContent value="fixtures" className="space-y-4">
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Duelos de esta Semana</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  {currentFixtures.length === 0 ? (
                    <Button
                      size="sm"
                      onClick={handleGenerateFixtures}
                      className="bg-toro-secondary hover:bg-toro-secondary/90"
                    >
                      Generar Duelos
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleRegenerateFixtures}
                      variant="outline"
                      className="border-toro-accent text-toro-accent hover:bg-toro-accent/10 bg-transparent"
                    >
                      Regenerar Duelos
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {currentFixtures.length === 0 ? (
                <p className="text-center text-toro-foreground/60 py-8">No hay duelos programados para esta semana</p>
              ) : (
                <div className="space-y-3">
                  {currentFixtures.map((fixture) => (
                    <div key={fixture.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Link
                            href={`/profile/${encodeURIComponent(fixture.player_a_username)}`}
                            className="font-semibold text-toro-foreground hover:text-toro-primary"
                          >
                            {fixture.player_a_username}
                          </Link>
                          <p className="text-sm text-toro-foreground/60">{fixture.current_score_a || 0} puntos</p>
                        </div>
                        <div className="px-4">
                          <p className="text-2xl font-bold text-toro-foreground">VS</p>
                        </div>
                        <div className="flex-1 text-right">
                          {fixture.player_b_username ? (
                            <>
                              <Link
                                href={`/profile/${encodeURIComponent(fixture.player_b_username)}`}
                                className="font-semibold text-toro-foreground hover:text-toro-primary"
                              >
                                {fixture.player_b_username}
                              </Link>
                              <p className="text-sm text-toro-foreground/60">{fixture.current_score_b || 0} puntos</p>
                            </>
                          ) : (
                            <Badge variant="outline">FECHA LIBRE</Badge>
                          )}
                        </div>
                      </div>
                      {fixture.winner_username && (
                        <div className="mt-3 pt-3 border-t">
                          <Badge className="bg-toro-accent text-white">
                            <Trophy className="w-3 h-3 mr-1" />
                            Ganador: {fixture.winner_username}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isAdmin && currentFixtures.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900">
                  <strong>Sistema de Fixture:</strong> Los cruces no se repiten hasta que todos los enfrentamientos
                  posibles se hayan jugado. Las fechas libres se distribuyen equitativamente - nadie puede tener dos
                  fechas libres hasta que todos hayan tenido una.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Historial de Semanas</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-toro-foreground/60 py-8">No hay historial disponible</p>
              ) : (
                <div className="space-y-4">
                  {history.map((week: any) => (
                    <div key={week.weekNumber} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-toro-foreground">Semana {week.weekNumber}</h4>
                        <Badge variant="outline">
                          {new Date(week.weekStart).toLocaleDateString()} -{" "}
                          {new Date(week.weekEnd).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {week.fixtures.map((fixture: any) => (
                          <div
                            key={fixture.id}
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <span>
                              {fixture.player_a_username} ({fixture.score_a})
                            </span>
                            <span className="font-bold">VS</span>
                            <span>
                              {fixture.player_b_username ? `${fixture.player_b_username} (${fixture.score_b})` : "BYE"}
                            </span>
                            {fixture.winner_username && (
                              <Badge variant="outline" className="ml-2">
                                {fixture.winner_username}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

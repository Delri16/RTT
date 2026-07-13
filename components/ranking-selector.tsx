"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trophy, Calendar, TrendingUp, Users } from 'lucide-react'
import Link from "next/link"
import {
  getGroupRankingByWeek,
  getGroupRankingTotal,
  getGroupMembersWithTotalPoints,
  getWeeksWithData,
} from "@/lib/actions"

interface RankingSelectorProps {
  groupId: string
  currentUsername: string
}

export default function RankingSelector({ groupId, currentUsername }: RankingSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("current")
  const [weeklyRanking, setWeeklyRanking] = useState<any[]>([])
  const [totalRanking, setTotalRanking] = useState<any[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [firstWeek, setFirstWeek] = useState<number>(29) // Default to week 29
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAvailableWeeks()
  }, [groupId])

  useEffect(() => {
    loadRankings()
  }, [selectedPeriod, groupId])

  const loadAvailableWeeks = async () => {
    const weeks = await getWeeksWithData(groupId)
    setAvailableWeeks(weeks)
    if (weeks.length > 0) {
      setFirstWeek(Math.min(...weeks))
    }
  }

  const loadRankings = async () => {
    setLoading(true)

    let weeklyResult = []
    if (selectedPeriod === "total") {
      weeklyResult = await getGroupRankingTotal(groupId)
    } else {
      const weekNumber = selectedPeriod === "current" ? 0 : Number.parseInt(selectedPeriod)
      weeklyResult = await getGroupRankingByWeek(groupId, weekNumber)
    }

    const totalResult = await getGroupMembersWithTotalPoints(groupId)

    setWeeklyRanking(weeklyResult)
    setTotalRanking(totalResult)
    setLoading(false)
  }

  const getPeriodOptions = () => {
    const options = [{ value: "current", label: "Semana Actual" }]

    availableWeeks.forEach((weekNum) => {
      const relativeWeek = toRelativeWeek(weekNum)
      options.push({ value: weekNum.toString(), label: `Semana ${relativeWeek}` })
    })

    options.push({ value: "total", label: "Total Acumulado" })

    return options
  }

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return "🥇"
      case 2:
        return "🥈"
      case 3:
        return "🥉"
      default:
        return `#${position}`
    }
  }

  const getRankingColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-600 bg-yellow-50"
      case 2:
        return "text-gray-600 bg-gray-50"
      case 3:
        return "text-orange-600 bg-orange-50"
      default:
        return "text-gray-700 bg-gray-50"
    }
  }

  const getMondayOfWeek = (date: Date): Date => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 1, 0, 0)
    return monday
  }

  const getSundayOfWeek = (date: Date): Date => {
    const monday = getMondayOfWeek(new Date(date))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return sunday
  }

  const getWeekDateRange = (weekNumber: number): string => {
    let startDate: Date
    let endDate: Date

    if (weekNumber === 0) {
      const now = new Date()
      startDate = getMondayOfWeek(new Date(now))
      endDate = getSundayOfWeek(new Date(now))
    } else {
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const firstMonday = getMondayOfWeek(new Date(startOfYear))

      startDate = new Date(firstMonday)
      startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
      startDate.setHours(0, 1, 0, 0)

      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    }

    return `${startDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    })} - ${endDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    })}`
  }

  const toRelativeWeek = (isoWeek: number): number => {
    return isoWeek - firstWeek + 1
  }

  const toISOWeek = (relativeWeek: number): number => {
    return relativeWeek + firstWeek - 1
  }

  const renderRankingList = (ranking: any[], title: string, showPeriodInfo = false) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-toro-secondary" />
        <h3 className="font-bold text-lg text-toro-foreground">{title}</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <TrendingUp className="animate-spin w-6 h-6 text-toro-primary" />
        </div>
      ) : ranking.length > 0 ? (
        <div className="space-y-3">
          {ranking.map((user, index) => {
            const position = index + 1
            const isCurrentUser = user.username === currentUsername
            const showAverage = title === "Puntuación Total Acumulada" && user.avgPerWeek !== undefined && user.avgPerWeek > 0

            return (
              <div
                key={user.username}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  isCurrentUser ? "bg-toro-primary/10 border-2 border-toro-primary" : getRankingColor(position)
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm">
                    <span className="text-lg font-bold">{getRankingIcon(position)}</span>
                  </div>
                  <div>
                    <Link
                      href={`/profile/${encodeURIComponent(user.username)}`}
                      className={`font-medium hover:text-toro-primary transition-colors ${isCurrentUser ? "text-toro-primary" : "text-gray-900"}`}
                    >
                      {user.username}
                    </Link>
                    {isCurrentUser && <Badge className="ml-2 bg-toro-primary text-white text-xs">Tú</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${isCurrentUser ? "text-toro-primary" : "text-toro-accent"}`}>
                    {user.points}
                  </span>
                  <p className="text-xs text-gray-500">puntos</p>
                  {showAverage && (
                    <p className="text-xs text-gray-400 mt-0.5">{user.avgPerWeek} pts/sem</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">Sin actividades</h3>
          <p className="text-gray-500">
            {selectedPeriod === "current"
              ? "No hay actividades registradas esta semana"
              : selectedPeriod === "total"
                ? "No hay actividades registradas aún"
                : `No hay actividades registradas en la semana ${toRelativeWeek(Number.parseInt(selectedPeriod))}`}
          </p>
        </div>
      )}

      {showPeriodInfo && selectedPeriod !== "current" && selectedPeriod !== "total" && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              Semana {toRelativeWeek(Number.parseInt(selectedPeriod))} - {getWeekDateRange(Number.parseInt(selectedPeriod))} (Lun-Dom)
            </span>
          </div>
        </div>
      )}

      {showPeriodInfo && selectedPeriod === "current" && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Semana Actual - {getWeekDateRange(0)} (Lun-Dom)</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-toro-secondary" />
              Ranking por Período
            </CardTitle>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getPeriodOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {renderRankingList(
            weeklyRanking,
            selectedPeriod === "current"
              ? "Esta Semana"
              : selectedPeriod === "total"
                ? "Total Acumulado"
                : `Semana ${toRelativeWeek(Number.parseInt(selectedPeriod))}`,
            true,
          )}
        </CardContent>
      </Card>

      {selectedPeriod !== "total" && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-toro-accent" />
              Ranking Total - Todos los Miembros
            </CardTitle>
          </CardHeader>
          <CardContent>{renderRankingList(totalRanking, "Puntuación Total Acumulada")}</CardContent>
        </Card>
      )}
    </div>
  )
}

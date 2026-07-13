"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart2, Camera, Clock, AlertCircle, CheckCircle, Plus } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserReportStatus, getUserReports } from "@/lib/actions"

export default function ReportsPage() {
  const { username } = useApp()
  const [reportStatus, setReportStatus] = useState<any[]>([])
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (username) {
      loadReportData()
    }
  }, [username])

  const loadReportData = async () => {
    if (!username) return

    const [statusData, reportsData] = await Promise.all([getUserReportStatus(username), getUserReports(username)])

    setReportStatus(statusData)
    if (reportsData.success) {
      setRecentReports(reportsData.reports.slice(0, 5))
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <BarChart2 className="animate-spin w-8 h-8 text-toro-primary" />
      </div>
    )
  }

  const pendingReports = reportStatus.filter((status) => status.needs_report)

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl text-toro-foreground font-display">Seguimiento</h1>
        <p className="text-toro-foreground/70">Tu progreso y reportes quincenales</p>
      </header>

      {/* Pending Reports Alert */}
      {pendingReports.length > 0 && (
        <Card className="bg-orange-50 border-orange-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Reportes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-600 mb-3">Tienes {pendingReports.length} reporte(s) pendiente(s):</p>
            <div className="space-y-2">
              {pendingReports.map((status) => (
                <div key={status.group_id} className="flex items-center justify-between">
                  <span className="font-medium">{status.group_name}</span>
                  <Link href={`/reports/create?group=${status.group_id}`}>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-1" />
                      Reportar
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Status by Group */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-toro-secondary" />
            Estado por Grupo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportStatus.length > 0 ? (
            <div className="space-y-3">
              {reportStatus.map((status) => (
                <div key={status.group_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium block">{status.group_name}</span>
                    <span className="text-sm text-gray-600">
                      {status.last_report_date
                        ? `Último reporte: ${new Date(status.last_report_date).toLocaleDateString()}`
                        : "Sin reportes aún"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.needs_report ? (
                      <>
                        <Badge className="bg-orange-100 text-orange-700">Pendiente</Badge>
                        <Link href={`/reports/create?group=${status.group_id}`}>
                          <Button size="sm" className="bg-toro-primary hover:bg-toro-primary/90 text-white">
                            Reportar
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Al día
                        </Badge>
                        <span className="text-sm text-gray-500">Próximo en {status.days_until_next} días</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No perteneces a ningún grupo aún</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-toro-accent" />
            Reportes Recientes
          </CardTitle>
          <Link href="/reports/history">
            <Button variant="outline" size="sm">
              Ver Todo
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-toro-primary/20 rounded-full flex items-center justify-center">
                      <Camera className="w-6 h-6 text-toro-primary" />
                    </div>
                    <div>
                      <span className="font-medium block">{report.groups?.name}</span>
                      <span className="text-sm text-gray-600">{new Date(report.report_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-toro-foreground block">{report.reported_weight} kg</span>
                    <div className="flex gap-1 mt-1">
                      {report.scale_photo_url && (
                        <Badge variant="outline" className="text-xs">
                          Balanza
                        </Badge>
                      )}
                      {report.body_photo_url && (
                        <Badge variant="outline" className="text-xs">
                          Progreso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No hay reportes aún</h3>
              <p className="text-gray-500 mb-4">Comienza tu seguimiento creando tu primer reporte</p>
              {pendingReports.length > 0 && (
                <Link href={`/reports/create?group=${pendingReports[0].group_id}`}>
                  <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear Primer Reporte
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

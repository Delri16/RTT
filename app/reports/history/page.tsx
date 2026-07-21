"use client"

import { useEffect, useState } from "react"
import LoadingSplash from "@/components/ui/loading-splash"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Camera, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { useApp } from "@/app/app-provider"
import { getUserReports } from "@/lib/actions"

export default function ReportHistoryPage() {
  const { username } = useApp()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  useEffect(() => {
    if (username) {
      loadReports()
    }
  }, [username])

  const loadReports = async () => {
    if (!username) return

    const result = await getUserReports(username)
    if (result.success) {
      setReports(result.reports)
    }
    setLoading(false)
  }

  const openPhotoDialog = (photoUrl: string) => {
    setSelectedPhoto(photoUrl)
    setPhotoDialogOpen(true)
  }

  const getWeightTrend = (currentWeight: number, previousWeight?: number) => {
    if (!previousWeight) return null

    const diff = currentWeight - previousWeight
    if (Math.abs(diff) < 0.1) return { icon: Minus, color: "text-gray-500", text: "Sin cambios" }
    if (diff > 0) return { icon: TrendingUp, color: "text-red-500", text: `+${diff.toFixed(1)} kg` }
    return { icon: TrendingDown, color: "text-green-500", text: `${diff.toFixed(1)} kg` }
  }

  if (loading) {
    return (
      <div className="p-4 bg-toro-background min-h-full flex items-center justify-center">
        <LoadingSplash />
      </div>
    )
  }

  return (
    <div className="p-4 bg-toro-background min-h-full">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-3xl text-toro-foreground font-display">Historial</h1>
      </header>

      {reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report, index) => {
            const previousReport = reports[index + 1]
            const trend = getWeightTrend(report.reported_weight, previousReport?.reported_weight)

            return (
              <Card key={report.id} className="bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.groups?.name}</CardTitle>
                      <p className="text-sm text-gray-600">{new Date(report.report_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-toro-foreground">{report.reported_weight} kg</span>
                        {trend && (
                          <div className={`flex items-center gap-1 ${trend.color}`}>
                            <trend.icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{trend.text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {report.scale_photo_url && (
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-2">Foto de Balanza</p>
                        <div
                          className="relative h-24 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openPhotoDialog(report.scale_photo_url)}
                        >
                          <Image
                            src={report.scale_photo_url || "/placeholder.svg"}
                            alt="Foto de balanza"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                      </div>
                    )}
                    {report.body_photo_url && (
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-2">Foto de Progreso</p>
                        <div
                          className="relative h-24 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openPhotoDialog(report.body_photo_url)}
                        >
                          <Image
                            src={report.body_photo_url || "/placeholder.svg"}
                            alt="Foto de progreso"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                      </div>
                    )}
                    {!report.scale_photo_url && !report.body_photo_url && (
                      <div className="flex-1 text-center py-4">
                        <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Sin fotos</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No hay reportes aún</h3>
            <p className="text-gray-500 mb-4">Comienza tu seguimiento creando tu primer reporte</p>
            <Link href="/reports/create">
              <Button className="bg-toro-primary hover:bg-toro-primary/90 text-white">Crear Reporte</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foto del Reporte</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative w-full h-96">
              <Image
                src={selectedPhoto || "/placeholder.svg"}
                alt="Foto del reporte"
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 768px) 90vw, 50vw"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

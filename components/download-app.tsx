"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Smartphone, Download, Share, X, ChevronDown, ChevronUp } from "lucide-react"

export default function DownloadApp() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Collapsed by default

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    setIsAndroid(/android/.test(userAgent))

    // Check if already installed
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      }
    }
  }

  const handleDownloadAPK = () => {
    // In a real app, this would download the actual APK file
    // For now, we'll show instructions
    alert(
      "En una app real, esto descargaría el archivo APK. Por ahora, usa 'Agregar a pantalla de inicio' en tu navegador.",
    )
  }

  if (isInstalled) {
    return null // Don't show if already installed
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-toro-primary/10 to-toro-secondary/10 border-toro-primary/20">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <CardTitle className="flex items-center justify-between text-toro-foreground">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-toro-primary" />
              Instalar App
            </div>
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-toro-primary" />
            ) : (
              <ChevronUp className="w-4 h-4 text-toro-primary" />
            )}
          </CardTitle>
        </CardHeader>

        {!isCollapsed && (
          <CardContent>
            <p className="text-sm text-toro-foreground/80 mb-4">
              Instala Road To Toro en tu dispositivo para una mejor experiencia
            </p>
            <div className="flex gap-2">
              {isIOS && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallPrompt(true)}
                  className="flex-1 border-toro-primary text-toro-primary hover:bg-toro-primary hover:text-white"
                >
                  <Share className="w-4 h-4 mr-1" />
                  iOS
                </Button>
              )}
              {isAndroid && deferredPrompt && (
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="flex-1 bg-toro-primary hover:bg-toro-primary/90 text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Instalar
                </Button>
              )}
              {isAndroid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAPK}
                  className="flex-1 border-toro-secondary text-toro-secondary hover:bg-toro-secondary hover:text-white bg-transparent"
                >
                  <Download className="w-4 h-4 mr-1" />
                  APK
                </Button>
              )}
              {!isIOS && !isAndroid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallPrompt(true)}
                  className="flex-1 border-toro-primary text-toro-primary hover:bg-toro-primary hover:text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Instalar
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Instalar Road To Toro
              <Button variant="ghost" size="icon" onClick={() => setShowInstallPrompt(false)}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-toro-background rounded-2xl flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-toro-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">¡Instala la app!</h3>
              <p className="text-sm text-gray-600 mb-4">Accede más rápido y recibe notificaciones de tu progreso</p>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Share className="w-5 h-5 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-medium">1. Toca el botón compartir</p>
                    <p className="text-gray-600">En la barra inferior de Safari</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Download className="w-5 h-5 text-green-600" />
                  <div className="text-sm">
                    <p className="font-medium">2. "Agregar a pantalla de inicio"</p>
                    <p className="text-gray-600">Busca esta opción en el menú</p>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3">
                {deferredPrompt ? (
                  <Button onClick={handleInstallClick} className="w-full bg-toro-primary hover:bg-toro-primary/90">
                    <Download className="w-4 h-4 mr-2" />
                    Instalar Ahora
                  </Button>
                ) : (
                  <div className="text-center text-sm text-gray-600">
                    <p>Ve al menú de tu navegador y selecciona</p>
                    <p className="font-medium">"Agregar a pantalla de inicio"</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={handleDownloadAPK}
                  className="w-full border-toro-secondary text-toro-secondary hover:bg-toro-secondary hover:text-white bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar APK
                </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-600">
                <p>Ve al menú de tu navegador y selecciona</p>
                <p className="font-medium">"Instalar aplicación" o "Agregar a pantalla de inicio"</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

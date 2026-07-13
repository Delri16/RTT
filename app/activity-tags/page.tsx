"use client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ActivityTagsPanel from "@/components/activity-tags-panel"

export default function ActivityTagsPage() {
  return (
    <div className="p-4 bg-toro-background min-h-screen">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl text-toro-foreground font-display">Actividades Compartidas</h1>
          <p className="text-toro-foreground/70">Responde a las solicitudes de tus compañeros</p>
        </div>
      </header>

      <ActivityTagsPanel />
    </div>
  )
}

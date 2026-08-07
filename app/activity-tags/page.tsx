"use client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ActivityTagsPanel from "@/components/activity-tags-panel"

export default function ActivityTagsPage() {
  return (
    <div className="p-4 bg-toro-background min-h-screen">
      <header className="flex items-center gap-2 mb-6">
        <Link href="/" className="shrink-0">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl text-toro-foreground font-display leading-tight">Actividades Compartidas</h1>
          <p className="text-sm text-toro-foreground/70">Respondé a las etiquetas de tus compañeros</p>
        </div>
      </header>

      <ActivityTagsPanel />
    </div>
  )
}

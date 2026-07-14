"use client"

import { useApp } from "@/app/app-provider"
import RoutineHeader from "@/components/routine/routine-header"
import ExerciseCatalog from "@/components/routine/exercise-catalog"

export const dynamic = "force-dynamic"

export default function ExercisesPage() {
  const { username } = useApp()
  if (!username) return null
  return (
    <div className="bg-toro-background min-h-full pb-20">
      <RoutineHeader title="Ejercicios" subtitle="Catálogo completo" back="/mi-rutina" />
      <ExerciseCatalog username={username} mode="browse" />
    </div>
  )
}
